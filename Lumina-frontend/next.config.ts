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
    return [
      {
        source: '/grafana/:path*',
        destination: 'http://grafana:3000/grafana/:path*'
      }
    ];
  }
};

export default nextConfig;

