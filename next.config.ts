import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: [],
    loader: 'default',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'killiskadev.ru',
        port: '',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'komp-auto.ru',
        port: '',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'www.komp-auto.ru',
        port: '',
        pathname: '/uploads/**',
      },
    ],
  },
}

export default nextConfig
