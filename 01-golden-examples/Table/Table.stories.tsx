import type { Meta, StoryObj } from '@storybook/react';
import { Container } from '@mantine/core';
import DataTable, { type TableColumn } from './Table';

// ── Shared fixtures ─────────────────────────────────────────────────────────

const COLUMNS: TableColumn[] = [
  { key: 'position', label: 'Position', width: 100 },
  { key: 'name',     label: 'Element name' },
  { key: 'symbol',   label: 'Symbol', width: 80 },
  { key: 'mass',     label: 'Atomic mass', width: 120 },
];

const SORTABLE_COLUMNS: TableColumn[] = COLUMNS.map((c) => ({ ...c, sortable: true }));

const DATA = [
  { position: 6,  name: 'Carbon',   symbol: 'C',  mass: 12.011 },
  { position: 7,  name: 'Nitrogen', symbol: 'N',  mass: 14.007 },
  { position: 39, name: 'Yttrium',  symbol: 'Y',  mass: 88.906 },
  { position: 56, name: 'Barium',   symbol: 'Ba', mass: 137.33 },
  { position: 58, name: 'Cerium',   symbol: 'Ce', mass: 140.12 },
];

const FOOTER_DATA = {
  position: '',
  name: 'Total',
  symbol: '5',
  mass: '392.374',
};

// Partial footer — 'position' and 'symbol' keys intentionally omitted
// to exercise the `footerData[col.key] ?? ''` fallback branch
const PARTIAL_FOOTER_DATA = {
  name: 'Total elements',
  mass: '392.374',
};

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof DataTable> = {
  title: 'Components/Table',
  component: DataTable,
  tags: ['autodocs'],
  // No per-story MantineProvider — global preview.tsx provides MantineProvider with primaryShade: 8
  decorators: [
    (Story) => (
      <Container size="md" py="xl">
        <Story />
      </Container>
    ),
  ],
  argTypes: {
    // Complex array types — not useful as UI controls
    columns:    { table: { disable: true } },
    data:       { table: { disable: true } },
    footerData: { table: { disable: true } },
    // Interactive controls
    striped: {
      control: 'select',
      options: [false, true, 'odd', 'even'],
      description: 'Alternate row background',
      table: { defaultValue: { summary: 'false' } },
    },
    highlightOnHover: {
      control: 'boolean',
      description: 'Highlight rows on hover',
      table: { defaultValue: { summary: 'false' } },
    },
    withTableBorder: {
      control: 'boolean',
      description: 'Add outer border around the table',
      table: { defaultValue: { summary: 'false' } },
    },
    withColumnBorders: {
      control: 'boolean',
      description: 'Add borders between columns',
      table: { defaultValue: { summary: 'false' } },
    },
    withRowBorders: {
      control: 'boolean',
      description: 'Add borders between rows',
      table: { defaultValue: { summary: 'true' } },
    },
    captionSide: {
      control: 'select',
      options: ['top', 'bottom'],
      description: 'Side to render the caption',
    },
    caption: {
      control: 'text',
      description: 'Optional caption text',
    },
    minWidth: {
      control: 'number',
      description: 'Minimum width before horizontal scroll activates',
      table: { defaultValue: { summary: '500' } },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// ── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
  },
};

export const WithBorders: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
    withTableBorder: true,
    withColumnBorders: true,
  },
};

export const Striped: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
    striped: 'odd',
  },
};

export const HighlightOnHover: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
    highlightOnHover: true,
  },
};

export const Sortable: Story = {
  args: {
    columns: SORTABLE_COLUMNS,
    data: DATA,
    withRowBorders: true,
  },
};

export const WithFooter: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
    footerData: FOOTER_DATA,
    withRowBorders: true,
  },
};

export const AllFeatures: Story = {
  args: {
    columns: SORTABLE_COLUMNS,
    data: DATA,
    footerData: FOOTER_DATA,
    striped: 'odd',
    highlightOnHover: true,
    withTableBorder: true,
    withColumnBorders: true,
    withRowBorders: true,
    caption: 'Selected elements from the periodic table',
    captionSide: 'bottom',
  },
};

export const WithCaption: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
    caption: 'Selected elements from the periodic table',
    captionSide: 'bottom',
  },
};

export const PartialFooter: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
    footerData: PARTIAL_FOOTER_DATA,
    withRowBorders: true,
  },
};

export const Showcase: Story = {
  args: {
    columns: SORTABLE_COLUMNS,
    data: DATA,
    footerData: FOOTER_DATA,
    striped: 'odd',
    highlightOnHover: true,
    withTableBorder: true,
    withColumnBorders: true,
    caption: 'Click any column header to sort',
    captionSide: 'bottom',
  },
};
