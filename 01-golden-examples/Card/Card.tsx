import { Card as MantineCard, Text, Group, Badge, type CardProps as MantineCardProps } from '@mantine/core';
import classes from './Card.module.css';

interface CustomCardProps extends MantineCardProps {
  title: string;
  description: string;
  badge?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Card({ title, description, badge, size = 'md', children, ...others }: CustomCardProps) {
  return (
    <MantineCard shadow="sm" radius="md" withBorder className={classes.root} data-size={size} {...others}>
      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500} className={classes.title}>{title}</Text>
        {badge && <Badge color="pink">{badge}</Badge>}
      </Group>

      <Text size="sm" c="dimmed" className={classes.description}>
        {description}
      </Text>

      <div className={classes.content}>
        {children}
      </div>
    </MantineCard>
  );
}

export default Card;