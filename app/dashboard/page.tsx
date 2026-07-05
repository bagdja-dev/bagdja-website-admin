'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { useWebsites } from '../hooks/use-websites';

export default function DashboardPage() {
  const { activeWebsite, loading } = useWebsites();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-default-300 border-t-primary" />
      </div>
    );
  }

  const website = activeWebsite?.website;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        {website && (
          <p className="mt-1 text-default-500">
            Kelola website <span className="font-medium text-foreground">{website.name}</span>
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Halaman', value: '—', desc: 'Total halaman website' },
          { label: 'Produk', value: '—', desc: 'Produk aktif' },
          { label: 'Staff', value: '—', desc: 'Anggota tim' },
          { label: 'Status', value: website?.is_active ? 'Aktif' : 'Nonaktif', desc: 'Status website' },
        ].map((stat) => (
          <Card key={stat.label} className="border border-default-200">
            <CardBody className="p-4">
              <p className="text-sm text-default-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              <p className="mt-0.5 text-xs text-default-400">{stat.desc}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Quick info */}
      {website && (
        <Card className="border border-default-200">
          <CardHeader>
            <h2 className="text-lg font-semibold">Informasi Website</h2>
          </CardHeader>
          <CardBody className="gap-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-default-500">Nama</p>
                <p className="font-medium">{website.name}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Slug</p>
                <p className="font-medium">{website.slug}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Domain</p>
                <p className="font-medium">{website.domain ?? 'Belum diatur'}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Role Anda</p>
                <p className="font-medium capitalize">{activeWebsite?.role}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {!website && (
        <Card className="border border-default-200">
          <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
            <svg className="h-12 w-12 text-default-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p className="text-lg font-semibold">Belum ada website</p>
              <p className="mt-1 text-sm text-default-500">
                Buat website baru atau minta undangan dari pemilik website.
              </p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
