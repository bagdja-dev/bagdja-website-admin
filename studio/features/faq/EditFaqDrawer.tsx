'use client';

import { useCallback, useEffect, useState } from 'react';

import { Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';

import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';
import { CATEGORY_OPTIONS } from './constants';
import type { FAQRow } from './FAQList';

interface EditFaqDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSave: (draft: Partial<FAQRow>) => Promise<void>;
  row: FAQRow | null;
}

export function EditFaqDrawer({ isOpen, onClose, title, onSave, row }: EditFaqDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState(row?.question ?? '');
  const [answer, setAnswer] = useState(row?.answer ?? '');
  const [category, setCategory] = useState<string>(row?.category ?? 'general');
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(row?.sort_order ?? 0);

  useEffect(() => {
    if (!isOpen) return;
    setQuestion(row?.question ?? '');
    setAnswer(row?.answer ?? '');
    setCategory(row?.category ?? 'general');
    setIsActive(row?.is_active ?? true);
    setSortOrder(row?.sort_order ?? 0);
  }, [isOpen, row]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSave({
        question,
        answer,
        category: category || undefined,
        is_active: isActive,
        sort_order: sortOrder,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onSave, question, answer, category, isActive, sortOrder]);

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onSubmit={handleSubmit}
      submitLabel={row ? 'Simpan perubahan' : 'Buat FAQ'}
      isSubmitting={isSubmitting}
      isSubmitDisabled={!question.trim()}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input
            label="Pertanyaan"
            labelPlacement="outside"
            value={question}
            onValueChange={setQuestion}
            placeholder="Mis. Apakah harus booking dulu?"
            autoFocus
            isRequired
            variant="bordered"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-default-600">Jawaban</label>
          <Textarea
            value={answer}
            onValueChange={setAnswer}
            placeholder="Jawaban singkat untuk pembeli…"
            rows={4}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-default-600">Kategori</label>
            <Select
              labelPlacement="outside"
              selectedKeys={[category]}
              onSelectionChange={(keys) => {
                const [first] = Array.from(keys);
                setCategory(typeof first === 'string' ? first : 'general');
              }}
              variant="bordered"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-default-600">Urutan tampil</label>
            <Input
              type="number"
              labelPlacement="outside"
              value={String(sortOrder)}
              onValueChange={(v) => setSortOrder(parseInt(v, 10) || 0)}
              variant="bordered"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Switch isSelected={isActive} onValueChange={setIsActive} />
          <span className="text-[13px] text-default-600">Tampilkan di website</span>
        </div>
      </div>
    </EditDrawer>
  );
}
