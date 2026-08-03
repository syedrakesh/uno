import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { domains: ['ui-avatars.com','localhost','lh3.googleusercontent.com','avatars.githubusercontent.com'] },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*` }];
  },
};
export default nextConfig;
