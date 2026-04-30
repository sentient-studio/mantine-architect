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

export function NavSlot() {
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

export function AsideSlot() {
  return (
    <Stack p="md" gap="sm">
      <Text fw={500} size="sm" c="gray.7">Activity</Text>
      <Box h={40} bg="gray.1" style={{ borderRadius: 'var(--mantine-radius-sm)' }} />
      <Box h={40} bg="gray.1" style={{ borderRadius: 'var(--mantine-radius-sm)' }} />
      <Box h={40} bg="gray.1" style={{ borderRadius: 'var(--mantine-radius-sm)' }} />
    </Stack>
  );
}

export function MainContent() {
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
      description:
        'Header height in px or a responsive object: `{ base: 50, lg: 60 }` — ' +
        'Mantine generates `@media (min-width: ...)` `:root` rules for each breakpoint.',
      table: {
        defaultValue: { summary: '60' },
        type: { summary: 'number | string | { base?: number | string; sm?: …; lg?: …; … }' },
      },
    },
    footerHeight: {
      control: 'number',
      description:
        'Footer height in px or a responsive object: `{ base: 50, lg: 60 }` — ' +
        'Mantine generates `@media (min-width: ...)` `:root` rules for each breakpoint.',
      table: {
        defaultValue: { summary: '60' },
        type: { summary: 'number | string | { base?: number | string; sm?: …; lg?: …; … }' },
      },
    },
    navbarWidth: {
      control: 'number',
      description:
        'Navbar width in px or a responsive object: `{ base: 200, lg: 300 }` — ' +
        'Mantine generates `@media (min-width: ...)` `:root` rules for each breakpoint.',
      table: {
        defaultValue: { summary: '300' },
        type: { summary: 'number | string | { base?: number | string; sm?: …; lg?: …; … }' },
      },
    },
    asideWidth: {
      control: 'number',
      description:
        'Aside panel width in px or a responsive object: `{ base: 200, lg: 300 }` — ' +
        'Mantine generates `@media (min-width: ...)` `:root` rules for each breakpoint.',
      table: {
        defaultValue: { summary: '300' },
        type: { summary: 'number | string | { base?: number | string; sm?: …; lg?: …; … }' },
      },
    },
    padding: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description:
        'Main content padding. Single token applies to all breakpoints. ' +
        'Pass a responsive object for per-breakpoint control: ' +
        '`{ base: "xs", sm: "md", lg: "xl" }` — Mantine generates @media :root rules.',
      table: {
        defaultValue: { summary: 'md' },
        type: { summary: "MantineSize | { base?: MantineSize; sm?: MantineSize; lg?: MantineSize; … }" },
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
    // key forces a full remount when layout-critical props change.
    // Mantine's AppShell injects --app-shell-padding (and zone dimensions) into
    // a :root <style> tag once on mount and does not patch it on re-render.
    // Without the key, changing padding/heights/widths in Controls has no effect.
    <Appshell
      key={JSON.stringify([args.padding, args.headerHeight, args.footerHeight, args.navbarWidth, args.asideWidth])}
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

/* ─── ResponsiveZones (Playwright fixture — hidden from docs) ────────────── */
/* Navbar collapses from 300px → 200px and header from 60px → 50px at <lg.   */

export const ResponsiveZones: Story = {
  parameters: {
    // Hidden from autodocs — used only as a Playwright fixture for testing.
    docs: { disable: true },
  },
  render: () => (
    <Appshell
      navbarWidth={{ base: 200, lg: 300 }}
      headerHeight={{ base: 50, lg: 60 }}
      header={<Text fw={600} size="md">My Application</Text>}
      navbar={<NavSlot />}
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
