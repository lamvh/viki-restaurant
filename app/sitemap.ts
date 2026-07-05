import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Only public, indexable routes belong here (checkout/confirmation are noindex).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/menu`, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
