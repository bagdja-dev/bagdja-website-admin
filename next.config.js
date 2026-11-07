/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next lint` default hanya memindai app/pages/components/lib/src; Studio
  // berada di folder top-level `studio/` (plan §4.3) sehingga perlu didaftarkan.
  eslint: {
    dirs: ['app', 'components', 'lib', 'studio'],
  },
  transpilePackages: ['@heroui/react'],
  experimental: {
    optimizePackageImports: ['@heroui/react'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      // bagdja-storage-service (Cloudflare R2) — file baru (plan/storage-services/overview.md §9 Fase 3).
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

module.exports = nextConfig;
