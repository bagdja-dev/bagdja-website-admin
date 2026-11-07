import Link from 'next/link';
import type { ReactNode } from 'react';

const BTN = 'inline-flex min-h-12 items-center rounded-xl px-5 text-[15px] no-underline';

export interface StatusScreenAction {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

export interface StatusScreenProps {
  /** Ikon 28px di tile 64px. */
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: StatusScreenAction[];
  /** Teks tambahan di bawah tombol (mis. "Minta owner …"). */
  note?: ReactNode;
}

/** Layar status tengah (artboard "8 · Buka URL modul nonaktif"): tile 64px, judul 24/800, deskripsi, tombol. */
export function StatusScreen({ icon, title, description, actions = [], note }: StatusScreenProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <section className="flex w-full max-w-[520px] flex-col items-center gap-[18px] text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-default-200 bg-white text-default-600">
          {icon}
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold tracking-[-0.01em] text-foreground">{title}</h2>
          {description && <p className="text-[15px] leading-relaxed text-default-600">{description}</p>}
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2.5">
            {actions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className={`${BTN} ${
                  action.variant === 'secondary'
                    ? 'border border-default-300 bg-white font-semibold text-foreground hover:bg-default-50'
                    : 'bg-primary font-bold text-white hover:bg-primary-700'
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
        {note && <p className="text-sm font-medium text-default-600">{note}</p>}
      </section>
    </div>
  );
}
