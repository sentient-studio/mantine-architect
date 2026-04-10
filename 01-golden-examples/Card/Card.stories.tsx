import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider, Button, SimpleGrid, Stack } from '@mantine/core';
import Card from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  decorators: [
    (Story) => (
      <MantineProvider>
        <div style={{ padding: '2rem', maxWidth: '400px' }}>
          <Story />
        </div>
      </MantineProvider>
    ),
  ],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Controls internal padding via --card-padding token',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    title: 'Standard Product Card',
    description: 'This is a description of the product. It should wrap nicely within the card boundaries.',
  },
};

export const WithBadge: Story = {
  args: {
    title: 'Featured Item',
    description: 'This item has a badge to signify it is a "New" arrival.',
    badge: 'New',
  },
};

export const WithChildren: Story = {
  args: {
    title: 'Action Card',
    description: 'Cards often contain action buttons at the bottom.',
    children: (
      <Button variant="filled" fullWidth mt="md">
        Add to Cart
      </Button>
    ),
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="md" style={{ maxWidth: '400px' }}>
      <Card size="xs" title="Extra Small" description="xs padding" />
      <Card size="sm" title="Small" description="sm padding" />
      <Card size="md" title="Medium" description="md padding (default)" />
      <Card size="lg" title="Large" description="lg padding" />
      <Card size="xl" title="Extra Large" description="xl padding" />
    </Stack>
  ),
};

export const GridDisplay: Story = {
  render: () => (
    <SimpleGrid cols={2}>
      <Card title="Card 1" description="First item" badge="A" />
      <Card title="Card 2" description="Second item" badge="B" />
    </SimpleGrid>
  ),
};
