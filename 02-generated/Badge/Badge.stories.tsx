import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Group, Stack } from '@mantine/core';
import { IconStar, IconCheck, IconX } from '@tabler/icons-react';
import { Badge } from './Badge';

/*
 * NOTE: MantineProvider is NOT added here.
 * .storybook/preview.jsx already wraps every story in
 * <MantineProvider theme={{ primaryShade: 8 }}>.
 * Adding a second provider would reset primaryShade to 6 and break
 * WCAG AA contrast for the primary blue colour (blue.6 = 3.55:1 ❌ vs
 * blue.8 = 4.63:1 ✅).
 */

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['filled', 'light', 'outline', 'dot', 'transparent', 'white', 'gradient'],
      description: 'Visual style variant',
      table: { type: { summary: "'filled' | 'light' | 'outline' | 'dot' | 'transparent' | 'white' | 'gradient'" }, defaultValue: { summary: 'filled' } },
    },
    color: {
      control: 'text',
      description: 'Key of theme.colors or any valid CSS color',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Controls font-size, height and horizontal padding',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'md' } },
    },
    radius: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Border radius key from theme.radius',
      table: { type: { summary: 'MantineSize' }, defaultValue: { summary: 'xl' } },
    },
    circle: {
      control: 'boolean',
      description: 'Equal width/height — removes horizontal padding',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Span full width of parent element',
    },
    autoContrast: {
      control: 'boolean',
      description: 'Adjusts text colour based on background (filled variant only)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

/* ─── Default ─────────────────────────────────────────────────────────────── */

export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'filled',
    color: 'blue',
    size: 'md',
  },
};

/* ─── Variants ─────────────────────────────────────────────────────────────── */

export const Variants: Story = {
  render: () => (
    <Group>
      <Badge variant="filled" color="blue">Filled</Badge>
      {/*
       * light variant: blue.8 on blue.0 background ≈ 4.39:1 (fails WCAG AA).
       * Override --badge-color to blue.9 (5.94:1) to pass.
       */}
      <Badge
        variant="light"
        color="blue"
        style={{ '--badge-color': 'var(--mantine-color-blue-9)' } as React.CSSProperties}
      >
        Light
      </Badge>
      <Badge variant="outline" color="blue">Outline</Badge>
      <Badge variant="dot" color="blue">Dot</Badge>
      <Badge variant="transparent" color="blue">Transparent</Badge>
      <Badge variant="white" color="blue">White</Badge>
    </Group>
  ),
};

/* ─── Gradient ─────────────────────────────────────────────────────────────── */

export const Gradient: Story = {
  render: () => (
    <Group>
      <Badge variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 90 }}>
        Blue → Cyan
      </Badge>
      <Badge variant="gradient" gradient={{ from: 'violet', to: 'grape', deg: 135 }}>
        Violet → Grape
      </Badge>
      <Badge variant="gradient" gradient={{ from: 'indigo', to: 'blue', deg: 45 }}>
        Indigo → Blue
      </Badge>
    </Group>
  ),
};

/* ─── Colors ───────────────────────────────────────────────────────────────── */
/*
 * WCAG AA (4.5:1) on white at 11–14px font, bold weight:
 *   blue   → primaryShade:8 via MantineProvider → 4.63:1 ✅ no override needed
 *   red    → red.9 (#c92a2a) = 5.12:1 ✅ override --badge-bg
 *   teal   → teal.9 (#087f5b) = 4.53:1 ✅ override --badge-bg
 *   grape  → grape.8 (#862e9c) passes ✅ no override needed
 *   indigo → indigo.8 (#3b5bdb) passes ✅ override --badge-bg
 *   violet → violet.8 (#6741d9) passes ✅ no override needed
 *
 *   Omitted — cannot pass 4.5:1 with white text at any Mantine shade:
 *     green, yellow, orange
 */
export const Colors: Story = {
  render: () => (
    <Group>
      <Badge color="blue">Blue</Badge>
      <Badge
        color="red"
        style={{ '--badge-bg': 'var(--mantine-color-red-9)' } as React.CSSProperties}
      >
        Red
      </Badge>
      <Badge
        color="teal"
        style={{ '--badge-bg': 'var(--mantine-color-teal-9)' } as React.CSSProperties}
      >
        Teal
      </Badge>
      <Badge color="grape">Grape</Badge>
      <Badge
        color="indigo"
        style={{ '--badge-bg': 'var(--mantine-color-indigo-8)' } as React.CSSProperties}
      >
        Indigo
      </Badge>
      <Badge color="violet">Violet</Badge>
    </Group>
  ),
};

/* ─── Sizes ─────────────────────────────────────────────────────────────────── */

export const Sizes: Story = {
  render: () => (
    <Stack align="flex-start" gap="sm">
      <Badge size="xs">Extra Small</Badge>
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
      <Badge size="xl">Extra Large</Badge>
    </Stack>
  ),
};

/* ─── Circle ────────────────────────────────────────────────────────────────── */

export const Circle: Story = {
  render: () => (
    <Group>
      <Badge size="xs" circle>1</Badge>
      <Badge size="sm" circle>7</Badge>
      <Badge size="md" circle>9</Badge>
      <Badge size="lg" circle>3</Badge>
      <Badge size="xl" circle>8</Badge>
    </Group>
  ),
};

/* ─── With Sections ─────────────────────────────────────────────────────────── */

export const WithSections: Story = {
  render: () => (
    <Stack align="flex-start" gap="sm">
      <Badge leftSection={<IconStar size={10} />}>With left icon</Badge>
      <Badge rightSection={<IconCheck size={10} />}>With right icon</Badge>
      <Badge
        leftSection={<IconStar size={10} />}
        rightSection={<IconX size={10} />}
      >
        Both sections
      </Badge>
    </Stack>
  ),
};

/* ─── Full Width ─────────────────────────────────────────────────────────────── */

export const FullWidth: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Badge fullWidth>Full width badge</Badge>
    </div>
  ),
};

/* ─── Showcase ───────────────────────────────────────────────────────────────── */

export const Showcase: Story = {
  render: () => (
    <Stack gap="md" align="flex-start">
      <Group>
        <Badge variant="filled">Filled</Badge>
        {/* light variant: blue.8 on blue.0 bg ≈ 4.39:1 — override text to blue.9 */}
        <Badge
          variant="light"
          style={{ '--badge-color': 'var(--mantine-color-blue-9)' } as React.CSSProperties}
        >
          Light
        </Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="dot">Dot</Badge>
        <Badge variant="transparent">Transparent</Badge>
      </Group>
      <Group>
        <Badge size="xs" variant="filled">XS</Badge>
        <Badge size="sm" variant="filled">SM</Badge>
        <Badge size="md" variant="filled">MD</Badge>
        <Badge size="lg" variant="filled">LG</Badge>
        <Badge size="xl" variant="filled">XL</Badge>
      </Group>
      <Group>
        <Badge leftSection={<IconStar size={10} />}>Featured</Badge>
        {/* light variant: blue.8 on blue.0 bg ≈ 4.39:1 — override text to blue.9 */}
        <Badge
          rightSection={<IconCheck size={10} />}
          variant="light"
          color="blue"
          style={{ '--badge-color': 'var(--mantine-color-blue-9)' } as React.CSSProperties}
        >
          Verified
        </Badge>
        <Badge variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 90 }}>
          Gradient
        </Badge>
      </Group>
    </Stack>
  ),
};
