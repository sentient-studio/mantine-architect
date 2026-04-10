#!/bin/bash
# Dependency Audit Script for Mantine Components
# Usage: ./dependency-audit.sh ComponentName
#
# Checks:
# 1. All dependencies are in package.json
# 2. No vulnerabilities (npm audit)
# 3. Package quality metrics (downloads, age, publisher)
# 4. License compatibility

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COMPONENT=$1
PROJECT_ROOT=~/Documents/figma-ai-project
COMPONENT_DIR=$PROJECT_ROOT/02-generated/$COMPONENT

if [ -z "$COMPONENT" ]; then
  echo -e "${RED}Usage: $0 ComponentName${NC}"
  echo "Example: $0 Button"
  exit 1
fi

if [ ! -d "$COMPONENT_DIR" ]; then
  echo -e "${RED}Error: Component directory not found${NC}"
  echo "Looking for: $COMPONENT_DIR"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}🔍 Dependency Audit for $COMPONENT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WARNINGS=0
ISSUES=0

# ============================================
# Step 1: Extract Dependencies from Component
# ============================================
echo -e "${BLUE}Step 1: Analyzing component imports...${NC}"
echo ""

# Extract all import statements
IMPORTS=$(grep -h "^import.*from" "$COMPONENT_DIR"/*.tsx "$COMPONENT_DIR"/*.ts 2>/dev/null | \
          grep -v "from '\." | \
          grep -v 'from "./' | \
          sed "s/.*from ['\"]//g" | \
          sed "s/['\"].*//g" | \
          sort -u)

# Separate Mantine and third-party
MANTINE_IMPORTS=$(echo "$IMPORTS" | grep "@mantine" || true)
THIRD_PARTY_IMPORTS=$(echo "$IMPORTS" | grep -v "@mantine" | grep -v "^react$" || true)

echo "Mantine packages:"
if [ -n "$MANTINE_IMPORTS" ]; then
  echo "$MANTINE_IMPORTS" | sed 's/^/  ✅ /'
else
  echo "  (none)"
fi

echo ""
echo "Third-party packages:"
if [ -n "$THIRD_PARTY_IMPORTS" ]; then
  echo "$THIRD_PARTY_IMPORTS" | sed 's/^/  📦 /'
else
  echo "  (none)"
fi

echo ""

# ============================================
# Step 2: Check if Dependencies are Installed
# ============================================
echo -e "${BLUE}Step 2: Checking installed packages...${NC}"
echo ""

cd "$PROJECT_ROOT"

MISSING_PACKAGES=()

# Function to check if package is installed
check_package() {
  local package=$1
  
  # Check in package.json dependencies or devDependencies
  if grep -q "\"$package\"" package.json 2>/dev/null; then
    echo -e "  ${GREEN}✅${NC} $package (installed)"
    return 0
  else
    echo -e "  ${RED}❌${NC} $package (missing)"
    MISSING_PACKAGES+=("$package")
    return 1
  fi
}

# Check Mantine packages
if [ -n "$MANTINE_IMPORTS" ]; then
  while IFS= read -r package; do
    check_package "$package"
  done <<< "$MANTINE_IMPORTS"
fi

# Check third-party packages
if [ -n "$THIRD_PARTY_IMPORTS" ]; then
  while IFS= read -r package; do
    # Skip built-ins
    if [[ "$package" != "react" && "$package" != "react-dom" ]]; then
      check_package "$package"
    fi
  done <<< "$THIRD_PARTY_IMPORTS"
fi

echo ""

# ============================================
# Step 3: Analyze Missing Packages
# ============================================
if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found ${#MISSING_PACKAGES[@]} missing package(s)${NC}"
  echo ""
  echo -e "${BLUE}Step 3: Analyzing missing packages...${NC}"
  echo ""
  
  for package in "${MISSING_PACKAGES[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}Package: $package${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Fetch npm registry data
    REGISTRY_DATA=$(curl -s "https://registry.npmjs.org/$package/latest" 2>/dev/null || echo "{}")
    
    if [ "$REGISTRY_DATA" = "{}" ] || echo "$REGISTRY_DATA" | grep -q "error"; then
      echo -e "${RED}❌ Package not found in npm registry${NC}"
      echo ""
      ((ISSUES++))
      continue
    fi
    
    # Extract metadata
    VERSION=$(echo "$REGISTRY_DATA" | jq -r '.version // "unknown"')
    LICENSE=$(echo "$REGISTRY_DATA" | jq -r '.license // "unknown"')
    DESCRIPTION=$(echo "$REGISTRY_DATA" | jq -r '.description // "No description"')
    HOMEPAGE=$(echo "$REGISTRY_DATA" | jq -r '.homepage // "N/A"')
    
    # Fetch download stats
    DOWNLOADS_DATA=$(curl -s "https://api.npmjs.org/downloads/point/last-week/$package" 2>/dev/null || echo "{}")
    WEEKLY_DOWNLOADS=$(echo "$DOWNLOADS_DATA" | jq -r '.downloads // 0')
    
    # Determine risk level
    if [ "$WEEKLY_DOWNLOADS" -gt 100000 ]; then
      RISK="${GREEN}✅ Established${NC}"
    elif [ "$WEEKLY_DOWNLOADS" -gt 10000 ]; then
      RISK="${YELLOW}⚠️  Moderate traffic${NC}"
      ((WARNINGS++))
    else
      RISK="${RED}🚨 Low traffic${NC}"
      ((ISSUES++))
    fi
    
    echo "Version: $VERSION"
    echo "License: $LICENSE"
    echo "Description: $DESCRIPTION"
    echo "Weekly downloads: $(printf "%'d" $WEEKLY_DOWNLOADS)"
    echo -e "Risk assessment: $RISK"
    echo "Homepage: $HOMEPAGE"
    echo ""
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo -e "${YELLOW}⚠️  ACTION REQUIRED${NC}"
  echo ""
  echo "Missing packages need to be reviewed and approved before installation:"
  echo ""
  for package in "${MISSING_PACKAGES[@]}"; do
    echo "  npm install $package --save"
  done
  echo ""
  echo "After approval, run:"
  echo "  npm install ${MISSING_PACKAGES[@]} --ignore-scripts"
  echo "  npm audit"
  echo ""
  
else
  echo -e "${GREEN}✅ All dependencies are installed${NC}"
  echo ""
fi

# ============================================
# Step 4: Run npm audit
# ============================================
echo -e "${BLUE}Step 4: Running security audit...${NC}"
echo ""

# Run npm audit and capture output
AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)
VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities | to_entries[] | "\(.key): \(.value)"' 2>/dev/null || echo "")

if [ -z "$VULNERABILITIES" ] || echo "$VULNERABILITIES" | grep -q "^0$"; then
  echo -e "${GREEN}✅ No vulnerabilities found${NC}"
else
  echo -e "${RED}❌ Vulnerabilities detected:${NC}"
  echo ""
  echo "$VULNERABILITIES" | while IFS=: read -r severity count; do
    if [ "$count" != "0" ]; then
      case $severity in
        critical)
          echo -e "  ${RED}🚨 Critical: $count${NC}"
          ((ISSUES+=count))
          ;;
        high)
          echo -e "  ${RED}❌ High: $count${NC}"
          ((ISSUES+=count))
          ;;
        moderate)
          echo -e "  ${YELLOW}⚠️  Moderate: $count${NC}"
          ((WARNINGS+=count))
          ;;
        low)
          echo -e "  ${BLUE}ℹ️  Low: $count${NC}"
          ;;
      esac
    fi
  done
  echo ""
  echo "Run for details:"
  echo "  npm audit"
  echo ""
  echo "To fix:"
  echo "  npm audit fix"
  echo ""
