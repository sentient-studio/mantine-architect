import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider, Stack } from '@mantine/core';
import { PasswordStrength } from './PasswordStrength';

const meta: Meta<typeof PasswordStrength> = {
  title: 'Components/PasswordStrength',
  component: PasswordStrength,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MantineProvider theme={{ primaryShade: 8 }}>
        <div style={{ maxWidth: 400, padding: '2rem', margin: '0 auto' }}>
          <Story />
        </div>
      </MantineProvider>
    ),
  ],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Controls input and requirement text size',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PasswordStrength>;

/** Empty state — requirements hidden until typing begins */
export const Default: Story = {};

/** Weak — short password, no requirements met */
export const Weak: Story = {
  args: { value: 'abc', onChange: () => {} },
};

/** Moderate — long enough + some requirements met, but missing special character */
export const Moderate: Story = {
  args: { value: 'Password1', onChange: () => {} },
};

/** Strong — all requirements met */
export const Strong: Story = {
  args: { value: 'P@ssw0rd!', onChange: () => {} },
};

/** All five sizes stacked for visual comparison */
export const Sizes: Story = {
  render: () => (
    <MantineProvider theme={{ primaryShade: 8 }}>
      <Stack gap="xl" style={{ maxWidth: 400, padding: '1rem' }}>
        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
          <PasswordStrength
            key={size}
            size={size}
            value="P@ssw0rd!"
            onChange={() => {}}
            label={`Password (${size})`}
          />
        ))}
      </Stack>
    </MantineProvider>
  ),
};

/** All four strength states stacked for visual comparison */
export const Showcase: Story = {
  render: () => (
    <MantineProvider theme={{ primaryShade: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', padding: '1rem' }}>
        {[
          { label: 'Empty (default)', props: {} },
          { label: 'Weak — "abc"', props: { value: 'abc', onChange: () => {} } },
          { label: 'Moderate — "Password1"', props: { value: 'Password1', onChange: () => {} } },
          { label: 'Strong — "P@ssw0rd!"', props: { value: 'P@ssw0rd!', onChange: () => {} } },
        ].map(({ label, props }) => (
          <div key={label} style={{ maxWidth: 400 }}>
            <p style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
              {label}
            </p>
            <PasswordStrength {...props} />
          </div>
        ))}
      </div>
    </MantineProvider>
  ),
};
