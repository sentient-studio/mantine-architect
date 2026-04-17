import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mantine/core';
import {
  IconBoxSeam,
  IconSquareCheck,
  IconUsers,
  IconCalendar,
} from '@tabler/icons-react';
import { ButtonMenu, type ButtonMenuItem } from './ButtonMenu';

/*
 * NOTE: MantineProvider is NOT added here.
 * .storybook/preview.jsx already wraps every story in
 * <MantineProvider theme={{ primaryShade: 8 }}>.
 * Adding a second provider would reset primaryShade to 6 and break
 * WCAG AA contrast for the primary blue colour (blue.6 = 3.55:1 ❌ vs
 * blue.8 = 4.63:1 ✅).
 */

const defaultItems: ButtonMenuItem[] = [
  { value: 'project', label: 'Project', icon: <IconBoxSeam size={16} /> },
  { value: 'task', label: 'Task', icon: <IconSquareCheck size={16} /> },
  { value: 'team', label: 'Team', icon: <IconUsers size={16} /> },
  { value: 'event', label: 'Event', icon: <IconCalendar size={16} /> },
];

const meta: Meta<typeof ButtonMenu> = {
  title: 'Components/ButtonMenu',
  component: ButtonMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Button label text',
      table: { defaultValue: { summary: 'Create new' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the trigger button',
      table: { defaultValue: { summary: 'false' } },
    },
    loading: {
      control: 'boolean',
      description: 'Shows Loader overlay and disables the button',
      table: { defaultValue: { summary: 'false' } },
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Button size — controls height, font-size, and padding',
      table: {
        defaultValue: { summary: 'md' },
        type: { summary: 'MantineSize' },
      },
    },
    radius: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Corner radius — accepts Mantine size tokens, a pixel number, or any CSS length',
      table: {
        defaultValue: { summary: 'sm' },
        type: { summary: 'MantineRadius' },
      },
    },
    items: {
      control: false,
      description: 'Array of ButtonMenuItem definitions',
    },
    onItemClick: {
      table: { disable: true },
    },
    defaultOpened: {
      table: { disable: true },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ButtonMenu>;

/* ─── Default ─────────────────────────────────────────────────────────────── */

export const Default: Story = {
  args: {
    label: 'Create new',
    items: defaultItems,
    size: 'md',
  },
};

/* ─── Showcase ────────────────────────────────────────────────────────────── */

export const Showcase: Story = {
  args: {
    label: 'Create new',
    items: defaultItems,
    size: 'md',
    disabled: false,
    loading: false,
  },
};

/* ─── WithoutIcons ────────────────────────────────────────────────────────── */

export const WithoutIcons: Story = {
  args: {
    label: 'Add item',
    items: [
      { value: 'project', label: 'Project' },
      { value: 'task', label: 'Task' },
      { value: 'team', label: 'Team' },
      { value: 'event', label: 'Event' },
    ],
    size: 'md',
  },
};

/* ─── Disabled ────────────────────────────────────────────────────────────── */

export const Disabled: Story = {
  args: {
    label: 'Create new',
    items: defaultItems,
    disabled: true,
    size: 'md',
  },
  parameters: {
    // Disabled state intentionally has low contrast — WCAG 1.4.3 exempts
    // inactive UI components from contrast requirements.
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
};

/* ─── Sizes ────────────────────────────────────────────────────────────────── */

export const Sizes: Story = {
  render: () => (
    <Stack gap="md" align="flex-start">
      <ButtonMenu label="Create new (xs)" items={defaultItems} size="xs" />
      <ButtonMenu label="Create new (sm)" items={defaultItems} size="sm" />
      <ButtonMenu label="Create new (md)" items={defaultItems} size="md" />
      <ButtonMenu label="Create new (lg)" items={defaultItems} size="lg" />
      <ButtonMenu label="Create new (xl)" items={defaultItems} size="xl" />
    </Stack>
  ),
};

/* ─── Radii ────────────────────────────────────────────────────────────────── */

export const Radii: Story = {
  render: () => (
    <Stack gap="md" align="flex-start">
      <ButtonMenu label="Radius xs" items={defaultItems} radius="xs" />
      <ButtonMenu label="Radius sm (default)" items={defaultItems} radius="sm" />
      <ButtonMenu label="Radius md" items={defaultItems} radius="md" />
      <ButtonMenu label="Radius lg" items={defaultItems} radius="lg" />
      <ButtonMenu label="Radius xl" items={defaultItems} radius="xl" />
      <ButtonMenu label="Radius 0 (square)" items={defaultItems} radius={0} />
    </Stack>
  ),
};

/* ─── Open (Playwright fixture — hidden from docs) ─────────────────────────── */
/* Placed after docs-visible stories so Showcase/Default is the docs primary. */

export const Open: Story = {
  args: {
    label: 'Create new',
    items: defaultItems,
    size: 'md',
    defaultOpened: true,
  },
  parameters: {
    // Hidden from autodocs — used only as a Playwright fixture to pre-open the menu.
    docs: { disable: true },
    a11y: {
      config: {
        rules: [
          {
            // Mantine v7 injects a <div tabindex="-1" data-autofocus> as the first
            // child of role="menu" for internal focus management. axe flags it because
            // menu only permits menuitem/menuitemcheckbox/menuitemradio children.
            // This is a Mantine internal — not fixable at the component level.
            id: 'aria-required-children',
            enabled: false,
          },
        ],
      },
    },
  },
};