fi

# ============================================
# Step 5: Check for Dependency Duplicates
# ============================================
echo -e "${BLUE}Step 5: Checking for duplicate dependencies...${NC}"
echo ""

# Find packages installed at multiple versions
DUPLICATES=$(npm ls --all --json 2>/dev/null | \
  jq -r '.. | .dependencies? // empty | to_entries[] | select(.value.version) | .key' | \
  sort | uniq -d)

if [ -n "$DUPLICATES" ]; then
  echo -e "${YELLOW}⚠️  Duplicate dependencies found:${NC}"
  echo ""
  while IFS= read -r package; do
    echo "  📦 $package"
    npm ls "$package" 2>/dev/null | grep "$package@" | sed 's/^/    /'
    ((WARNINGS++))
  done <<< "$DUPLICATES"
  echo ""
  echo "Consider deduplicating:"
  echo "  npm dedupe"
  echo ""
else
  echo -e "${GREEN}✅ No duplicate dependencies${NC}"
fi

echo ""

# ============================================
# Step 6: License Compatibility Check
# ============================================
echo -e "${BLUE}Step 6: Checking license compatibility...${NC}"
echo ""

# Get all dependencies and their licenses (python3 used instead of jq — no extra install needed)
LICENSE_CHECK=$(npm ls --json 2>/dev/null | \
  python3 -c "
import json, sys
def walk(deps):
    if not deps: return
    for name, info in deps.items():
        if 'version' in info:
            print(f\"{name}: {info.get('license', 'unknown')}\")
        walk(info.get('dependencies', {}))
data = json.load(sys.stdin)
walk(data.get('dependencies', {}))
  ")

# Flag problematic licenses (GPL, AGPL - copyleft)
COPYLEFT=$(echo "$LICENSE_CHECK" | grep -E "(GPL|AGPL)" || true)

if [ -n "$COPYLEFT" ]; then
  echo -e "${YELLOW}⚠️  Copyleft licenses detected:${NC}"
  echo ""
  echo "$COPYLEFT" | sed 's/^/  /'
  echo ""
  echo "Review these licenses for compatibility with your project"
  ((WARNINGS++))
else
  echo -e "${GREEN}✅ No copyleft license issues detected${NC}"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 Dependency Audit Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Component: $COMPONENT"
echo "Total imports: $(echo "$IMPORTS" | wc -l | tr -d ' ')"
echo "Mantine packages: $(echo "$MANTINE_IMPORTS" | grep -c . || echo 0)"
echo "Third-party packages: $(echo "$THIRD_PARTY_IMPORTS" | grep -c . || echo 0)"
echo "Missing packages: ${#MISSING_PACKAGES[@]}"
echo ""

if [ $ISSUES -gt 0 ]; then
  echo -e "${RED}Issues: $ISSUES${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi

echo ""

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
  echo -e "${RED}❌ BLOCKED: Missing dependencies${NC}"
  echo ""
  echo "Install missing packages and re-run audit:"
  for package in "${MISSING_PACKAGES[@]}"; do
    echo "  npm install $package"
  done
  echo ""
  exit 1
elif [ $ISSUES -gt 0 ]; then
  echo -e "${RED}❌ FAIL: Security or quality issues detected${NC}"
  echo ""
  echo "Review issues above and take action"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  PASS with warnings${NC}"
  echo ""
  echo "Review warnings above - component can proceed"
  exit 0
else
  echo -e "${GREEN}✅ PASS: All dependency checks passed${NC}"
  echo ""
  echo "Dependencies are secure and well-maintained"
  exit 0
fi
