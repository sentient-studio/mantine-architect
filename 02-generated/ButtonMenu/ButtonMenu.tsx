import React from 'react';
import { Menu, UnstyledButton, Loader, type MantineSize } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import classes from './ButtonMenu.module.css';

export interface ButtonMenuItem {
  /** Unique key and callback identifier */
  value: string;
  /** Display text */
  label: string;
  /** Optional leftSection — pass a Tabler icon element */
  icon?: React.ReactNode;
  /** Item-specific click handler */
  onClick?: () => void;
  /** Item-level disabled state */
  disabled?: boolean;
}

export interface ButtonMenuProps {
  /** Button label text */
  label?: string;
  /** Menu item definitions */
  items: ButtonMenuItem[];
  /** Fires on any item click with item.value */
  onItemClick?: (value: string) => void;
  /** Disables the trigger button */
  disabled?: boolean;
  /** Shows Loader overlay, also disables button */
  loading?: boolean;
  /** Button size — controls height, font-size, and padding */
  size?: MantineSize;
  /** Internal: pre-open the menu (for Playwright fixture stories) */
  defaultOpened?: boolean;
}

const iconSizes: Record<MantineSize, number> = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 };

/**
 * ButtonMenu — styled trigger button that opens a Mantine Menu dropdown.
 *
 * Composes an UnstyledButton trigger with a Mantine Menu panel. Dropdown width
 * matches the trigger via `width="target"`, positioned bottom-start with a 4px
 * offset (matching Figma). Items are caller-supplied via the `items` prop; each
 * item supports an optional Tabler icon in the leftSection.
 *
 * State: `data-disabled` and `data-loading` drive CSS. Loading renders a
 * centered Loader overlay and fades the inner content via `opacity: 0`.
 *
 * WCAG AA: button bg = blue.8 (#1971c2, 4.63:1 on white ✅). Hover: blue.9
 * (#1864ab, 5.26:1 ✅). font-weight=400 per Figma Regular specification.
 * Disabled contrast is intentionally low — WCAG 1.4.3 exempts inactive UI.
 */
export function ButtonMenu({
  label = 'Create new',
  items,
  onItemClick,
  disabled = false,
  loading = false,
  size = 'md',
  defaultOpened,
}: ButtonMenuProps) {
  return (
    <Menu
      width="target"
      shadow="xs"
      radius="sm"
      offset={4}
      position="bottom-start"
      withBorder
      defaultOpened={defaultOpened}
    >
      <Menu.Target>
        <UnstyledButton
          className={classes.root}
          data-size={size}
          data-disabled={disabled || undefined}
          data-loading={loading || undefined}
          disabled={disabled || loading}
        >
          <span className={classes.inner}>
            <span className={classes.label}>{label}</span>
            <IconChevronDown
              size={iconSizes[size]}
              className={classes.chevron}
              aria-hidden
            />
          </span>
          {loading && (
            <span className={classes.loader}>
              <Loader size="xs" color="currentColor" />
            </span>
          )}
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown keepMounted>
        {items.map((item) => (
          <Menu.Item
            key={item.value}
            leftSection={item.icon}
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.();
              onItemClick?.(item.value);
            }}
          >
            {item.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

ButtonMenu.displayName = 'ButtonMenu';

export default ButtonMenu;
