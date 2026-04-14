import React from 'react';
import {
  AppShell,
  Burger,
  Group,
  type MantineSize,
  type MantineSpacing,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './Appshell.module.css';

/**
 * Responsive padding type — mirrors Mantine's AppShell `padding` prop.
 * Pass a single MantineSize for all breakpoints, or an object for per-breakpoint
 * control: `{ base: 'xs', sm: 'md', lg: 'xl' }`.
 * Mantine generates `@media (min-width: ...)` :root rules for each breakpoint.
 */
export type AppshellPadding = MantineSpacing | Partial<Record<MantineSize, MantineSpacing>>;

/**
 * Zone size — mirrors Mantine's internal AppShellSize.
 * Accepts a px number (e.g. 300) or any CSS length string (e.g. '25%', '20rem').
 */
export type AppshellZoneSize = number | (string & {});

/**
 * Responsive zone size — mirrors Mantine's internal AppShellResponsiveSize.
 * AppShellResponsiveSize is not re-exported from @mantine/core's public barrel;
 * this local mirror avoids deep internal imports.
 * Mantine generates `@media (min-width: ...)` :root rules for each key present.
 *
 * @example `{ base: 200, lg: 300 }` → 200px default, 300px at ≥75em (lg)
 */
export type AppshellResponsiveSize = Partial<
  Record<'base' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', AppshellZoneSize>
>;

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
  /** Header height in px or responsive: `{ base: 50, lg: 60 }` — default 60 */
  headerHeight?: AppshellZoneSize | AppshellResponsiveSize;
  /** Footer height in px or responsive: `{ base: 50, lg: 60 }` — default 60 */
  footerHeight?: AppshellZoneSize | AppshellResponsiveSize;
  /** Navbar width in px or responsive: `{ base: 200, lg: 300 }` — default 300 */
  navbarWidth?: AppshellZoneSize | AppshellResponsiveSize;
  /** Aside width in px or responsive: `{ base: 200, lg: 300 }` — default 300 */
  asideWidth?: AppshellZoneSize | AppshellResponsiveSize;
  /** Main content padding. Single token ('md') applies to all breakpoints.
   *  Pass a responsive object for per-breakpoint control:
   *  `{ base: 'xs', sm: 'md', lg: 'xl' }` — Mantine generates @media rules. */
  padding?: AppshellPadding;
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
 * padding accepts a single MantineSize or a responsive object
 * ({ base: 'xs', sm: 'md', lg: 'xl' }) — Mantine generates @media :root rules.
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
