import {
  MultiSelect as MantineMultiSelect,
  Box,
  type MultiSelectProps,
  type MantineSize,
} from '@mantine/core';
import classes from './MultiSelect.module.css';

export interface CustomMultiSelectProps extends Omit<MultiSelectProps, 'size'> {
  /** Controls input min-height, pill font-size, and spacing. Defaults to 'md'. */
  size?: MantineSize;
}

/**
 * MultiSelect — Styles API wrapper around Mantine's MultiSelect with size cascade.
 *
 * Wraps MantineMultiSelect in a Box root so data-size can be set on a stable
 * outer element — Mantine sets data-size on the wrapper, input, and chevron,
 * making bare [data-size] selectors match 3+ elements per instance.
 *
 * size is forwarded to MantineMultiSelect and also set as data-size on the Box
 * root. CSS uses min-height (not height) so the input grows as pills wrap.
 * Pills background: gray.1 light / dark-5 dark (Figma token match).
 *
 * WCAG AA: primaryShade:8 handles blue (4.63:1). Error text must use red.9;
 * never use red.6 (#fa5252, ~3.5:1) for text.
 */
export function MultiSelect({ size = 'md', ...others }: CustomMultiSelectProps) {
  return (
    <Box className={classes.root} data-size={size}>
      <MantineMultiSelect
        {...others}
        size={size}
        classNames={{
          wrapper: classes.wrapper,
          input: classes.input,
          label: classes.label,
          required: classes.required,
          error: classes.error,
          description: classes.description,
          section: classes.section,
          dropdown: classes.dropdown,
          option: classes.option,
          pill: classes.pill,
          pillsList: classes.pillsList,
          inputField: classes.inputField,
        }}
      />
    </Box>
  );
}

export default MultiSelect;
