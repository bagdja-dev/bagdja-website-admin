'use client';

import Link from 'next/link';

import {
  getChatReferenceLabel,
  resolveStudioChatReferenceHref,
  type ChatReference,
} from '@/studio/lib/chat';

export function StudioChatReferenceCard({
  reference,
  websiteSlug,
}: {
  reference: ChatReference;
  websiteSlug?: string | null;
}) {
  const href = resolveStudioChatReferenceHref(reference, websiteSlug);
  const label = getChatReferenceLabel(reference.type);
  const card = (
    <span className="mt-1 block min-w-48">
      <span className="text-[10px] uppercase tracking-wide opacity-70">Referensi {label}</span>
      {reference.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- image host berasal dari data referensi chat.
        <img src={reference.imageUrl} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" />
      )}
      <span className="mt-1 block font-semibold">{reference.title}</span>
      {reference.meta && <span className="mt-1 block text-xs opacity-70">{reference.meta}</span>}
      {href && <span className="mt-2 block text-xs font-semibold underline">Lihat {label}</span>}
    </span>
  );
  if (!href) return card;
  if (/^https?:\/\//i.test(href)) {
    return <a href={href} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-90">{card}</a>;
  }
  return <Link href={href} className="block transition-opacity hover:opacity-90">{card}</Link>;
}
