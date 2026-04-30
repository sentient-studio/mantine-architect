import React from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

/**
 * Wraps every Playroom frame in a MantineProvider with project-standard theme.
 * primaryShade: 8 matches Storybook's global preview — blue.8 = 4.63:1 (WCAG AA).
 */
export default function FrameComponent({ children }) {
  return (
    <MantineProvider theme={{ primaryShade: 8 }}>
      {children}
    </MantineProvider>
  );
}
