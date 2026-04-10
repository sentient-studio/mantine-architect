import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider, Container, Stack } from '@mantine/core';
import TextInput from './TextInput';

const meta: Meta<typeof TextInput> = {
  title: 'Components/TextInput',
  component: TextInput,
  decorators: [
    (Story) => (
      <MantineProvider>
        <Container size="xs" py="xl">
          <Story />
        </Container>
      </MantineProvider>
    ),
  ],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Controls input height via --input-height token',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
  args: {
    label: 'Email address',
    placeholder: 'hello@example.com',
    required: true,
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Email address',
    placeholder: 'hello@example.com',
    error: 'Invalid email address',
    defaultValue: 'invalid-email',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Username',
    placeholder: 'Locked field',
    disabled: true,
    value: 'johndoe_123',
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="md">
      <TextInput size="xs" label="Extra Small" placeholder="xs" />
      <TextInput size="sm" label="Small" placeholder="sm" />
      <TextInput size="md" label="Medium" placeholder="md (default)" />
      <TextInput size="lg" label="Large" placeholder="lg" />
      <TextInput size="xl" label="Extra Large" placeholder="xl" />
    </Stack>
  ),
};
