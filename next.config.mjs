/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    '@prisma/client',
    'prisma',
    '@aptos-labs/ts-sdk',
    '@aptos-labs/aptos-client',
    'got',
    'cacheable-request',
    'keyv',
  ],
}

export default nextConfig
