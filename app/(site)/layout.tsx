import { PromoBar } from '@/components/layout/promo-bar';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ItemModal } from '@/components/menu/item-modal';
import { CartDrawer } from '@/components/cart/cart-drawer';

// Public marketing + ordering site chrome — isolated from /admin, which has
// its own layout (Phase 04).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PromoBar />
      <SiteHeader />
      {children}
      <SiteFooter />
      <ItemModal />
      <CartDrawer />
    </>
  );
}
