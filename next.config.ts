import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The connect panel lives on the pro track now; the old URL stays a working link.
  async redirects() {
    return [{ source: '/pro/connect', destination: '/pro#connect', permanent: false }]
  },
}

export default nextConfig
