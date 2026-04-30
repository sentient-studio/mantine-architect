import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  PasswordInput,
  Checkbox,
  Anchor,
  Modal as MantineModal,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconAt, IconLock } from '@tabler/icons-react';
import { Modal } from './Modal';

/*
 * NOTE: MantineProvider is NOT added here.
 * .storybook/preview.jsx already wraps every story in
 * <MantineProvider theme={{ primaryShade: 8 }}>.
 * Adding a second provider would reset primaryShade to 6 and break
 * WCAG AA contrast for the primary blue colour (blue.6 = 3.55:1 ❌ vs
 * blue.8 = 4.63:1 ✅).
 */

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  /*
   * Thin wrapper rule: Modal is Omit<MantineModalProps, 'classNames'>.
   * Storybook cannot introspect external library types — explicit argTypes
   * are required so the docs page and Controls panel are not blank.
   */
  argTypes: {
    title: {
      control: 'text',
      description: 'Modal header title',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Modal content width. Tokens: xs≈320px, sm≈380px, md≈500px, lg≈620px, xl≈780px. Also accepts a number (px) or percentage string.',
      table: { type: { summary: 'MantineSize | number | string' }, defaultValue: { summary: 'md' } },
    },
    centered: {
      control: 'boolean',
      description: 'Center the modal vertically in the viewport',
      table: { defaultValue: { summary: 'false' } },
    },
    withCloseButton: {
      control: 'boolean',
      description: 'Show close button in the modal header',
      table: { defaultValue: { summary: 'true' } },
    },
    withOverlay: {
      control: 'boolean',
      description: 'Show backdrop overlay behind the modal',
      table: { defaultValue: { summary: 'true' } },
    },
    shadow: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Shadow depth of the modal panel',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'xl' } },
    },
    padding: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Inner padding of the modal content and header',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'md' } },
    },
    radius: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Border radius of the modal content panel',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'sm' } },
    },
    opened: {
      table: { disable: true },
    },
    onClose: {
      table: { disable: true },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

/* ─── Registration form used in Showcase + Open stories ────────────────────── */
/* Uses @mantine/form for field-level validation; calls onClose on success.     */
/* Includes confirmPassword field matching Figma design (Drawer does not).      */

export function RegistrationForm({ onClose }: { onClose: () => void }) {
  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
    validate: {
      firstName:       (v) => (v.trim().length < 1 ? 'First name is required' : null),
      lastName:        (v) => (v.trim().length < 1 ? 'Last name is required' : null),
      email:           (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email'),
      password:        (v) => (v.length < 8 ? 'Password must be at least 8 characters' : null),
      confirmPassword: (v, values) => (v !== values.password ? 'Passwords do not match' : null),
      terms:           (v) => (v ? null : 'You must accept the terms and conditions'),
    },
  });

  return (
    <form onSubmit={form.onSubmit(onClose)} noValidate>
      <Stack gap="md">
        <Group grow>
          <TextInput
            label="First name"
            placeholder="Your first name"
            withAsterisk
            {...form.getInputProps('firstName')}
          />
          <TextInput
            label="Last name"
            placeholder="Your last name"
            withAsterisk
            {...form.getInputProps('lastName')}
          />
        </Group>
        <TextInput
          label="Email"
          placeholder="your@email.com"
          leftSection={<IconAt size={14} />}
          withAsterisk
          {...form.getInputProps('email')}
        />
        <PasswordInput
          label="Password"
          placeholder="At least 8 characters"
          leftSection={<IconLock size={14} />}
          withAsterisk
          {...form.getInputProps('password')}
        />
        <PasswordInput
          label="Confirm Password"
          placeholder="Confirm your password"
          leftSection={<IconLock size={14} />}
          withAsterisk
          {...form.getInputProps('confirmPassword')}
        />
        <Checkbox
          label="I agree to the terms and conditions"
          {...form.getInputProps('terms', { type: 'checkbox' })}
        />
        {/* Horizontal footer: gray.7 = 7.45:1 on gray.0 — WCAG AA pass (Figma gray.6 = 3.10:1 ❌ promoted) */}
        <Group justify="space-between">
          <Text size="sm" c="gray.7">
            Have an account?{' '}
            <Anchor href="#" size="sm" underline="always">
              Login
            </Anchor>
          </Text>
          <Button type="submit">Register</Button>
        </Group>
      </Stack>
    </form>
  );
}

/* ─── Showcase ──────────────────────────────────────────────────────────────── */
/* Primary docs story — args-based so Controls panel works. Starts closed.      */

