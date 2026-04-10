import React from 'react';
import {
  Badge as MantineBadge,
  type BadgeProps as MantineBadgeProps,
  type MantineColor,
  type MantineGradient,
  type MantineRadius,
  type MantineSize,
} from '@mantine/core';
import classes from './Badge.module.css';

export interface BadgeProps
  extends Omit<MantineBadgeProps, 'classNames' | 'variant'> {
  /** Main badge content */
  children?: React.ReactNode;
  /** Visual style variant */
  variant?: 'filled' | 'outline' | 'light' | 'dot' | 'transparent' | 'white' | 'gradient';
  /** Key of theme.colors or any valid CSS color */
  color?: MantineColor;
  /** Controls font-size, height and horizontal padding */
  size?: MantineSize;
  /** Key of theme.radius or any valid CSS value to set border-radius */
  radius?: MantineRadius | number;
  /** If set, badge min-width becomes equal to its height; horizontal padding is removed */
  circle?: boolean;
  /** Determines whether Badge should take 100% of its parent width */
  fullWidth?: boolean;
  /** Gradient configuration used when variant="gradient" */
  gradient?: MantineGradient;
  /** If set, adjusts text color based on background color for filled variant */
  autoContrast?: boolean;
  /** Content displayed on the left side of the badge label */
  leftSection?: React.ReactNode;
  /** Content displayed on the right side of the badge label */
  rightSection?: React.ReactNode;
}

/**
 * Badge — Styles API wrapper around Mantine's Badge.
 *
 * All props from the Mantine Badge API are supported:
 *   variant, color, size, radius, circle, fullWidth, gradient,
 *   autoContrast, leftSection, rightSection.
 *
 * data-size is forwarded explicitly so CSS and Playwright can
 * target the current size without relying on Mantine internals.
 *
 * WCAG AA colour note: primaryShade:8 handles blue (4.63:1).
 * For other filled colours that fail 4.5:1, callers must override
 * --badge-bg inline. Never use green/yellow/orange in filled demos.
 */
export function Badge({
  children,
  variant = 'filled',
  color = 'blue',
  size = 'md',
  radius = 'xl',
  circle,
  fullWidth,
  gradient,
  autoContrast,
  leftSection,
  rightSection,
  ...others
}: BadgeProps) {
  return (
    <MantineBadge
      variant={variant}
      color={color}
      size={size}
      radius={radius}
      circle={circle || undefined}
      fullWidth={fullWidth || undefined}
      gradient={gradient}
      autoContrast={autoContrast}
      leftSection={leftSection}
      rightSection={rightSection}
      data-size={size}
      classNames={{
        root: classes.root,
        section: classes.section,
        label: classes.label,
      }}
      {...others}
    >
      {children}
    </MantineBadge>
  );
}

export default Badge;
