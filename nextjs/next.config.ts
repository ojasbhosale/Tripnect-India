import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: ['images.pexels.com', 'www.pexels.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
}

export default nextConfig
