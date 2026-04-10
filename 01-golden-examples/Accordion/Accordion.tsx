import { Accordion as MantineAccordion, type MantineSize } from '@mantine/core';
import type { ReactNode } from 'react';
import classes from './Accordion.module.css';

export interface AccordionItem {
  value: string;
  label: ReactNode;
  children: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  size?: MantineSize;
  variant?: 'default' | 'contained' | 'filled' | 'separated';
  chevronPosition?: 'left' | 'right';
  defaultValue?: string | null;
}

export function Accordion({
  items,
  size = 'md',
  variant = 'default',
  chevronPosition = 'right',
  defaultValue,
}: AccordionProps) {
  return (
    <MantineAccordion
      data-size={size}
      classNames={{
        root: classes.root,
        item: classes.item,
        control: classes.control,
        chevron: classes.chevron,
        label: classes.label,
        panel: classes.panel,
        content: classes.content,
      }}
      size={size}
      variant={variant}
      chevronPosition={chevronPosition}
      defaultValue={defaultValue}
    >
      {items.map(({ value, label, children }) => (
        <MantineAccordion.Item key={value} value={value}>
          <MantineAccordion.Control>{label}</MantineAccordion.Control>
          <MantineAccordion.Panel>{children}</MantineAccordion.Panel>
        </MantineAccordion.Item>
      ))}
    </MantineAccordion>
  );
}

export default Accordion;
