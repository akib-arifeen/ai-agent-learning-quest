import type { MetadataRoute } from 'next'

/** Lets learners "Add to Home Screen" so the quest opens like an app on their phone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Creative AI Agent Quest',
    short_name: 'AI Quest',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf8ec',
    theme_color: '#fbf8ec',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
