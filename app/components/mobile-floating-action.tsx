'use client';

import Link from 'next/link';

const buttonClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-opacity active:opacity-90';

/** Padding bawah konten halaman agar tidak tertutup FAB mobile */
export const mobileFabPagePadding = 'pb-24 sm:pb-0';

interface MobileFloatingActionBarProps {
  label: string;
  href?: string;
  onClick?: () => void;
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function MobileFloatingActionBar({ label, href, onClick }: MobileFloatingActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-default-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md sm:hidden">
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {href ? (
          <Link href={href} className={buttonClass}>
            <PlusIcon />
            {label}
          </Link>
        ) : (
          <button type="button" onClick={onClick} className={buttonClass}>
            <PlusIcon />
            {label}
          </button>
        )}
      </div>
    </div>
  );
}

/** Sembunyikan tombol add di header pada mobile (FAB menggantikan) */
export const desktopAddButtonClass = 'hidden sm:inline-flex';
