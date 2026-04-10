import React, { useState, useMemo } from 'react';
import { Box, Table, UnstyledButton, type BoxProps } from '@mantine/core';
import { IconSelector, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import classes from './Table.module.css';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
}

export interface DataTableProps extends BoxProps {
  /** Column definitions — key, label, optional sortable flag and width */
  columns: TableColumn[];
  /** Row data — each record maps column keys to React nodes */
  data: Record<string, React.ReactNode>[];
  /** Optional footer row — missing keys render an empty cell */
  footerData?: Record<string, React.ReactNode>;
  /** Alternate row background. Pass true for 'odd', or 'odd'/'even' explicitly */
  striped?: boolean | 'odd' | 'even';
  /** Highlight rows on hover */
  highlightOnHover?: boolean;
  /** Add outer border around the table */
  withTableBorder?: boolean;
  /** Add borders between columns */
  withColumnBorders?: boolean;
  /** Add borders between rows (default true — matches Figma design) */
  withRowBorders?: boolean;
  /** Optional caption text */
  caption?: React.ReactNode;
  /** Side to render the caption ('top' | 'bottom') */
  captionSide?: 'top' | 'bottom';
  /** Minimum width before horizontal scroll activates (default 500) */
  minWidth?: number;
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * DataTable — data-driven table built on Mantine's Table primitive.
 *
 * Accepts typed column definitions and row data; handles client-side sorting
 * (asc → desc → reset cycle) via sortable column headers with WCAG-AA sort
 * icons (IconSelector / IconChevronUp / IconChevronDown at shade 7+).
 *
 * Wraps Table.ScrollContainer so the table scrolls horizontally rather than
 * overflowing at narrow viewports (minWidth default: 500px).
 *
 * WCAG AA: sort icon buttons use aria-label="Sort by {label}". Header and
 * footer cells use gray.7 text (7.45:1) — never gray.6 (3.15:1).
 */
export function DataTable({
  columns,
  data,
  footerData,
  striped = false,
  highlightOnHover = false,
  withTableBorder = false,
  withColumnBorders = false,
  withRowBorders = true,
  caption,
  captionSide,
  minWidth = 500,
  ...others
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  function handleSort(key: string) {
    if (sortColumn !== key) {
      setSortColumn(key);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      // desc → reset
      setSortColumn(null);
      setSortDirection(null);
    }
  }

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;
    return [...data].sort((a, b) => {
      const av = a[sortColumn];
      const bv = b[sortColumn];
      const an = Number(av);
      const bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) {
        return sortDirection === 'asc' ? an - bn : bn - an;
      }
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data, sortColumn, sortDirection]);

  function getSortIcon(key: string) {
    if (sortColumn !== key || sortDirection === null) {
      return <IconSelector size={14} className={classes.sortIcon} aria-hidden />;
    }
    if (sortDirection === 'asc') {
      return <IconChevronUp size={14} className={classes.sortIconActive} aria-hidden />;
    }
    return <IconChevronDown size={14} className={classes.sortIconActive} aria-hidden />;
  }

  const rows = sortedData.map((row, i) => (
    <Table.Tr key={i}>
      {columns.map((col) => (
        <Table.Td key={col.key}>{row[col.key]}</Table.Td>
      ))}
    </Table.Tr>
  ));

  return (
    <Box
      className={classes.root}
      data-striped={striped || undefined}
      {...others}
    >
      <Table.ScrollContainer minWidth={minWidth} type="native">
        <Table
          striped={striped || undefined}
          highlightOnHover={highlightOnHover || undefined}
          withTableBorder={withTableBorder || undefined}
          withColumnBorders={withColumnBorders || undefined}
          withRowBorders={withRowBorders}
          captionSide={captionSide}
          classNames={{ caption: classes.caption }}
        >
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={col.key} w={col.width} className={classes.th}>
                  {col.sortable ? (
                    <UnstyledButton
                      className={classes.sortButton}
                      onClick={() => handleSort(col.key)}
                      data-sort-direction={
                        sortColumn === col.key ? sortDirection : undefined
                      }
                      aria-label={`Sort by ${col.label}`}
                    >
                      <span>{col.label}</span>
                      {getSortIcon(col.key)}
                    </UnstyledButton>
                  ) : (
                    col.label
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
          {footerData && (
            <Table.Tfoot>
              <Table.Tr>
                {columns.map((col) => (
                  <Table.Td key={col.key} className={classes.tfoot}>
                    {footerData[col.key] ?? ''}
                  </Table.Td>
                ))}
              </Table.Tr>
            </Table.Tfoot>
          )}
          {caption && <Table.Caption>{caption}</Table.Caption>}
        </Table>
      </Table.ScrollContainer>
    </Box>
  );
}

export default DataTable;
