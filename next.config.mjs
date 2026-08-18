/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // "Packages" became "Journeys" — permanent redirects preserve links and SEO.
      { source: '/packages', destination: '/journeys', permanent: true },
      { source: '/packages/:slug', destination: '/journeys/:slug', permanent: true },
    ];
  },
  experimental: {
    // mammoth is CommonJS and reads files at runtime — keep it out of the bundle.
    serverComponentsExternalPackages: ['mammoth'],
    // Word documents and images are uploaded through server actions.
    serverActions: { bodySizeLimit: '10mb' },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default nextConfig;
