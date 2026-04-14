import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NavLink, Stack, Text, Box } from '@mantine/core';
import { Appshell } from './Appshell';

/*
 * NOTE: MantineProvider is NOT added here.
 * .storybook/preview.jsx already wraps every story in
 * <MantineProvider theme={{ primaryShade: 8 }}>.
 * Adding a second provider would reset primaryShade to 6 and break
 * WCAG AA contrast for the primary blue colour (blue.6 = 3.55:1 ❌ vs
 * blue.8 = 4.63:1 ✅).
 */

/* ─── Slot content helpers ─────────────────────────────────────────────────── */

function NavSlot() {
  return (
    <Stack p="md" gap={4}>
      {/* style override required: color="blue.9" sets the background correctly but
          Mantine resolves --nl-color to blue.6 regardless of the shade qualifier.
          Setting --nl-color directly gives #1864ab on #e8f0f7 ≈ 4.83:1 (WCAG AA ✅).
          Default (blue.8 via primaryShade:8) only reaches 4.39:1 on this background. */}
      <NavLink
        label="Dashboard"
        active
        style={{ '--nl-color': 'var(--mantine-color-blue-9)' } as React.CSSProperties}
      />
      <NavLink label="Projects" />
      <NavLink label="Team" />
      <NavLink label="Settings" />
    </Stack>
  );
}

function AsideSlot() {
  return (
    <Stack p="md" gap="sm">
      <Text fw={500} size="sm" c="gray.7">Activity</Text>
      <Box h={40} bg="gray.1" style={{ borderRadius: 'var(--mantine-radius-sm)' }} />
      <Box h={40} bg="gray.1" style={{ borderRadius: 'var(--mantine-radius-sm)' }} />
      <Box h={40} bg="gray.1" style={{ borderRadius: 'var(--mantine-radius-sm)' }} />
    </Stack>
  );
}

function MainContent() {
  return (
    <Stack p="md">
      <Text fw={500}>Main Content Area</Text>
      <Text size="sm" c="gray.7">
        The main area uses a gray.0 background matching the Figma specification.
        Navigation is in the sidebar; contextual widgets appear in the aside panel.
      </Text>
      <Box h={120} bg="white" style={{ borderRadius: 'var(--mantine-radius-sm)', border: 'rem(1px) solid var(--mantine-color-gray-3)' }} />
    </Stack>
  );
}

const meta: Meta<typeof Appshell> = {
  title: 'Components/Appshell',
  component: Appshell,
  tags: ['autodocs'],
  parameters: {
    // AppShell uses position: fixed — fullscreen fills the iframe viewport correctly.
    layout: 'fullscreen',
  },
  argTypes: {
    withAside: {
      control: 'boolean',
      description: 'Show the aside panel',
      table: { defaultValue: { summary: 'true' } },
    },
    withNavbar: {
      control: 'boolean',
      description: 'Show the navigation sidebar',
      table: { defaultValue: { summary: 'true' } },
    },
    headerHeight: {
      control: 'number',
      description: 'Header height in px',
      table: { defaultValue: { summary: '60' } },
    },
    footerHeight: {
      control: 'number',
      description: 'Footer height in px',
      table: { defaultValue: { summary: '60' } },
    },
    navbarWidth: {
      control: 'number',
      description: 'Navbar width in px',
      table: { defaultValue: { summary: '300' } },
    },
    asideWidth: {
      control: 'number',
      description: 'Aside panel width in px',
      table: { defaultValue: { summary: '300' } },
    },
    padding: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Main content area padding token',
      table: {
        defaultValue: { summary: 'md' },
        type: { summary: 'MantineSize' },
      },
    },
    // ReactNode slot props — not controllable via Storybook Controls
    header: { table: { disable: true } },
    navbar: { table: { disable: true } },
    aside: { table: { disable: true } },
    footer: { table: { disable: true } },
    children: { table: { disable: true } },
  },
};

export default meta;
type Story = StoryObj<typeof Appshell>;

/* ─── Showcase ────────────────────────────────────────────────────────────── */
/* Primary docs story — all 5 zones, all config props wired to Controls.     */

export const Showcase: Story = {
  args: {
    withAside: true,
    withNavbar: true,
    headerHeight: 60,
    footerHeight: 60,
    navbarWidth: 300,
    asideWidth: 300,
    padding: 'md',
  },
  render: (args) => (
    <Appshell
      {...args}
      header={<Text fw={600} size="md">My Application</Text>}
      navbar={<NavSlot />}
      aside={<AsideSlot />}
      footer={<Text size="sm" c="gray.7">Status: Ready</Text>}
    >
      <MainContent />
    </Appshell>
  ),
};

/* ─── WithoutAside ────────────────────────────────────────────────────────── */
/* 4-zone shell: header + navbar + main + footer. Aside panel hidden.        */

export const WithoutAside: Story = {
  render: () => (
    <Appshell
      withAside={false}
      header={<Text fw={600} size="md">My Application</Text>}
      navbar={<NavSlot />}
      footer={<Text size="sm" c="gray.7">Status: Ready</Text>}
    >
      <MainContent />
    </Appshell>
  ),
};

/* ─── WithoutNavbar ───────────────────────────────────────────────────────── */
/* 4-zone shell: header + main + aside + footer. Navbar and Burger hidden.   */

export const WithoutNavbar: Story = {
  render: () => (
    <Appshell
      withNavbar={false}
      header={<Text fw={600} size="md">My Application</Text>}
      aside={<AsideSlot />}
      footer={<Text size="sm" c="gray.7">Status: Ready</Text>}
    >
      <MainContent />
    </Appshell>
  ),
};

/* ─── Minimal ─────────────────────────────────────────────────────────────── */
/* 3-zone shell: header + main + footer only. No navbar, no aside.          */

export const Minimal: Story = {
  render: () => (
    <Appshell
      withNavbar={false}
      withAside={false}
      header={<Text fw={600} size="md">My Application</Text>}
      footer={<Text size="sm" c="gray.7">Status: Ready</Text>}
    >
      <MainContent />
    </Appshell>
  ),
};

/* ─── Open (Playwright fixture — hidden from docs) ────────────────────────── */
/* Full 5-zone shell in desktop layout state for axe and visual snapshot.   */
/* Placed after docs-visible stories so Showcase is the docs primary.       */

export const Open: Story = {
  parameters: {
    // Hidden from autodocs — used only as a Playwright fixture for testing.
    docs: { disable: true },
  },
  render: () => (
    <Appshell
      header={<Text fw={600} size="md">My Application</Text>}
      navbar={<NavSlot />}
      aside={<AsideSlot />}
      footer={<Text size="sm" c="gray.7">Status: Ready</Text>}
    >
      <MainContent />
    </Appshell>
  ),
};
