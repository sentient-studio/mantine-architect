import type { Meta, StoryObj } from '@storybook/react';
import { Container, Stack } from '@mantine/core';
import Select from './Select';

export const FRUIT_OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
];

const meta: Meta<typeof Select> = {
  excludeStories: ['FRUIT_OPTIONS'],
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  // No per-story MantineProvider — global preview.tsx provides MantineProvider with primaryShade: 8
  decorators: [
    (Story) => (
      <Container size="xs" py="xl">
        <Story />
      </Container>
    ),
  ],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    searchable: { control: 'boolean' },
    clearable: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Controls input height, padding, and font-size',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'md' } },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    label: 'Favourite fruit',
    placeholder: 'Pick a fruit',
    data: FRUIT_OPTIONS,
  },
};

export const Filled: Story = {
  args: {
    label: 'Favourite fruit',
    placeholder: 'Pick a fruit',
    data: FRUIT_OPTIONS,
    defaultValue: 'banana',
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Favourite fruit',
    description: 'Choose the fruit you enjoy most',
    placeholder: 'Pick a fruit',
    data: FRUIT_OPTIONS,
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Favourite fruit',
    placeholder: 'Pick a fruit',
    data: FRUIT_OPTIONS,
    error: 'Please select a valid fruit',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Favourite fruit',
    placeholder: 'Pick a fruit',
    data: FRUIT_OPTIONS,
    disabled: true,
    defaultValue: 'cherry',
  },
};

export const Searchable: Story = {
  args: {
    label: 'Searchable fruit',
    placeholder: 'Search or pick a fruit',
    data: FRUIT_OPTIONS,
    searchable: true,
  },
};

export const Clearable: Story = {
  args: {
    label: 'Clearable fruit',
    placeholder: 'Pick a fruit',
    data: FRUIT_OPTIONS,
    clearable: true,
    defaultValue: 'apple',
  },
};

export const ReadOnly: Story = {
  args: {
    label: 'Read-only selection',
    placeholder: 'Pick a fruit',
    data: FRUIT_OPTIONS,
    readOnly: true,
    defaultValue: 'date',
  },
};

export const WithGroupedOptions: Story = {
  args: {
    label: 'Select a framework',
    placeholder: 'Pick a framework',
    data: [
      { group: 'Frontend', items: ['React', 'Angular', 'Vue', 'Svelte'] },
      { group: 'Backend', items: ['Express', 'Django', 'Rails', 'FastAPI'] },
    ],
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="md">
      <Select size="xs" label="Extra Small (xs)" placeholder="Pick a fruit" data={FRUIT_OPTIONS} defaultValue="apple" />
      <Select size="sm" label="Small (sm)" placeholder="Pick a fruit" data={FRUIT_OPTIONS} defaultValue="banana" />
      <Select size="md" label="Medium (md — default)" placeholder="Pick a fruit" data={FRUIT_OPTIONS} defaultValue="cherry" />
      <Select size="lg" label="Large (lg)" placeholder="Pick a fruit" data={FRUIT_OPTIONS} defaultValue="date" />
      <Select size="xl" label="Extra Large (xl)" placeholder="Pick a fruit" data={FRUIT_OPTIONS} defaultValue="elderberry" />
    </Stack>
  ),
};

export const Showcase: Story = {
  render: () => (
    <Stack gap="xl">
      <Select
        label="Default state"
        placeholder="Pick a fruit"
        data={FRUIT_OPTIONS}
      />
      <Select
        label="Filled state"
        placeholder="Pick a fruit"
        data={FRUIT_OPTIONS}
        defaultValue="apple"
      />
      <Select
        label="With description"
        description="Choose the fruit you enjoy most"
        placeholder="Pick a fruit"
        data={FRUIT_OPTIONS}
      />
      <Select
        label="Error state"
        placeholder="Pick a fruit"
        data={FRUIT_OPTIONS}
        error="Please select a valid option"
      />
      <Select
        label="Disabled state"
        placeholder="Pick a fruit"
        data={FRUIT_OPTIONS}
        disabled
        defaultValue="cherry"
      />
      <Select
        label="Searchable"
        placeholder="Search or pick"
        data={FRUIT_OPTIONS}
        searchable
      />
      <Select
        label="Clearable"
        placeholder="Pick a fruit"
        data={FRUIT_OPTIONS}
        clearable
        defaultValue="elderberry"
      />
    </Stack>
  ),
};
