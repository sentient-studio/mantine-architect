import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Group, Stack, Text } from '@mantine/core';
import { IconBox } from '@tabler/icons-react';
import { ContentBox } from './ContentBox';

/*
 * NOTE: MantineProvider is NOT added here.
 * .storybook/preview.jsx already wraps every story in
 * <MantineProvider theme={{ primaryShade: 8 }}>.
 * Adding a second provider would reset primaryShade to 6 and break
 * WCAG AA contrast for the primary blue colour (blue.6 = 3.55:1 ❌ vs
 * blue.8 = 4.63:1 ✅).
 */

const meta: Meta<typeof ContentBox> = {
  title: 'Components/ContentBox',
  component: ContentBox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'link'],
      description: "Visual and behavioural variant. 'default' renders a div; 'link' renders a button.",
      defaultValue: 'default',
    },
    onClick: {
      // onClick is inherited from React.HTMLAttributes — hide from Controls panel
      // to avoid an orphaned control. Wire it in story args directly when needed.
      table: { disable: true },
    },
    children: {
      control: 'text',
      description: 'Content to render inside the box',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ContentBox>;

/* ─── Default ─────────────────────────────────────────────────────────────── */

export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Box lets you compose content inside a styled container.',
  },
};

/* ─── Link ────────────────────────────────────────────────────────────────── */

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Click me — this ContentBox renders as a <button> for keyboard operability.',
  },
};

/* ─── WithRichContent ─────────────────────────────────────────────────────── */

export const WithRichContent: Story = {
  render: () => (
    <ContentBox variant="default" style={{ maxWidth: '400px' }}>
      <Group gap="sm">
        <IconBox size={20} />
        <Text size="sm" fw={500}>Rich content composability</Text>
      </Group>
    </ContentBox>
  ),
};

/* ─── Showcase ────────────────────────────────────────────────────────────── */

export const Showcase: Story = {
  render: () => (
    <Stack gap="md" style={{ width: '400px' }}>
      <ContentBox variant="default">
        Default ContentBox — static container
      </ContentBox>
      <ContentBox variant="link" onClick={() => {}}>
        Link ContentBox — interactive button surface
      </ContentBox>
      <ContentBox variant="default">
        <Group gap="sm">
          <IconBox size={20} />
          <Text size="sm" fw={500}>Composable children</Text>
        </Group>
      </ContentBox>
    </Stack>
  ),
};
