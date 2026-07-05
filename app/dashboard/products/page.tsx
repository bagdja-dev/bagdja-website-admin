'use client';

import { Card, CardBody } from '@heroui/react';

export default function ProductsManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Produk</h1>
        <p className="mt-1 text-default-500">Kelola produk dan layanan yang ditampilkan di website.</p>
      </div>

      <Card className="border border-default-200">
        <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
          <svg className="h-12 w-12 text-default-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          <p className="text-lg font-semibold">Manajemen Produk</p>
          <p className="text-sm text-default-500">
            Fitur CRUD produk akan diimplementasikan di Phase 6.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
