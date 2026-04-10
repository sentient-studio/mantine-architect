import {
  Checkbox as MantineCheckbox,
  type CheckboxProps as MantineCheckboxProps,
  type MantineSize,
} from '@mantine/core';
import classes from './Checkbox.module.css';

export interface CheckboxProps extends Omit<MantineCheckboxProps, 'size'> {
  /** Controls size of the checkbox, label, and description text */
  size?: MantineSize;
}

/**
 * Checkbox — wraps Mantine Checkbox with Styles API customisation.
 *
 * Supports all Mantine Checkbox props:
 *   label, description, error, disabled, indeterminate, checked, defaultChecked,
 *   variant ("filled" | "outline"), labelPosition ("left" | "right"),
 *   radius, color, iconColor, autoContrast, icon, withErrorStyles,
 *   id, name, value, wrapperProps, rootRef, onChange, …
 *
 * size is forwarded to Mantine and also applied as data-size on the root element
 * so that the CSS custom-property size cascade works correctly.
 */
export function Checkbox({ size = 'md', wrapperProps, ...others }: CheckboxProps) {
  return (
    <MantineCheckbox
      {...others}
      size={size}
      wrapperProps={{ ...wrapperProps, 'data-size': size }}
      classNames={{
        root: classes.root,
        body: classes.body,
        inner: classes.inner,
        input: classes.input,
        icon: classes.icon,
        label: classes.label,
        description: classes.description,
        error: classes.error,
        labelWrapper: classes.labelWrapper,
      }}
    />
  );
}

export default Checkbox;
