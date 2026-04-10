import type { Meta, StoryObj } from '@storybook/react';
import { Container, Stack } from '@mantine/core';
import MultiSelect from './MultiSelect';

const FRUIT_OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
];

// Each Sizes story instance needs unique item values to avoid duplicate landmarks.
// sizeItems prefixes both value and label so each MultiSelect instance is isolated.
function sizeItems(prefix: string) {
  return FRUIT_OPTIONS.map((o) => ({ value: `${prefix}-${o.value}`, label: `${o.label}` }));
}

const meta: Meta<typeof MultiSelect> = {
  title: 'Components/MultiSelect',
  component: MultiSelect,
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
      description: 'Controls input min-height, pill font-size, and spacing',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'md' } },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MultiSelect>;

export const Default: Story = {
  args: {
    label: 'Favourite fruits',
    placeholder: 'Pick fruits',
    data: FRUIT_OPTIONS,
  },
};

export const Filled: Story = {
  args: {
    label: 'Favourite fruits',
    placeholder: 'Pick fruits',
    data: FRUIT_OPTIONS,
    defaultValue: ['apple', 'banana'],
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Favourite fruits',
    description: 'Choose one or more fruits you enjoy',
    placeholder: 'Pick fruits',
    data: FRUIT_OPTIONS,
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Favourite fruits',
    placeholder: 'Pick fruits',
    data: FRUIT_OPTIONS,
    error: 'Please select at least one fruit',
  },
};

export const Disabled: Story = {
  // WCAG 1.4.3 explicitly exempts inactive UI components from contrast requirements.
  // Suppressing color-contrast here is correct — it is not a real violation.
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
  args: {
    label: 'Favourite fruits',
    placeholder: 'Pick fruits',
    data: FRUIT_OPTIONS,
    disabled: true,
    defaultValue: ['cherry'],
  },
};

export const Searchable: Story = {
  args: {
    label: 'Searchable fruits',
    placeholder: 'Search and pick fruits',
    data: FRUIT_OPTIONS,
    searchable: true,
    nothingFoundMessage: 'Nothing found...',
  },
};

export const Clearable: Story = {
  args: {
    label: 'Clearable fruits',
    placeholder: 'Pick fruits',
    data: FRUIT_OPTIONS,
    clearable: true,
    defaultValue: ['apple', 'cherry'],
  },
};

export const MaxValues: Story = {
  args: {
    label: 'Select up to 2 fruits',
    placeholder: 'Pick up to 2 fruits',
    data: FRUIT_OPTIONS,
    maxValues: 2,
  },
};

export const WithGroupedOptions: Story = {
  args: {
    label: 'Select frameworks',
    placeholder: 'Pick frameworks',
    data: [
      { group: 'Frontend', items: ['React', 'Angular', 'Vue', 'Svelte'] },
      { group: 'Backend', items: ['Express', 'Django', 'Rails', 'FastAPI'] },
    ],
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="md">
      <MultiSelect
        size="xs"
        label="Extra Small (xs)"
        placeholder="Pick fruits"
        data={sizeItems('xs')}
        defaultValue={['xs-apple']}
      />
      <MultiSelect
        size="sm"
        label="Small (sm)"
        placeholder="Pick fruits"
        data={sizeItems('sm')}
        defaultValue={['sm-banana']}
      />
      <MultiSelect
        size="md"
        label="Medium (md — default)"
        placeholder="Pick fruits"
        data={sizeItems('md')}
        defaultValue={['md-cherry']}
      />
      <MultiSelect
        size="lg"
        label="Large (lg)"
        placeholder="Pick fruits"
        data={sizeItems('lg')}
        defaultValue={['lg-date']}
      />
      <MultiSelect
        size="xl"
        label="Extra Large (xl)"
        placeholder="Pick fruits"
        data={sizeItems('xl')}
        defaultValue={['xl-elderberry']}
      />
    </Stack>
  ),
};

export const Showcase: Story = {
  // Showcase includes the disabled state — suppress color-contrast (WCAG 1.4.3 exempts inactive UI).
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
  render: () => (
    <Stack gap="xl">
      <MultiSelect
        label="Default state"
        placeholder="Pick fruits"
        data={FRUIT_OPTIONS}
      />
      <MultiSelect
        label="Filled state"
        placeholder="Pick fruits"
        data={FRUIT_OPTIONS}
        defaultValue={['apple', 'banana']}
      />
      <MultiSelect
        label="With description"
        description="Choose one or more fruits you enjoy"
        placeholder="Pick fruits"
        data={FRUIT_OPTIONS}
      />
      <MultiSelect
        label="Error state"
        placeholder="Pick fruits"
        data={FRUIT_OPTIONS}
        error="Please select at least one fruit"
      />
      <MultiSelect
        label="Disabled"
        placeholder="Pick fruits"
        data={FRUIT_OPTIONS}
        disabled
        defaultValue={['cherry']}
      />
      <MultiSelect
        label="Searchable"
        placeholder="Search and pick"
        data={FRUIT_OPTIONS}
        searchable
        nothingFoundMessage="Nothing found..."
      />
      <MultiSelect
        label="Clearable"
        placeholder="Pick fruits"
        data={FRUIT_OPTIONS}
        clearable
        defaultValue={['elderberry']}
      />
    </Stack>
  ),
};
