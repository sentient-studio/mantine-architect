import { TextInput as MantineInput, type TextInputProps } from '@mantine/core';
import classes from './TextInput.module.css';

export function TextInput({ label, error, description, ...others }: TextInputProps) {
  return (
    <MantineInput
      {...others}
      label={label}
      error={error}
      description={description}
      // CRITICAL: Mapping local classes to Mantine's internal Slots
      classNames={{
        root: classes.root,
        wrapper: classes.wrapper,
        input: classes.input,
        label: classes.label,
        error: classes.error,
        description: classes.description,
      }}
    />
  );
}

export default TextInput;