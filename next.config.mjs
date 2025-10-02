/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'prisma',
      // Aptos SDK and its node-only transitive deps used server-side
      '@aptos-labs/ts-sdk',
      '@aptos-labs/aptos-client',
      'got',
      'cacheable-request',
      'keyv',
    ],
  },
}

export default nextConfig
