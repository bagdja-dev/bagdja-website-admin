'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LoadingSpinner } from '../components/loading-spinner';
import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../components/mobile-floating-action';
import { NoWebsiteState } from '../components/no-website-state';
import { apiClient } from '../lib/api-client';
import type { TenantStaff, WebsitePage, WebsiteProduct } from '../lib/types';
import { buildTenantWebUrl } from '../lib/preview-url';
import { useWebsiteContext } from '../context/website-context';

const STAT_ITEMS = [
  {
    label: 'Halaman',
    key: 'pages' as const,
    href: '/dashboard/pages',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    bg: 'bg-blue-50 text-blue-600',
    ring: 'ring-blue-100',
  },
  {
    label: 'Produk Aktif',
    key: 'products' as const,
    href: '/dashboard/products',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
    bg: 'bg-amber-50 text-amber-600',
    ring: 'ring-amber-100',
  },
  {
    label: 'Staff',
    key: 'staff' as const,
    href: '/dashboard/staff',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    bg: 'bg-violet-50 text-violet-600',
    ring: 'ring-violet-100',
  },
  {
    label: 'Status',
    key: 'status' as const,
    href: '/dashboard/settings',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    bg: 'bg-emerald-50 text-emerald-600',
    ring: 'ring-emerald-100',
  },
];

const ROLE_CHIP: Record<string, 'primary' | 'secondary' | 'success' | 'default'> = {
  owner: 'primary',
  admin: 'secondary',
  editor: 'success',
  viewer: 'default',
};

function WebsiteInitial({ name }: { name: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm">
      {name.trim().charAt(0).toUpperCase() || 'W'}
    </div>
  );
}

export default function DashboardPage() {
  const { activeWebsite, websiteId, loading } = useWebsiteContext();
  const [stats, setStats] = useState({ pages: 0, products: 0, staff: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  const website = activeWebsite?.website;

  useEffect(() => {
    if (!websiteId) return;

    setStatsLoading(true);
    Promise.all([
      apiClient<WebsitePage[]>(`/api/websites/${websiteId}/pages`),
      apiClient<WebsiteProduct[]>(`/api/websites/${websiteId}/products`),
      apiClient<TenantStaff[]>(`/api/websites/${websiteId}/staff`),
    ])
      .then(([pages, products, staff]) => {
        setStats({
          pages: pages.length,
          products: products.filter((p) => p.is_active).length,
          staff: staff.length,
        });
      })
      .catch(() => setStats({ pages: 0, products: 0, staff: 0 }))
      .finally(() => setStatsLoading(false));
  }, [websiteId]);

  if (loading) return <LoadingSpinner />;

  if (!website) {
    return <NoWebsiteState />;
  }

  const webUrl = buildTenantWebUrl(website.slug);

  return (
    <div className={`space-y-6 ${mobileFabPagePadding}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-default-500">
            Kelola website <span className="font-medium text-foreground">{website.name}</span>
          </p>
        </div>
        <Button
          as={Link}
          href="/dashboard/websites/new"
          color="primary"
          variant="flat"
          className={desktopAddButtonClass}
        >
          + Website Baru
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {STAT_ITEMS.map((stat) => {
          const value =
            stat.key === 'status'
              ? website.is_active
                ? 'Aktif'
                : 'Nonaktif'
              : statsLoading
                ? '…'
                : stats[stat.key];
          return (
            <Link key={stat.label} href={stat.href} className="min-w-0">
              <Card className="h-full border-0 bg-white shadow-sm ring-1 ring-default-100 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardBody className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-2 ${stat.bg} ${stat.ring} sm:h-10 sm:w-10`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium uppercase tracking-wide text-default-400 sm:text-xs">
                      {stat.label}
                    </p>
                    <p className="truncate text-base font-bold sm:text-xl">{value}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 px-4 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 left-1/3 h-24 w-24 rounded-full bg-cyan-300/20 blur-xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {website.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={website.logo_url}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-2xl border-2 border-white/30 bg-white object-contain p-1 shadow-lg"
                />
              ) : (
                <WebsiteInitial name={website.name} />
              )}
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Chip
                    size="sm"
                    color={website.is_active ? 'success' : 'default'}
                    variant="flat"
                    classNames={{ content: 'font-semibold text-white/90' }}
                    className="border border-white/20 bg-white/15 backdrop-blur-sm px-2"
                  >
                    {website.is_active ? '● Online' : '○ Offline'}
                  </Chip>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={ROLE_CHIP[activeWebsite?.role ?? ''] ?? 'default'}
                    className="border border-white/20 bg-white/15 capitalize backdrop-blur-sm px-2"
                    classNames={{ content: 'font-semibold text-white' }}
                  >
                    {activeWebsite?.role}
                  </Chip>
                </div>
                <h2 className="truncate text-xl font-bold text-white sm:text-2xl">{website.name}</h2>
                {website.tagline && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-blue-100">{website.tagline}</p>
                )}
              </div>
            </div>
            <Button
              as={Link}
              href={webUrl}
              target="_blank"
              size="sm"
              className="shrink-0 bg-white font-semibold text-blue-700 shadow-lg hover:bg-blue-50"
            >
              Lihat Website ↗
            </Button>
          </div>
        </div>

        <CardBody className="grid gap-3 bg-gradient-to-b from-default-50/80 to-white p-4 sm:grid-cols-2 sm:gap-4 sm:p-6">
          {[
            {
              label: 'Slug URL',
              value: `/${website.slug}`,
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              ),
            },
            {
              label: 'Domain Kustom',
              value: website.domain ?? null,
              empty: 'Belum diatur',
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              ),
            },
            {
              label: 'WhatsApp',
              value: website.whatsapp ?? null,
              empty: 'Belum diatur',
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
              ),
            },
            {
              label: 'Email',
              value: website.email ?? null,
              empty: 'Belum diatur',
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              ),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-xl border border-default-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-default-400">{item.label}</p>
                {item.value ? (
                  <p className="mt-0.5 truncate font-semibold text-foreground">{item.value}</p>
                ) : (
                  <Chip size="sm" variant="flat" color="warning" className="mt-1">
                    {item.empty}
                  </Chip>
                )}
              </div>
            </div>
          ))}
        </CardBody>

        <div className="flex flex-wrap gap-2 border-t border-default-100 bg-default-50/50 px-4 py-3 sm:px-6">
          <Button as={Link} href="/dashboard/settings" size="sm" variant="flat" color="primary">
            Edit Profil
          </Button>
          <Button as={Link} href="/dashboard/pages" size="sm" variant="light">
            Kelola Halaman
          </Button>
        </div>
      </Card>

      <MobileFloatingActionBar label="Website Baru" href="/dashboard/websites/new" />
    </div>
  );
}
