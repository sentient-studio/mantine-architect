import { Box, UnstyledButton, Loader, type BoxProps, type ElementProps, type MantineRadius } from '@mantine/core';
import classes from './Button.module.css';

const MANTINE_SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
const toRadiusVar = (r: MantineRadius): string =>
  typeof r === 'number' ? `${r}px` : MANTINE_SIZES.has(r) ? `var(--mantine-radius-${r})` : (r as string);

export interface ButtonProps extends BoxProps, ElementProps<'button'> {
  variant?: 'filled' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Corner radius — accepts Mantine size tokens ('xs'–'xl'), a pixel number, or any CSS length */
  radius?: MantineRadius;
  loading?: boolean;
  disabled?: boolean;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({
  variant = 'filled',
  size = 'sm',
  radius,
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
      data-radius={radius}
      data-loading={loading || undefined}
      data-disabled={disabled || undefined}
      data-with-left-section={!!leftSection || undefined}
      data-with-right-section={!!rightSection || undefined}
      disabled={disabled || loading}
      style={radius !== undefined ? { '--button-radius': toRadiusVar(radius) } as React.CSSProperties : undefined}
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