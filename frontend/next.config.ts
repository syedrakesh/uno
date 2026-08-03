import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: '192.168.*' },
      { protocol: 'http', hostname: '10.*' },
    ],
  },
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '192.168.*.*',
    '192.168.*.*:3000',
    '10.*.*.*',
    '10.*.*.*:3000',
    '172.*.*.*',
    '172.*.*.*:3000',
  ],
};

export default nextConfig;
