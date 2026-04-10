#!/bin/bash
# Validate Batch Components File
# Usage: ./validate-batch.sh components.txt
#
# Checks:
# 1. File format (CSV with 2 columns)
# 2. Valid Figma URLs
# 3. No duplicate component names
# 4. Component names follow conventions
# 5. Optional: Check if Figma links are accessible

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BATCH_FILE=$1

if [ -z "$BATCH_FILE" ]; then
  echo -e "${RED}Usage: $0 components.txt${NC}"
  echo ""
  echo "Validates batch file format and contents"
  exit 1
fi

if [ ! -f "$BATCH_FILE" ]; then
  echo -e "${RED}Error: File not found: $BATCH_FILE${NC}"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🔍 Validating Batch File: $BATCH_FILE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0
WARNINGS=0
LINE_NUM=0
COMPONENTS_SEEN=()

# ============================================
# Check 1: File Format
# ============================================
echo -e "${BLUE}[ ] Check 1: File Format${NC}"

TOTAL_LINES=$(wc -l < "$BATCH_FILE")
NON_COMMENT_LINES=$(grep -v "^#" "$BATCH_FILE" | grep -v "^$" | wc -l | tr -d ' ')

echo "  Total lines: $TOTAL_LINES"
echo "  Component entries: $NON_COMMENT_LINES"

if [ "$NON_COMMENT_LINES" -eq 0 ]; then
  echo -e "${RED}  ❌ No component entries found${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}  ✓ File has $NON_COMMENT_LINES component(s)${NC}"
fi

echo ""

# ============================================
# Check 2-6: Line-by-line Validation
# ============================================
echo -e "${BLUE}[ ] Check 2-6: Component Entries${NC}"
echo ""

