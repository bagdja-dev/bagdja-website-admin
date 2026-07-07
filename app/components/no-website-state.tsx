'use client';

import { Button, Card, CardBody } from '@heroui/react';
import Link from 'next/link';

interface NoWebsiteProps {
  title?: string;
  description?: string;
}

export function NoWebsiteState({
  title = 'Belum ada website',
  description = 'Buat website baru untuk mulai mengelola halaman, produk, dan tim.',
}: NoWebsiteProps) {
  return (
    <Card className="border border-default-200">
      <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
        <svg className="h-12 w-12 text-default-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-1 text-sm text-default-500">{description}</p>
        </div>
        <Button as={Link} href="/dashboard/websites/new" color="primary">
          Buat Website Baru
        </Button>
      </CardBody>
    </Card>
  );
}
