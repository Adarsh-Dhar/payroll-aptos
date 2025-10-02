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
    '@prisma/client/wasm',
    'prisma',
    '@aptos-labs/ts-sdk',
    '@aptos-labs/aptos-client',
    'got',
    'cacheable-request',
    'keyv',
  ],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('_http_common');
      // Ensure Prisma binaries are not bundled
      config.externals.push({
        '@prisma/client': '@prisma/client',
        'prisma': 'prisma',
      });
    }
    return config;
  },
}

export default nextConfig
