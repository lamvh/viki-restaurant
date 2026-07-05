import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Transactional pages carry no marketing value / per-user state.
      disallow: ['/checkout', '/order/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
