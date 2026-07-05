import type { Metadata } from 'next';
import { Instrument_Serif, Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { PromoBar } from '@/components/layout/promo-bar';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ItemModal } from '@/components/menu/item-modal';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { SITE_URL, SITE_NAME, SITE_LOCALE } from '@/lib/site';

// Self-hosted Google fonts exposed as CSS variables consumed by globals.css.
const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-serif',
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hanken-grotesk',
});

const DESCRIPTION =
  'Fresh Vietnamese street food in Glenfield Mall, Auckland — phở, bánh mì, rice & noodle bowls. Order pickup or delivery.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Viki — Vietnamese Street Food, Glenfield',
    template: '%s · Viki',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Vietnamese food',
    'Viki',
    'Glenfield',
    'Auckland',
    'phở',
    'bánh mì',
    'street food',
    'takeaway',
    'delivery',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: '/',
    title: 'Viki — Vietnamese Street Food, Glenfield',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Viki — Vietnamese Street Food, Glenfield',
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${hankenGrotesk.variable}`}>
      <body>
        <PromoBar />
        <SiteHeader />
        {children}
        <SiteFooter />
        <ItemModal />
        <CartDrawer />
      </body>
    </html>
  );
}
