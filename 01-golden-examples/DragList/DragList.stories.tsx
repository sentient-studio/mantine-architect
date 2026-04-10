import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider } from '@mantine/core';
import DragList, { type DragListItem } from './DragList';

const ELEMENTS: DragListItem[] = [
  { id: '1', symbol: 'C',  name: 'Carbon',   position: 6,  mass: 12.011 },
  { id: '2', symbol: 'N',  name: 'Nitrogen',  position: 7,  mass: 14.007 },
  { id: '3', symbol: 'Y',  name: 'Yttrium',   position: 39, mass: 88.906 },
  { id: '4', symbol: 'Ba', name: 'Barium',    position: 56, mass: 137.33 },
  { id: '5', symbol: 'Ce', name: 'Cerium',    position: 58, mass: 140.12 },
];

const meta: Meta<typeof DragList> = {
  title: 'Components/DragList',
  component: DragList,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MantineProvider>
        <div style={{ padding: '2rem' }}>
          <Story />
        </div>
      </MantineProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['cards', 'with-handle', 'table'],
      description: 'Visual variant: draggable cards, handle-only drag, or table layout',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DragList>;

/** Default: handle-based drag (matches original Figma node 60:339) */
export const Default: Story = {
  args: { variant: 'with-handle', items: ELEMENTS },
};

/** Cards: whole row is the drag activator, no grip icon */
export const Cards: Story = {
  args: { variant: 'cards', items: ELEMENTS },
};

/** Table: columnar layout with Position / Name / Symbol / Mass */
export const Table: Story = {
  args: { variant: 'table', items: ELEMENTS },
};

/** Single item edge case */
export const SingleItem: Story = {
  args: { variant: 'with-handle', items: [ELEMENTS[0]] },
};

/** All three variants side-by-side */
export const Showcase: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <DragList variant="with-handle" items={ELEMENTS} />
      <DragList variant="cards" items={ELEMENTS} />
      <DragList variant="table" items={ELEMENTS} />
    </div>
  ),
};
