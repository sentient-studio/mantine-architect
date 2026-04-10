import {
  Select as MantineSelect,
  Box,
  type SelectProps,
  type MantineSize,
} from '@mantine/core';
import classes from './Select.module.css';

export interface CustomSelectProps extends Omit<SelectProps, 'size'> {
  /** Controls input height, padding, and font-size. Defaults to 'md'. */
  size?: MantineSize;
}

/**
 * Select — Styles API wrapper around Mantine's Select with size cascade.
 *
 * Wraps MantineSelect in a Box root so data-size can be set on a stable
 * outer element (Mantine v7's Combobox-based Select sets data-size on
 * multiple internal elements, making [data-size] locators ambiguous).
 *
 * size is forwarded to MantineSelect and also set as data-size on the Box root
 * so CSS custom-property cascade and Playwright locators (.mantine-Select-root[data-size])
 * work correctly.
 *
 * WCAG AA: primaryShade:8 handles blue (4.63:1). Error text must use red.9
 * (5.12:1) — red.6 (#fa5252) fails at ~3.5:1.
 */
export function Select({ size = 'md', ...others }: CustomSelectProps) {
  return (
    <Box className={classes.root} data-size={size}>
      <MantineSelect
        {...others}
        size={size}
        classNames={{
          wrapper: classes.wrapper,
          input: classes.input,
          label: classes.label,
          error: classes.error,
          description: classes.description,
          section: classes.section,
          dropdown: classes.dropdown,
          option: classes.option,
        }}
      />
    </Box>
  );
}

export default Select;
