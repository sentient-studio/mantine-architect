import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import type { Preview } from '@storybook/react';

export const globalTypes = {
  colorScheme: {
    name: 'Color scheme',
    description: 'Toggle Mantine light / dark mode',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light', title: 'Light', icon: 'sun' },
        { value: 'dark',  title: 'Dark',  icon: 'moon' },
      ],
      dynamicTitle: true,
    },
  },
};

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const colorScheme = (context.globals.colorScheme ?? 'light') as 'light' | 'dark';
      return (
        <MantineProvider theme={{ primaryShade: 8 }} forceColorScheme={colorScheme}>
          {/*
            Wrapper fills the full story canvas with the correct Mantine body colour
            so dark mode doesn't show a white bleed outside the component.
            padding: 0 — individual stories control their own spacing.
          */}
          <div
            data-mantine-color-scheme={colorScheme}
            style={{ minHeight: '100%', background: 'var(--mantine-color-body)' }}
          >
            <Story />
          </div>
        </MantineProvider>
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
    docs: {
      source: {
        // Mantine components carry displayName '@mantine/core/ComponentName'.
        // react-element-to-jsx-string uses displayName verbatim, so generated
        // code snippets contain invalid JSX like <@mantine/core/Text>.
        // Strip the '@scope/package/' prefix so snippets are valid JSX and can
        // be copied directly into Playroom.
        transform: (code: string) =>
          code.replace(/<(\/?|)@[\w-]+\/[\w-]+\//g, '<$1'),
      },
    },
  },
};

export default preview;