export const Showcase: Story = {
  args: {
    title: 'Introduce yourself!',
    size: 'md',
    centered: false,
    withCloseButton: true,
    withOverlay: true,
    shadow: 'xl',
    padding: 'md',
    radius: 'sm',
  },
  render: (args) => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Modal {...args} opened={opened} onClose={close}>
          <RegistrationForm onClose={close} />
        </Modal>
        <Group p="md">
          <Button variant="default" onClick={open}>
            Open Modal
          </Button>
        </Group>
      </>
    );
  },
};

/* ─── Open ──────────────────────────────────────────────────────────────────── */
/* Playwright fixture — starts open so interaction tests can run immediately.   */
/* Hidden from docs page; accessible via direct iframe URL.                     */

export const Open: Story = {
  parameters: {
    docs: { disable: true },
  },
  render: () => {
    const [opened, { close }] = useDisclosure(true);
    return (
      <Modal opened={opened} onClose={close} title="Introduce yourself!">
        <RegistrationForm onClose={close} />
      </Modal>
    );
  },
};

/* ─── Default ───────────────────────────────────────────────────────────────── */
/* Minimal interactive demo — single button, basic modal with no form.          */

export const Default: Story = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Modal opened={opened} onClose={close} title="Welcome">
          <Text size="sm">
            This is a minimal modal example. Press Escape or click the overlay to close.
          </Text>
        </Modal>
        <Group p="md">
          <Button variant="default" onClick={open}>
            Open Modal
          </Button>
        </Group>
      </>
    );
  },
};

/* ─── WithoutHeader ─────────────────────────────────────────────────────────── */
/* Playwright fixture — pre-opened header-less dialog for a11y testing.         */
/* Hidden from docs page; accessible via direct iframe URL.                     */

export const WithoutHeader: Story = {
  parameters: {
    docs: { disable: true },
  },
  render: () => {
    const [opened, { close }] = useDisclosure(true);
    return (
      <>
        {/*
         * Uses Mantine compound Modal API so aria-label lands on
         * Modal.Content (the section[role="dialog"]) directly.
         * The simple <Modal> form spreads HTML props to the outer root div,
         * not the content section, so the compound form is required here.
         * aria-label satisfies WCAG 4.1.2 / aria-dialog-name: a header-less
         * dialog must still have an accessible name.
         */}
        <MantineModal.Root opened={opened} onClose={close}>
          <MantineModal.Overlay />
          <MantineModal.Content aria-label="Quick actions">
            <MantineModal.Body>
              <Stack gap="md" pt="sm">
                <Text size="sm">
                  Modal without a header — press Escape or click the overlay to close.
                </Text>
                <Button variant="default" onClick={close}>
                  Close
                </Button>
              </Stack>
            </MantineModal.Body>
          </MantineModal.Content>
        </MantineModal.Root>
      </>
    );
  },
};

/* ─── Centered ──────────────────────────────────────────────────────────────── */
/* Demonstrates the centered prop — modal is vertically centered in viewport.   */

export const Centered: Story = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Modal opened={opened} onClose={close} title="Centered modal" centered>
          <Text size="sm">
            This modal is centered vertically in the viewport using the{' '}
            <code>centered</code> prop.
          </Text>
          <Button mt="md" onClick={close} fullWidth variant="default">
            Close
          </Button>
        </Modal>
        <Group p="md">
          <Button variant="default" onClick={open}>
            Open Centered Modal
          </Button>
        </Group>
      </>
    );
  },
};

/* ─── Sizes ─────────────────────────────────────────────────────────────────── */
/* Four trigger buttons demonstrating Mantine's modal width scale.              */

export const Sizes: Story = {
  render: () => {
    const [opened, setOpened] = useState(false);
    const [size, setSize] = useState<string>('md');
    const openAt = (s: string) => {
      setSize(s);
      setOpened(true);
    };
    return (
      <>
        <Modal
          opened={opened}
          onClose={() => setOpened(false)}
          title={`Modal size: ${size}`}
          size={size}
        >
          <Text size="sm">
            This modal uses <code>size=&quot;{size}&quot;</code>. Mantine maps size tokens to
            widths: xs ≈ 320px, sm ≈ 380px, md ≈ 500px, lg ≈ 620px.
          </Text>
        </Modal>
        <Group p="md" justify="center">
          {(['xs', 'sm', 'md', 'lg'] as const).map((s) => (
            <Button key={s} variant="default" onClick={() => openAt(s)}>
              {s}
            </Button>
          ))}
        </Group>
      </>
    );
  },
};