while IFS= read -r line; do
  ((LINE_NUM++))
  
  # Skip comments and empty lines
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  
  # Count commas
  COMMA_COUNT=$(echo "$line" | tr -cd ',' | wc -c)
  
  # Check 2: Exactly one comma (two fields)
  if [ "$COMMA_COUNT" -ne 1 ]; then
    echo -e "${RED}  ❌ Line $LINE_NUM: Invalid format (expected: ComponentName,FigmaLink)${NC}"
    echo "     Got: $line"
    ((ERRORS++))
    continue
  fi
  
  # Extract fields
  COMPONENT=$(echo "$line" | cut -d',' -f1 | xargs)
  FIGMA_LINK=$(echo "$line" | cut -d',' -f2 | xargs)
  
  # Check 3: Component name not empty
  if [ -z "$COMPONENT" ]; then
    echo -e "${RED}  ❌ Line $LINE_NUM: Empty component name${NC}"
    ((ERRORS++))
    continue
  fi
  
  # Check 4: Component name follows conventions
  # - Starts with capital letter
  # - PascalCase (no spaces, underscores, hyphens)
  # - Only letters and numbers
  if ! [[ "$COMPONENT" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
    echo -e "${RED}  ❌ Line $LINE_NUM: Invalid component name: '$COMPONENT'${NC}"
    echo "     Must be PascalCase (e.g., Button, TextInput, CardHeader)"
    ((ERRORS++))
  fi
  
  # Check 5: No duplicate component names
  if [[ " ${COMPONENTS_SEEN[@]} " =~ " ${COMPONENT} " ]]; then
    echo -e "${RED}  ❌ Line $LINE_NUM: Duplicate component name: '$COMPONENT'${NC}"
    ((ERRORS++))
  else
    COMPONENTS_SEEN+=("$COMPONENT")
  fi
  
  # Check 6: Figma link not empty
  if [ -z "$FIGMA_LINK" ]; then
    echo -e "${RED}  ❌ Line $LINE_NUM: Empty Figma link for '$COMPONENT'${NC}"
    ((ERRORS++))
    continue
  fi
  
  # Check 7: Figma link format
  if ! [[ "$FIGMA_LINK" =~ ^https://([a-z]+\.)?figma\.com/(file|design)/ ]]; then
    echo -e "${RED}  ❌ Line $LINE_NUM: Invalid Figma URL for '$COMPONENT'${NC}"
    echo "     Expected: https://figma.com/file/... or https://figma.com/design/..."
    echo "     Got: $FIGMA_LINK"
    ((ERRORS++))
    continue
  fi
  
  # Check 8: Figma link has node-id parameter
  if ! [[ "$FIGMA_LINK" =~ node-id= ]]; then
    echo -e "${YELLOW}  ⚠️  Line $LINE_NUM: Figma URL missing node-id parameter for '$COMPONENT'${NC}"
    echo "     Link: $FIGMA_LINK"
    echo "     This may cause issues - consider adding ?node-id=X:Y"
    ((WARNINGS++))
  fi
  
  # Check 9: Reserved component names
  RESERVED_NAMES=("index" "Index" "Component" "Element" "Node" "Test")
  for reserved in "${RESERVED_NAMES[@]}"; do
    if [ "$COMPONENT" = "$reserved" ]; then
      echo -e "${YELLOW}  ⚠️  Line $LINE_NUM: '$COMPONENT' is a reserved/generic name${NC}"
      echo "     Consider using a more specific name"
      ((WARNINGS++))
      break
    fi
  done
  
  # All checks passed for this line
  echo -e "${GREEN}  ✓ Line $LINE_NUM: $COMPONENT${NC}"
  
done < "$BATCH_FILE"

echo ""

# ============================================
# Check 10: Figma API Accessibility (Optional)
# ============================================
if [ -n "$FIGMA_ACCESS_TOKEN" ]; then
  echo -e "${BLUE}[ ] Check 10: Figma API Accessibility${NC}"
  echo ""
  
  # Extract unique file IDs
  FILE_IDS=$(grep -v "^#" "$BATCH_FILE" | grep -v "^$" | \
    cut -d',' -f2 | \
    grep -oP 'figma\.com/(file|design)/\K[^/]+' | \
    sort -u)
  
  for file_id in $FILE_IDS; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      "https://api.figma.com/v1/files/$file_id" \
      -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" 2>/dev/null)
    
    if [ "$RESPONSE" = "200" ]; then
      echo -e "${GREEN}  ✓ Figma file accessible: $file_id${NC}"
    elif [ "$RESPONSE" = "403" ]; then
      echo -e "${RED}  ❌ Access denied for file: $file_id${NC}"
      echo "     Check FIGMA_ACCESS_TOKEN permissions"
      ((ERRORS++))
    elif [ "$RESPONSE" = "404" ]; then
      echo -e "${RED}  ❌ Figma file not found: $file_id${NC}"
      ((ERRORS++))
    else
      echo -e "${YELLOW}  ⚠️  Could not verify file: $file_id (HTTP $RESPONSE)${NC}"
      ((WARNINGS++))
    fi
  done
  
  echo ""
else
  echo -e "${BLUE}[ ] Check 10: Figma API Accessibility${NC}"
  echo -e "${YELLOW}  ⏭️  Skipped (set FIGMA_ACCESS_TOKEN to enable)${NC}"
  echo ""
fi

# ============================================
# Check 11: Component Name Conflicts
# ============================================
echo -e "${BLUE}[ ] Check 11: Existing Component Conflicts${NC}"

PROJECT_ROOT=~/Documents/figma-ai-project

if [ -d "$PROJECT_ROOT/02-generated" ]; then
  EXISTING_COMPONENTS=$(ls -1 "$PROJECT_ROOT/02-generated" 2>/dev/null || true)
  
  for component in "${COMPONENTS_SEEN[@]}"; do
    if echo "$EXISTING_COMPONENTS" | grep -q "^$component$"; then
      echo -e "${YELLOW}  ⚠️  '$component' already exists in 02-generated/${NC}"
      echo "     Will overwrite existing component"
      ((WARNINGS++))
    fi
  done
  
  if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}  ✓ No conflicts with existing components${NC}"
  fi
else
  echo -e "${BLUE}  ℹ️  02-generated/ directory not found (will be created)${NC}"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 Validation Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "File: $BATCH_FILE"
echo "Components: ${#COMPONENTS_SEEN[@]}"
echo ""

if [ ${#COMPONENTS_SEEN[@]} -gt 0 ]; then
  echo "Component list:"
  for i in "${!COMPONENTS_SEEN[@]}"; do
    echo "  $((i+1)). ${COMPONENTS_SEEN[$i]}"
  done
  echo ""
fi

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Errors: $ERRORS${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi

echo ""

# ============================================
# Exit Status
# ============================================
if [ $ERRORS -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Fix the errors above and run validation again:"
  echo "  $0 $BATCH_FILE"
  echo ""
  exit 1
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) detected - review recommended${NC}"
    echo ""
  fi
  
  echo "Ready to generate:"
  echo "  ./scripts/batch-generate.sh $BATCH_FILE"
  echo ""
  exit 0
fi
