import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mantine/core';
import Checkbox from './Checkbox';

// Global MantineProvider (primaryShade: 8) is applied in .storybook/preview.tsx.
// Do NOT add a per-story MantineProvider — it resets primaryShade to 6,
// causing blue.6 (#228be6, 3.55:1) to be used instead of blue.8 (#1971c2, 4.63:1).

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Controls size of the checkbox, label, and description text',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'md' } },
    },
    variant: {
      control: 'select',
      options: ['filled', 'outline'],
      description: 'Visual variant — filled (default) or outline',
      table: { type: { summary: "'filled' | 'outline'" }, defaultValue: { summary: 'filled' } },
    },
    label: {
      control: 'text',
      description: 'Label displayed next to the checkbox',
    },
    description: {
      control: 'text',
      description: 'Helper text displayed below the label',
    },
    error: {
      control: 'text',
      description: 'Error message displayed below the checkbox',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the checkbox',
    },
    indeterminate: {
      control: 'boolean',
      description: 'Indeterminate state — overrides checked prop',
    },
    labelPosition: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Position of the label relative to the checkbox input',
      table: { type: { summary: "'left' | 'right'" }, defaultValue: { summary: 'right' } },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    label: 'I agree to the terms and conditions',
    size: 'md',
  },
};

export const Checked: Story = {
  args: {
    label: 'Checked state',
    defaultChecked: true,
    size: 'md',
  },
};

export const Indeterminate: Story = {
  args: {
    label: 'Indeterminate state',
    indeterminate: true,
    size: 'md',
  },
};

export const Outline: Story = {
  render: () => (
    <Stack gap="sm">
      <Checkbox variant="outline" label="Outline unchecked" size="md" />
      <Checkbox variant="outline" label="Outline checked" defaultChecked size="md" />
      <Checkbox variant="outline" label="Outline indeterminate" indeterminate size="md" />
    </Stack>
  ),
};

export const WithDescription: Story = {
  args: {
    label: 'Subscribe to newsletter',
    description: 'You will receive weekly updates about our products',
    size: 'md',
  },
};

export const WithError: Story = {
  args: {
    label: 'I agree to the terms and conditions',
    error: 'You must accept the terms to continue',
    size: 'md',
  },
};

export const LabelLeft: Story = {
  args: {
    label: 'Label on the left',
    labelPosition: 'left',
    defaultChecked: true,
    size: 'md',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled checkbox',
    disabled: true,
    size: 'md',
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="sm">
      <Checkbox size="xs" label="Extra Small (xs)" defaultChecked />
      <Checkbox size="sm" label="Small (sm)" defaultChecked />
      <Checkbox size="md" label="Medium (md)" defaultChecked />
      <Checkbox size="lg" label="Large (lg)" defaultChecked />
      <Checkbox size="xl" label="Extra Large (xl)" defaultChecked />
    </Stack>
  ),
};

export const Showcase: Story = {
  render: () => (
    <Stack gap="md">
      <Checkbox label="Default unchecked" />
      <Checkbox label="Checked" defaultChecked />
      <Checkbox label="Indeterminate" indeterminate />
      <Checkbox variant="outline" label="Outline checked" defaultChecked />
      <Checkbox
        label="With description"
        description="Helper text displayed below the label"
      />
      <Checkbox
        label="Error state"
        error="This field is required"
      />
      <Checkbox label="Disabled" disabled />
      <Checkbox label="Disabled checked" disabled defaultChecked />
    </Stack>
  ),
};
