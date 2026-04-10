import {
  Modal as MantineModal,
  type ModalProps as MantineModalProps,
} from '@mantine/core';
import classes from './Modal.module.css';

export type ModalProps = Omit<MantineModalProps, 'classNames'>;

/**
 * Modal — thin wrapper around Mantine's Modal with project-standard defaults.
 *
 * Applies classNames via the Styles API (content, header, title slots) to set
 * a gray.0 background matching the Figma design (Mantine default is white).
 * Defaults: radius="sm", shadow="xl", padding="md".
 *
 * For header-less dialogs use the compound API (Modal.Root + Modal.Content)
 * so aria-label lands on the section[role="dialog"], not the outer root div.
 *
 * WCAG AA: primaryShade:8 covers blue (4.63:1). Footer body text must use
 * gray.7 (7.45:1) — gray.6 (#868e96) fails at 3.15:1.
 */
export function Modal({
  radius = 'sm',
  shadow = 'xl',
  padding = 'md',
  closeButtonProps,
  ...rest
}: ModalProps) {
  return (
    <MantineModal
      radius={radius}
      shadow={shadow}
      padding={padding}
      closeButtonProps={{ 'aria-label': 'Close modal', ...closeButtonProps }}
      classNames={{
        content: classes.content,
        header: classes.header,
        title: classes.title,
      }}
      {...rest}
    />
  );
}

export default Modal;
