'use client';

import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import { useState } from 'react';

import type { OrderDetail } from '@/studio/api/order-detail';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';

import { CHIP } from './TimelineRow';
import type { OrderActions } from './use-order-actions';
import { buyerName, formatDateTime, formatMoney, hasAdditionalTermins, orderNumber, paymentStatus, PILL_CLASS } from './order-model';

interface HeaderActionsProps {
  order: OrderDetail;
  canRefund: boolean;
  refundable: boolean;
  actions: OrderActions;
}

/** Aksi topbar: "Chat pembeli" + menu ⋯ (cetak, salin nomor, refund). */
export function HeaderActions({ order, canRefund, refundable, actions }: HeaderActionsProps) {
  return (
    <div className="hidden items-center gap-2 md:flex">
      <ChatBuyerButton actions={actions} />
      <MoreActionsMenu order={order} canRefund={canRefund} refundable={refundable} actions={actions} />
    </div>
  );
}

function ChatBuyerButton({ actions }: { actions: OrderActions }) {
  return (
    <Button
      variant="bordered"
      className="min-h-10 rounded-[10px] font-semibold"
      startContent={<Icon name="chat" size={16} />}
      isLoading={actions.busy === 'chat'}
      onPress={() => void actions.startChat()}
    >
      Chat pembeli
    </Button>
  );
}

function MoreActionsMenu({
  order,
  canRefund,
  refundable,
  actions,
  placement = 'bottom-end',
}: HeaderActionsProps & { placement?: 'bottom-end' | 'top-end' }) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const copyNumber = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(orderNumber(order));
      notify.success('Nomor pesanan disalin');
    } catch {
      notify.warning('Tidak bisa menyalin otomatis.');
    }
  };
  const menu = [
    { key: 'print', label: 'Cetak / simpan PDF' },
    { key: 'copy', label: 'Salin nomor pesanan' },
    ...(canRefund && refundable ? [{ key: 'refund', label: 'Refund ke pembeli…', danger: true }] : []),
  ];
  const runAction = (key: React.Key): void => {
    setMobileSheetOpen(false);
    if (key === 'print') window.print();
    else if (key === 'copy') void copyNumber();
    else if (key === 'refund') void actions.refund();
  };

  return (
    <>
      <div className="hidden md:block">
        <Dropdown placement={placement}>
          <DropdownTrigger>
            <button type="button" aria-label="Aksi lainnya" className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-default-300 bg-white text-default-700 hover:bg-default-50">
              <Icon name="more" size={18} strokeWidth={2.2} />
            </button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Aksi pesanan" onAction={runAction}>
            {menu.map((m) => (
              <DropdownItem key={m.key} color={'danger' in m ? 'danger' : 'default'} className={'danger' in m ? 'text-[#B91C1C]' : undefined}>
                {m.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      </div>
      <div className="md:hidden">
        <button
          type="button"
          aria-label="Aksi lainnya"
          aria-haspopup="dialog"
          aria-expanded={mobileSheetOpen}
          onClick={() => setMobileSheetOpen(true)}
          className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-[12px] border border-default-300 bg-white text-default-700 hover:bg-default-50"
        >
          <Icon name="more" size={18} strokeWidth={2.2} />
        </button>
        <Modal
          isOpen={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
          placement="bottom"
          classNames={{
            wrapper: 'items-end',
            base: 'm-0 h-auto w-full max-w-none rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)]',
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-3 border-b border-default-100 px-5 pb-4 pt-3">
                  <span className="mx-auto h-1 w-10 rounded-full bg-default-300" aria-hidden="true" />
                  <span>Aksi pesanan</span>
                </ModalHeader>
                <ModalBody className="gap-1 px-3 py-3">
                  {menu.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        onClose();
                        runAction(item.key);
                      }}
                      className={`min-h-12 rounded-xl px-3 text-left text-sm font-semibold hover:bg-default-100 ${
                        'danger' in item ? 'text-danger-700' : 'text-foreground'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </>
  );
}

export function ChatBottomBar({ order, canRefund, refundable, actions }: HeaderActionsProps) {
  return (
    <nav
      aria-label="Navigasi aksi pesanan"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-default-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <Button color="primary" className="min-h-12 flex-1 rounded-[12px] font-bold" startContent={<Icon name="chat" size={17} />} isLoading={actions.busy === 'chat'} onPress={() => void actions.startChat()}>
        Chat pembeli
      </Button>
      <MoreActionsMenu order={order} canRefund={canRefund} refundable={refundable} actions={actions} placement="top-end" />
    </nav>
  );
}

interface SummaryStripProps {
  order: OrderDetail;
  total: number;
  work: { label: string; tone: 'primary' | 'neutral' | 'warning' | 'success' };
  preorder: boolean;
}

/** Ringkasan di atas konten (juga tampil di HP, topbar menyembunyikan deskripsi). */
export function SummaryStrip({ order, total, work, preorder }: SummaryStripProps) {
  const pay = paymentStatus(order);
  return (
    <section aria-label="Ringkasan pesanan" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-default-200 bg-white px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[13px] text-default-600">
          {formatDateTime(order.created_at)} · <strong className="text-foreground">{buyerName(order)}</strong>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${CHIP} px-2.5 py-1 text-xs ${PILL_CLASS[pay.tone]}`}>{pay.label}</span>
          <span className={`${CHIP} px-2.5 py-1 text-xs ${PILL_CLASS[work.tone]}`}>{work.label}</span>
          {preorder && <span className={`${CHIP} px-2.5 py-1 text-xs ${PILL_CLASS.neutral}`}>Praorder</span>}
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs text-default-600">{hasAdditionalTermins(order) ? 'Total proyek' : 'Total pesanan'}</span>
        <span className="text-lg font-extrabold">{formatMoney(total, order.currency)}</span>
      </div>
    </section>
  );
}
