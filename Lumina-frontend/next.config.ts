/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['winston', 'winston-loki'],
  },
  async rewrites() {
    return [
      {
        source: '/grafana/:path*',
        destination: 'http://grafana:3000/grafana/:path*'
      }
    ];
  }
};

export default nextConfig;
