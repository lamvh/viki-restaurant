import type { Metadata } from 'next';
import { Instrument_Serif, Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { PromoBar } from '@/components/layout/promo-bar';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ItemModal } from '@/components/menu/item-modal';
import { CartDrawer } from '@/components/cart/cart-drawer';

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

export const metadata: Metadata = {
  title: 'Viki — Vietnamese Street Food, Glenfield',
  description:
    'Fresh Vietnamese street food in Glenfield Mall, Auckland. Order pickup or delivery.',
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
