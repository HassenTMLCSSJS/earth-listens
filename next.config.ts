import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { contentSecurityPolicy } from './src/core/csp';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Piper's emscripten build mentions Node's fs/path. The browser never calls them.
  turbopack: {
    resolveAlias: {
      fs: { browser: './src/stubs/fs.js' },
      path: { browser: './src/stubs/path.js' },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...(config.resolve.fallback ?? {}), fs: false, path: false };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'microphone=(self)' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy(true),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
