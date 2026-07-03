import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Chip color="warning" variant="flat" size="sm">
          Phase 1 — Scaffold
        </Chip>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Bagdja Website Admin
        </h1>
        <p className="max-w-lg text-default-500">
          CMS panel untuk mengelola website tenant. Fitur akan diaktifkan pada
          Phase 5 &amp; 6 (SSO, pemilihan website, page builder, staff
          management).
        </p>
      </div>

      <Card className="w-full max-w-xl border border-default-200">
        <CardHeader className="flex justify-between">
          <div>
            <p className="text-sm font-medium">Status Layanan</p>
            <p className="text-xs text-default-500">
              Verifikasi konektivitas ke API backend.
            </p>
          </div>
          <Chip color="success" variant="dot">
            Scaffold OK
          </Chip>
        </CardHeader>
        <CardBody className="gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-default-500">API Endpoint</p>
              <code className="text-xs">
                {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003'}
              </code>
            </div>
            <div>
              <p className="text-default-500">Auth SSO</p>
              <code className="text-xs">
                {process.env.NEXT_PUBLIC_AUTH_URL ?? '(belum diset)'}
              </code>
            </div>
          </div>
          <div className="flex gap-2">
            <Button color="primary" variant="flat" size="sm" isDisabled>
              Login (Phase 5)
            </Button>
            <Button variant="light" size="sm" isDisabled>
              Pilih Website (Phase 5)
            </Button>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
