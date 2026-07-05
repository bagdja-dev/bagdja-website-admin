'use client';

import { Card, CardBody } from '@heroui/react';

export default function PagesManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Halaman</h1>
        <p className="mt-1 text-default-500">Kelola halaman-halaman website Anda.</p>
      </div>

      <Card className="border border-default-200">
        <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
          <svg className="h-12 w-12 text-default-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p className="text-lg font-semibold">Manajemen Halaman</p>
          <p className="text-sm text-default-500">
            Fitur CRUD halaman akan diimplementasikan di Phase 6.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
