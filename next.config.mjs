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
    '@neondatabase/serverless',
    '@aptos-labs/ts-sdk',
    '@aptos-labs/aptos-client',
    'got',
    'cacheable-request',
    'keyv',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('_http_common');
    }
    return config;
  },
}

export default nextConfig
