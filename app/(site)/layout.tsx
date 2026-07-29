import { CartDrawer } from '@/components/cart/cart-drawer';
import { PromoBar } from '@/components/layout/promo-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ItemModal } from '@/components/menu/item-modal';
import { MenuProvider } from '@/components/menu/menu-provider';
import { getMenu } from '@/lib/db/get-menu';

// Public marketing + ordering site chrome — isolated from /admin, which has its
// own layout. The menu is fetched here so client components (item modal,
// category chips) see admin edits rather than the static file.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const menu = await getMenu();

  return (
    <MenuProvider menu={menu}>
      <PromoBar />
      <SiteHeader />
      {children}
      <SiteFooter />
      <ItemModal />
      <CartDrawer />
    </MenuProvider>
  );
}
