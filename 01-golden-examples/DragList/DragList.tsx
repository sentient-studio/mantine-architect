import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { IconGripVertical } from '@tabler/icons-react';
import classes from './DragList.module.css';

export interface DragListItem {
  id: string;
  symbol: string;
  name: string;
  position: number;
  mass: number;
}

export interface DragListProps {
  variant?: 'cards' | 'with-handle' | 'table';
  items: DragListItem[];
  onChange?: (items: DragListItem[]) => void;
}

// ─── Card variants (cards + with-handle) ────────────────────────────────────

interface ItemRowProps {
  item: DragListItem;
  variant: 'cards' | 'with-handle';
  isDragging?: boolean;
  isOverlay?: boolean;
  handleProps?: React.HTMLAttributes<HTMLElement>;
}

function ItemRow({ item, variant, isDragging, isOverlay, handleProps }: ItemRowProps) {
  const description = `Position: ${item.position} • Mass: ${item.mass}`;

  return (
    <div
      className={classes.item}
      data-variant={variant}
      data-dragging={isDragging || undefined}
      data-overlay={isOverlay || undefined}
      data-testid="drag-item"
      {...(variant === 'cards' ? (handleProps as React.HTMLAttributes<HTMLDivElement>) : {})}
    >
      {variant === 'with-handle' && (
        <span
          className={classes.handle}
          aria-label="Drag to reorder"
          {...(handleProps as React.HTMLAttributes<HTMLSpanElement>)}
        >
          <IconGripVertical size={20} stroke={1.5} aria-hidden />
        </span>
      )}
      <span className={classes.symbol}>{item.symbol}</span>
      <span className={classes.content}>
        <span className={classes.name}>{item.name}</span>
        <span className={classes.description}>{description}</span>
      </span>
    </div>
  );
}

function SortableItemRow({ item, variant }: { item: DragListItem; variant: 'cards' | 'with-handle' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ItemRow
        item={item}
        variant={variant}
        isDragging={isDragging}
        handleProps={{
          ...(listeners as React.HTMLAttributes<HTMLElement>),
          ...(attributes as React.HTMLAttributes<HTMLElement>),
        }}
      />
    </div>
  );
}

// ─── Table variant ───────────────────────────────────────────────────────────

interface TableRowProps {
  item: DragListItem;
  isDragging?: boolean;
  isOverlay?: boolean;
  handleProps?: React.HTMLAttributes<HTMLElement>;
}

function TableRowContent({ item, isDragging, isOverlay, handleProps }: TableRowProps) {
  return (
    <div
      className={classes.tableRow}
      data-dragging={isDragging || undefined}
      data-overlay={isOverlay || undefined}
      data-testid="drag-item"
    >
      <div className={classes.tableGripCol}>
        <span
          className={classes.tableHandle}
          aria-label="Drag to reorder"
          {...(handleProps as React.HTMLAttributes<HTMLSpanElement>)}
        >
          <IconGripVertical size={16} stroke={1.5} aria-hidden />
        </span>
      </div>
      <div className={classes.tableCell}>{item.position}</div>
      <div className={`${classes.tableCell} ${classes.tableCellFlex}`}>{item.name}</div>
      <div className={classes.tableCell}>{item.symbol}</div>
      <div className={classes.tableCell}>{item.mass}</div>
    </div>
  );
}

function SortableTableRow({ item }: { item: DragListItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    // Only translate on Y axis for table rows
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TableRowContent
        item={item}
        isDragging={isDragging}
        handleProps={{
          ...(listeners as React.HTMLAttributes<HTMLElement>),
          ...(attributes as React.HTMLAttributes<HTMLElement>),
        }}
      />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DragList({ variant = 'with-handle', items: initialItems, onChange }: DragListProps) {
  const [items, setItems] = useState(initialItems);
  const [activeItem, setActiveItem] = useState<DragListItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveItem(items.find((i) => i.id === active.id) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveItem(null);
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const next = arrayMove(
          prev,
          prev.findIndex((i) => i.id === active.id),
          prev.findIndex((i) => i.id === over.id)
        );
        onChange?.(next);
        return next;
      });
    }
  }

  function handleDragCancel() {
    setActiveItem(null);
  }

  const dndProps = {
    sensors,
    collisionDetection: closestCenter,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
  };

  if (variant === 'table') {
    return (
      <DndContext {...dndProps}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className={classes.table} data-testid="drag-list">
            {/* First column header is intentionally empty (grip utility column, no label) */}
            <div className={classes.tableHeader}>
              <div className={classes.tableGripCol} />
              <div className={classes.tableHeaderCell}>Position</div>
              <div className={`${classes.tableHeaderCell} ${classes.tableCellFlex}`}>Name</div>
              <div className={classes.tableHeaderCell}>Symbol</div>
              <div className={classes.tableHeaderCell}>Mass</div>
            </div>
            {items.map((item) => (
              <SortableTableRow key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeItem ? <TableRowContent item={activeItem} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <DndContext {...dndProps}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={classes.list} data-testid="drag-list">
          {items.map((item) => (
            <SortableItemRow key={item.id} item={item} variant={variant} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem ? <ItemRow item={activeItem} variant={variant} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default DragList;
