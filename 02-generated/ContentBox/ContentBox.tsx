import React from 'react';
import { Box, UnstyledButton } from '@mantine/core';
import classes from './ContentBox.module.css';

export interface ContentBoxProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual and behavioural variant. 'default' renders a div; 'link' renders a button. */
  variant?: 'default' | 'link';
  /** Content to render inside the box */
  children?: React.ReactNode;
}

/**
 * ContentBox — a styled container with two behavioural variants.
 *
 * 'default' renders a static `<div>` with subtle hover feedback (gray.0 bg).
 * 'link' renders an `<UnstyledButton>` with cursor:pointer and interactive
 * hover styles (gray.1 bg), suitable for clickable card-like surfaces.
 *
 * Children are flex-centered; width is always 100% (responsive).
 * Tokens: padding=spacing.md (16px), radius=sm (4px), gap=0.
 *
 * WCAG AA: gray.9 text on transparent/white bg exceeds 10:1. No colour overrides needed.
 * Keyboard accessible: link variant renders as <button>, not <div onClick>.
 */
export function ContentBox({
  variant = 'default',
  children,
  className,
  ...rest
}: ContentBoxProps) {
  const rootClass = [classes.root, className].filter(Boolean).join(' ');

  if (variant === 'link') {
    return (
      <UnstyledButton
        className={rootClass}
        data-variant={variant}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </UnstyledButton>
    );
  }

  return (
    <Box
      className={rootClass}
      data-variant={variant}
      {...(rest as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </Box>
  );
}

ContentBox.displayName = 'ContentBox';

export default ContentBox;
