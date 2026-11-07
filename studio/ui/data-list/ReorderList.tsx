'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@heroui/react';

import { Icon } from '../icons';
import type { DataRow } from './types';

interface SortableRowProps<T extends DataRow> {
  row: T;
  index: number;
  total: number;
  label: string;
  onMove: (index: number, direction: -1 | 1) => void;
}

function SortableRow<T extends DataRow>({ row, index, total, label, onMove }: SortableRowProps<T>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-background px-3 py-2 ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Seret untuk memindahkan ${label}`}
        className="cursor-grab touch-none rounded-small p-1.5 text-default-500 hover:bg-default-100 active:cursor-grabbing"
      >
        <Icon name="grip" size={18} />
      </button>
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-default-500">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{label}</span>
      <Button
        isIconOnly
        size="sm"
        variant="light"
        aria-label={`Naikkan ${label}`}
        isDisabled={index === 0}
        onPress={() => onMove(index, -1)}
      >
        <Icon name="arrowUp" size={16} />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="light"
        aria-label={`Turunkan ${label}`}
        isDisabled={index === total - 1}
        onPress={() => onMove(index, 1)}
      >
        <Icon name="arrowDown" size={16} />
      </Button>
    </li>
  );
}

export interface ReorderListProps<T extends DataRow> {
  rows: T[];
  onChange: (rows: T[]) => void;
  getRowLabel: (row: T) => string;
}

/** Seret (@dnd-kit, termasuk keyboard) + tombol naik/turun sebagai cadangan. */
export function ReorderList<T extends DataRow>({ rows, onChange, getRowLabel }: ReorderListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.id === active.id);
    const to = rows.findIndex((r) => r.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(rows, from, to));
  };

  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    onChange(arrayMove(rows, index, target));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Tekan spasi untuk mengangkat, panah atas/bawah untuk memindah, spasi lagi untuk meletakkan, Escape untuk batal.',
        },
      }}
    >
      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col divide-y divide-default-200" aria-label="Urutan data">
          {rows.map((row, index) => (
            <SortableRow
              key={row.id}
              row={row}
              index={index}
              total={rows.length}
              label={getRowLabel(row)}
              onMove={move}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
