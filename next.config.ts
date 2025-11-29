import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  allowedDevOrigins: [
    '*.replit.dev',
    'f979c0b7-3c4c-419d-a283-f14b31bb0736-00-4kq1dm208xzb.sisko.replit.dev',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
