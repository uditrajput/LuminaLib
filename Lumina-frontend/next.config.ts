/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['winston', 'winston-loki', 'canvas'],
  turbopack: {
    resolveAlias: {
      canvas: { browser: '' },
    },
  },
  experimental: {},
  webpack: (config: any) => {
    // Prevent bundling 'canvas' which pdfjs-dist optionally requires for Node.js
    config.resolve.alias.canvas = false;
    return config;
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || 'http://backend:8000/api/v1';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/:path*`
      },
      {
        source: '/grafana/:path*',
        destination: 'http://grafana:3000/grafana/:path*'
      }
    ];
  }
};


export default nextConfig;

