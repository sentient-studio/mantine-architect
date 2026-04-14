import React from 'react';
import {
  AppShell,
  Burger,
  Group,
  type MantineSize,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './Appshell.module.css';

export interface AppshellProps {
  /** Content rendered inside the header bar — caller supplies layout (Group, etc.) */
  header?: React.ReactNode;
  /** Content rendered inside the navigation sidebar */
  navbar?: React.ReactNode;
  /** Content rendered inside the aside panel */
  aside?: React.ReactNode;
  /** Content rendered inside the footer bar — caller supplies layout */
  footer?: React.ReactNode;
  /** Main content area (rendered inside AppShell.Main) */
  children: React.ReactNode;
  /** Show aside panel — default true; hides AppShell.Aside when false */
  withAside?: boolean;
  /** Show navbar — default true; hides AppShell.Navbar when false */
  withNavbar?: boolean;
  /** Header height in px — default 60 */
  headerHeight?: number;
  /** Footer height in px — default 60 */
  footerHeight?: number;
  /** Navbar width in px — default 300 */
  navbarWidth?: number;
  /** Aside width in px — default 300 */
  asideWidth?: number;
  /** Main content padding token — default 'md' */
  padding?: MantineSize;
}

/**
 * Appshell — responsive viewport-level layout shell wrapping Mantine's AppShell.
 *
 * Composes AppShell.Header, AppShell.Navbar, AppShell.Main, AppShell.Aside, and
 * AppShell.Footer into a 5-zone layout. Zone dimensions default to Figma spec
 * values (header/footer: 60px, navbar/aside: 300px); all are configurable via props.
 * Mobile Navbar collapse is managed internally via useDisclosure + Burger.
 *
 * withAside={false} omits the Aside zone; withNavbar={false} omits Navbar and
 * the mobile Burger toggle. Mantine's gray.3 zone dividers are applied natively
 * by each compound zone — no manual border CSS required.
 *
 * WCAG AA: Shell renders no text directly — consumer is responsible for content
 * contrast. HTML5 landmarks (header, nav, main, aside, footer) are provided by
 * Mantine natively. Burger carries aria-label="Toggle navigation".
 */
export function Appshell({
  header,
  navbar,
  aside,
  footer,
  children,
  withAside = true,
  withNavbar = true,
  headerHeight = 60,
  footerHeight = 60,
  navbarWidth = 300,
  asideWidth = 300,
  padding = 'md',
}: AppshellProps) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: headerHeight }}
      footer={{ height: footerHeight }}
      navbar={
        withNavbar
          ? { width: navbarWidth, breakpoint: 'sm', collapsed: { mobile: !opened } }
          : undefined
      }
      aside={
        withAside
          ? { width: asideWidth, breakpoint: 'sm', collapsed: { mobile: true } }
          : undefined
      }
      padding={padding}
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          {withNavbar && (
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
          )}
          {header}
        </Group>
      </AppShell.Header>

      {withNavbar && (
        <AppShell.Navbar>
          {navbar}
        </AppShell.Navbar>
      )}

      <AppShell.Main className={classes.main}>
        {children}
      </AppShell.Main>

      {withAside && (
        <AppShell.Aside>
          {aside}
        </AppShell.Aside>
      )}

      <AppShell.Footer>
        <Group h="100%" px="md">
          {footer}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}

Appshell.displayName = 'Appshell';

export default Appshell;
