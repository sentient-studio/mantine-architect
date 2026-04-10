import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider, Container, Stack, Text } from '@mantine/core';
import Accordion from './Accordion';

const ITEMS = [
  {
    value: 'item-1',
    label: 'What is Mantine?',
    children:
      'Mantine is a React components library with a focus on usability, accessibility, and developer experience.',
  },
  {
    value: 'item-2',
    label: 'Is it free to use?',
    children: 'Yes, Mantine is completely free and open source under the MIT license.',
  },
  {
    value: 'item-3',
    label: 'Where can I get support?',
    children:
      'You can ask questions on GitHub Discussions, open issues for bugs, or join the community Discord server.',
  },
];

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MantineProvider theme={{ primaryShade: 8 }}>
        <Container size="sm" py="xl">
          <Story />
        </Container>
      </MantineProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'contained', 'filled', 'separated'],
    },
    chevronPosition: {
      control: 'select',
      options: ['left', 'right'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Controls control height and font size via custom property cascade',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  args: {
    items: ITEMS,
    defaultValue: 'item-1',
  },
};

export const AllClosed: Story = {
  args: {
    items: ITEMS,
  },
};

export const ChevronLeft: Story = {
  args: {
    items: ITEMS,
    chevronPosition: 'left',
    defaultValue: 'item-1',
  },
};

export const Contained: Story = {
  args: {
    items: ITEMS,
    variant: 'contained',
    defaultValue: 'item-1',
  },
};

export const Showcase: Story = {
  render: () => (
    <Stack gap="xl">
      <div>
        <Text size="sm" fw={500} mb="xs">
          Default — chevron right
        </Text>
        <Accordion items={ITEMS} defaultValue="item-1" />
      </div>
      <div>
        <Text size="sm" fw={500} mb="xs">
          Chevron left
        </Text>
        <Accordion items={ITEMS} chevronPosition="left" defaultValue="item-1" />
      </div>
      <div>
        <Text size="sm" fw={500} mb="xs">
          Contained variant
        </Text>
        <Accordion items={ITEMS} variant="contained" defaultValue="item-1" />
      </div>
      <div>
        <Text size="sm" fw={500} mb="xs">
          Filled variant
        </Text>
        <Accordion items={ITEMS} variant="filled" defaultValue="item-1" />
      </div>
      <div>
        <Text size="sm" fw={500} mb="xs">
          Separated variant
        </Text>
        <Accordion items={ITEMS} variant="separated" defaultValue="item-1" />
      </div>
    </Stack>
  ),
};

// Each size instance uses a unique label prefix so the region landmarks
// (Accordion.Panel has role="region" labelled by its control button) have
// distinct accessible names across the five instances on this page.
// Without this, axe flags "Ensure landmarks are unique" (moderate violation).
const sizeItems = (prefix: string) => [
  {
    value: 'item-1',
    label: `${prefix} — What is Mantine?`,
    children:
      'Mantine is a React components library with a focus on usability, accessibility, and developer experience.',
  },
  {
    value: 'item-2',
    label: `${prefix} — Is it free to use?`,
    children: 'Yes, Mantine is completely free and open source under the MIT license.',
  },
  {
    value: 'item-3',
    label: `${prefix} — Where can I get support?`,
    children:
      'You can ask questions on GitHub Discussions, open issues for bugs, or join the community Discord server.',
  },
];

export const Sizes: Story = {
  render: () => (
    <Stack gap="xl">
      <div>
        <Text size="sm" fw={500} mb="xs">
          xs
        </Text>
        <Accordion size="xs" items={sizeItems('xs')} defaultValue="item-1" />
      </div>
      <div>
        <Text size="sm" fw={500} mb="xs">
          sm
        </Text>
        <Accordion size="sm" items={sizeItems('sm')} defaultValue="item-1" />
      </div>
      <div>
        <Text size="sm" fw={500} mb="xs">
          md (default)
        </Text>
        <Accordion size="md" items={sizeItems('md')} defaultValue="item-1" />
      </div>
      <div>
        <Text size="sm" fw={500} mb="xs">
          lg
        </Text>
        <Accordion size="lg" items={sizeItems('lg')} defaultValue="item-1" />
      </div>
      <div>
        <Text size="sm" fw={500} mb="xs">
          xl
        </Text>
        <Accordion size="xl" items={sizeItems('xl')} defaultValue="item-1" />
      </div>
    </Stack>
  ),
};
