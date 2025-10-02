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
  outputFileTracingIncludes: {
    '/(api|app)/**': [
      './node_modules/.prisma/client/libquery_engine*',
      './node_modules/.prisma/client/schema.prisma',
      './node_modules/@prisma/engines/**',
      './node_modules/@prisma/client/**',
    ],
  },
}

export default nextConfig
