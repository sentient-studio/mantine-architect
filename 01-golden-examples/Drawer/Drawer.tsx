import {
  Drawer as MantineDrawer,
  type DrawerProps as MantineDrawerProps,
} from '@mantine/core';
import classes from './Drawer.module.css';

export type DrawerProps = Omit<MantineDrawerProps, 'classNames'>;

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
