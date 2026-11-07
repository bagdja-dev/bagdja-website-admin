'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

import type { WebsiteSection } from '@/studio/api/pages';
import { Icon } from '@/studio/ui/icons';

export interface SortableSectionsProps {
  items: WebsiteSection[];
  /** Section yang dikunci di atas (mis. hero `pinned: 'top'`): tidak bisa diseret dan selalu tetap paling atas. */
  isPinned: (section: WebsiteSection) => boolean;
  getLabel: (section: WebsiteSection) => string;
  onReorder: (ordered: WebsiteSection[]) => void;
  disabled?: boolean;
  /** `handle` = pegangan seret + tombol naik/turun; letakkan di dalam baris. */
  renderItem: (section: WebsiteSection, handle: ReactNode) => ReactNode;
  size?: 'sm' | 'md';
}

/** Pastikan section terkunci tetap di atas dengan urutan relatif yang sama. */
function keepPinnedOnTop(list: WebsiteSection[], isPinned: (s: WebsiteSection) => boolean): WebsiteSection[] {
  return [...list.filter(isPinned), ...list.filter((s) => !isPinned(s))];
}

function sameOrder(a: WebsiteSection[], b: WebsiteSection[]): boolean {
  return a.length === b.length && a.every((s, i) => s.id === b[i].id);
}

/** Daftar section yang bisa diurutkan: seret (mouse/sentuh/keyboard) atau tombol naik/turun. Disimpan langsung lewat `onReorder`. */
export function SortableSections({ items, isPinned, getLabel, onReorder, disabled, renderItem, size = 'sm' }: SortableSectionsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = (next: WebsiteSection[]) => {
    const ordered = keepPinnedOnTop(next, isPinned);
    if (!sameOrder(ordered, items)) onReorder(ordered);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((s) => s.id === active.id);
    const to = items.findIndex((s) => s.id === over.id);
    if (from >= 0 && to >= 0) commit(arrayMove(items, from, to));
  };

  const firstMovable = items.findIndex((s) => !isPinned(s));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < Math.max(firstMovable, 0) || target >= items.length) return;
    commit(arrayMove(items, index, target));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Tekan spasi untuk mengangkat section, panah atas/bawah untuk memindahkan, spasi lagi untuk meletakkan.',
        },
      }}
    >
      <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {items.map((section, index) => (
          <SortableRow
            key={section.id}
            section={section}
            pinned={isPinned(section)}
            label={getLabel(section)}
            disabled={disabled}
            canUp={!isPinned(section) && index > Math.max(firstMovable, 0)}
            canDown={!isPinned(section) && index < items.length - 1}
            onUp={() => move(index, -1)}
            onDown={() => move(index, 1)}
            renderItem={renderItem}
            size={size}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

interface SortableRowProps {
  section: WebsiteSection;
  pinned: boolean;
  label: string;
  disabled?: boolean;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  renderItem: SortableSectionsProps['renderItem'];
  size: 'sm' | 'md';
}

function SortableRow({ section, pinned, label, disabled, canUp, canDown, onUp, onDown, renderItem, size }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: pinned || disabled,
  });
  const btn = size === 'md' ? 'h-9 w-7' : 'h-7 w-6';
  const icon = size === 'md' ? 15 : 13;

  const handle = (
    <span className="flex shrink-0 items-center">
      {pinned ? (
        <span className={`flex ${btn} items-center justify-center text-default-300`} title="Dikunci di posisi paling atas">
          <Icon name="lock" size={icon} strokeWidth={1.6} />
        </span>
      ) : (
        <button
          type="button"
          className={`flex ${btn} cursor-grab touch-none items-center justify-center rounded-md text-default-400 hover:bg-default-100 hover:text-default-700 active:cursor-grabbing disabled:cursor-not-allowed`}
          aria-label={`Seret untuk memindahkan ${label}`}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <Icon name="grip" size={icon} strokeWidth={1.8} />
        </button>
      )}
      {!pinned && (
        <span className="flex flex-col">
          <button
            type="button"
            onClick={onUp}
            disabled={disabled || !canUp}
            aria-label={`Naikkan ${label}`}
            className="flex h-3.5 w-5 items-center justify-center rounded text-default-400 hover:text-primary disabled:opacity-30"
          >
            <Icon name="arrowUp" size={11} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onDown}
            disabled={disabled || !canDown}
            aria-label={`Turunkan ${label}`}
            className="flex h-3.5 w-5 items-center justify-center rounded text-default-400 hover:text-primary disabled:opacity-30"
          >
            <Icon name="arrowDown" size={11} strokeWidth={2} />
          </button>
        </span>
      )}
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? 'z-10 opacity-80 shadow-lg' : ''}`}
    >
      {renderItem(section, handle)}
    </div>
  );
}
