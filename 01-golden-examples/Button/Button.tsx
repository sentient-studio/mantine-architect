import { Box, UnstyledButton, Loader, type BoxProps, type ElementProps } from '@mantine/core';
import classes from './Button.module.css';

export interface ButtonProps extends BoxProps, ElementProps<'button'> {
  variant?: 'filled' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({
  variant = 'filled',
  size = 'sm',
  loading,
  disabled,
  leftSection,
  rightSection,
  children,
  ...others
}: ButtonProps) {
  return (
    <UnstyledButton
      {...others}
      className={classes.root}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      data-disabled={disabled || undefined}
      data-with-left-section={!!leftSection || undefined}
      data-with-right-section={!!rightSection || undefined}
      disabled={disabled || loading}
    >
      {/* This "inner" div is required by your CSS for the loading transform logic */}
      <span className={classes.inner}>
        {leftSection && <span className={classes.section} data-position="left">{leftSection}</span>}
        <span className={classes.label}>{children}</span>
        {rightSection && <span className={classes.section} data-position="right">{rightSection}</span>}
      </span>

      {loading && (
        <span className={classes.loader}>
          <Loader size="xs" color="currentColor" />
        </span>
      )}
    </UnstyledButton>
  );
}

export default Button;