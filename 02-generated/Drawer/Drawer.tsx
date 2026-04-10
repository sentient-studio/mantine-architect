import {
  Drawer as MantineDrawer,
  type DrawerProps as MantineDrawerProps,
} from '@mantine/core';
import classes from './Drawer.module.css';

export type DrawerProps = Omit<MantineDrawerProps, 'classNames'>;

/**
 * Drawer — thin wrapper around Mantine's Drawer with project-standard defaults.
 *
 * Applies classNames via the Styles API (content, header, title, body, close
 * slots) to match the Figma design. Defaults: position="right", size=400,
 * shadow="md", padding="md".
 *
 * For header-less drawers use the compound API (Drawer.Root + Drawer.Content)
 * so aria-label lands on the section[role="dialog"], not the outer root div.
 *
 * WCAG AA: body text must use gray.7 (7.45:1) — gray.6 (#868e96) fails at 3.15:1.
 */
export function Drawer({
  position = 'right',
  size = 400,
  shadow = 'md',
  padding = 'md',
  closeButtonProps,
  ...rest
}: DrawerProps) {
  return (
    <MantineDrawer
      position={position}
      size={size}
      shadow={shadow}
      padding={padding}
      closeButtonProps={{ 'aria-label': 'Close drawer', ...closeButtonProps }}
      classNames={{
        content: classes.content,
        header: classes.header,
        title: classes.title,
        body: classes.body,
        close: classes.close,
      }}
      {...rest}
    />
  );
}

export default Drawer;
