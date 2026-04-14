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
  Drawer as MantineDrawer,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconAt, IconLock } from '@tabler/icons-react';
import { Drawer } from './Drawer';

/*
 * NOTE: MantineProvider is NOT added here.
 * .storybook/preview.jsx already wraps every story in
 * <MantineProvider theme={{ primaryShade: 8 }}>.
 * Adding a second provider would reset primaryShade to 6 and break
 * WCAG AA contrast for the primary blue colour (blue.6 = 3.55:1 ❌ vs
 * blue.8 = 4.63:1 ✅).
 */

const meta: Meta<typeof Drawer> = {
  title: 'Components/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['left', 'right', 'top', 'bottom'],
      description: 'Side the drawer slides in from',
      table: { type: { summary: "'left' | 'right' | 'top' | 'bottom'" }, defaultValue: { summary: 'right' } },
    },
    size: {
      control: 'text',
      description:
        'Drawer width. Mantine size tokens: xs≈320px, sm≈380px, md≈500px, lg≈620px, xl≈780px. Or pass a number for an exact px value.',
      table: { type: { summary: 'MantineSize | number' }, defaultValue: { summary: '400' } },
    },
    withOverlay: {
      control: 'boolean',
      description: 'Show backdrop overlay behind drawer',
      table: { defaultValue: { summary: 'true' } },
    },
    withCloseButton: {
      control: 'boolean',
      description: 'Show close button in header',
      table: { defaultValue: { summary: 'true' } },
    },
    title: {
      control: 'text',
      description: 'Drawer header title',
    },
    shadow: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Shadow depth of the drawer panel',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'md' } },
    },
    padding: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Inner padding of the drawer body',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'md' } },
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
type Story = StoryObj<typeof Drawer>;

/* ─── Registration form used in Open + Default stories ─────────────────────── */
/* Uses @mantine/form for field-level validation; only calls onClose on success. */

function RegistrationForm({ onClose }: { onClose: () => void }) {
  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      terms: false,
    },
    validate: {
      firstName: (v) => (v.trim().length < 1 ? 'First name is required' : null),
      lastName:  (v) => (v.trim().length < 1 ? 'Last name is required' : null),
      email:     (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email'),
      password:  (v) => (v.length < 8 ? 'Password must be at least 8 characters' : null),
      terms:     (v) => (v ? null : 'You must accept the terms and conditions'),
    },
  });

  const handleSubmit = form.onSubmit(() => {
    onClose();
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
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
        <Checkbox
          label="I agree to the terms and conditions"
          {...form.getInputProps('terms', { type: 'checkbox' })}
        />
        <Button type="submit" fullWidth>
          Register
        </Button>
        {/* gray.7 = 7.45:1 on white — WCAG AA pass (Figma gray.6 = 3.15:1 ❌ promoted) */}
        <Text ta="center" size="sm" c="gray.7">
          Have an account?{' '}
          <Anchor href="#" size="sm" underline="always">
            Login
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}

/* ─── Showcase ──────────────────────────────────────────────────────────────── */
/* Primary docs story — args-based, starts closed, Controls panel works.        */

export const Showcase: Story = {
  args: {
    title: 'Create account',
    position: 'right',
    size: 400,
    withOverlay: true,
    withCloseButton: true,
  },
  render: (args) => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Drawer {...args} opened={opened} onClose={close}>
          <RegistrationForm onClose={close} />
        </Drawer>
        <Group p="md">
          <Button variant="default" onClick={open}>
            Open Drawer
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
      <Drawer opened={opened} onClose={close} title="Create account">
        <RegistrationForm onClose={close} />
      </Drawer>
    );
  },
};

/* ─── Default ───────────────────────────────────────────────────────────────── */

export const Default: Story = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Drawer opened={opened} onClose={close} title="Create account">
          <RegistrationForm onClose={close} />
        </Drawer>
        <Group p="md">
          <Button variant="default" onClick={open}>
            Open Drawer
          </Button>
        </Group>
      </>
    );
  },
};

/* ─── Positions ─────────────────────────────────────────────────────────────── */

export const Positions: Story = {
  render: () => {
    const [opened, setOpened] = useState(false);
    const [position, setPosition] = useState<'left' | 'right' | 'top' | 'bottom'>('right');
    const openAt = (p: typeof position) => {
      setPosition(p);
      setOpened(true);
    };
    return (
      <>
        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          title={`Position: ${position}`}
          position={position}
        >
          Press Escape or click the overlay to close
        </Drawer>
        <Group p="md" justify="center">
          <Button variant="default" onClick={() => openAt('left')}>
            Left
          </Button>
          <Button variant="default" onClick={() => openAt('right')}>
            Right
          </Button>
          <Button variant="default" onClick={() => openAt('top')}>
            Top
          </Button>
          <Button variant="default" onClick={() => openAt('bottom')}>
            Bottom
          </Button>
        </Group>
      </>
    );
  },
};

/* ─── No Header ─────────────────────────────────────────────────────────────── */

export const NoHeader: Story = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(true);
    return (
      <>
        {/*
          * Uses Mantine compound Drawer API so aria-label lands on
          * Drawer.Content (the section[role="dialog"]) directly.
          * The simple <Drawer> form spreads HTML props to the outer root div,
          * not the content section, so the compound form is required here.
          * aria-label satisfies WCAG 4.1.2 / aria-dialog-name: a header-less
          * dialog must still have an accessible name.
          */}
        <MantineDrawer.Root opened={opened} onClose={close} position="right">
          <MantineDrawer.Overlay />
          <MantineDrawer.Content aria-label="Quick actions">
            <MantineDrawer.Body pt="md">
              <Stack gap="md">
                <Text>Drawer without header — press Escape or click the overlay to close.</Text>
                <Button variant="default" onClick={close}>
                  Close
                </Button>
              </Stack>
            </MantineDrawer.Body>
          </MantineDrawer.Content>
        </MantineDrawer.Root>
        {!opened && (
          <Group p="md">
            <Button variant="default" onClick={open}>
              Open Drawer
            </Button>
          </Group>
        )}
      </>
    );
  },
};

/* ─── No Overlay ────────────────────────────────────────────────────────────── */

export const NoOverlay: Story = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(true);
    return (
      <>
        <Drawer
          opened={opened}
          onClose={close}
          title="No overlay"
          withOverlay={false}
          trapFocus={false}
          closeOnClickOutside={false}
        >
          <Stack gap="md">
            <Text>This drawer has no backdrop overlay.</Text>
            <Button variant="default" onClick={close}>
              Close
            </Button>
          </Stack>
        </Drawer>
        {!opened && (
          <Group p="md">
            <Button variant="default" onClick={open}>
              Open Drawer
            </Button>
          </Group>
        )}
      </>
    );
  },
};

/* ─── With Scroll Content ───────────────────────────────────────────────────── */

export const WithScrollContent: Story = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(true);
    const lines = Array.from({ length: 30 }, (_, i) => (
      <Text key={i} size="sm">
        Scroll content line {i + 1}
      </Text>
    ));
    return (
      <>
        <Drawer opened={opened} onClose={close} title="Header is sticky">
          <Stack gap="xs">{lines}</Stack>
        </Drawer>
        {!opened && (
          <Group p="md">
            <Button variant="default" onClick={open}>
              Open Drawer
            </Button>
          </Group>
        )}
      </>
    );
  },
};
