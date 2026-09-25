'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';

import {
  getChatReferenceLabel,
  resolveAdminChatReferenceHref,
  type ChatReference,
} from '../lib/chat';

export function AdminChatReferenceCard({
  reference,
  websiteSlug,
}: {
  reference: ChatReference;
  websiteSlug?: string | null;
}) {
  const router = useRouter();
  const href = resolveAdminChatReferenceHref(reference, websiteSlug);
  const label = getChatReferenceLabel(reference.type);
  const isExternal = Boolean(href && /^https?:\/\//i.test(href));

  const card = (
    <div className="mt-1 min-w-48">
      <p className="text-[10px] uppercase tracking-wide opacity-70">Referensi {label}</p>
      {reference.imageUrl && <img src={reference.imageUrl} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" />}
      <p className="mt-2 font-semibold">{reference.title}</p>
      {reference.meta && <p className="mt-1 text-xs opacity-70">{reference.meta}</p>}
      {href ? <span className="mt-2 inline-block text-xs font-semibold underline">Lihat {label}</span> : null}
    </div>
  );

  if (!href) return card;
  const targetHref = href;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isExternal) {
      window.location.assign(targetHref);
      return;
    }
    router.push(targetHref);
  }

  const className = 'mt-1 block min-w-48 cursor-pointer transition-opacity hover:opacity-90';

  if (isExternal) {
    return (
      <a href={targetHref} onClick={handleClick} className={className}>
        {card}
      </a>
    );
  }

  return (
    <Link href={targetHref} onClick={handleClick} className={className}>
      {card}
    </Link>
  );
}
