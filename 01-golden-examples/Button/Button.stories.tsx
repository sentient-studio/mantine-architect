import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider, Group, Stack } from '@mantine/core';
import Button from './Button';

/**
 * Golden Storybook Template
 * Logic: Every story MUST be wrapped in MantineProvider to access CSS variables.
 */
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
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
      options: ['filled', 'outline'],
      description: 'The visual variant of the button',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Controls height, padding, and font size',
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Primary Action',
    variant: 'filled',
    size: 'sm',
  },
};

export const Outline: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'outline',
    size: 'sm',
  },
};

export const Loading: Story = {
  args: {
    children: 'Saving Changes',
    loading: true,
  },
};

export const WithIcons: Story = {
  args: {
    children: 'Settings',
    leftSection: <span>⚙️</span>,
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack align="flex-start" gap="sm">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </Stack>
  ),
};

export const Showcase: Story = {
  render: () => (
    <Group>
      <Button variant="filled">Filled</Button>
      <Button variant="outline">Outline</Button>
      <Button disabled>Disabled</Button>
    </Group>
  ),
};
