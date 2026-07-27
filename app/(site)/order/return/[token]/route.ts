import { NextResponse, type NextRequest } from 'next/server';

import { recordPaymentEvent } from '@/lib/orders/payment-events';
import { createServiceClient } from '@/lib/supabase/service-client';
import { reconcileSession } from '@/lib/windcave/reconcile';

export const dynamic = 'force-dynamic';

/**
 * Where Windcave sends the customer back.
 *
 * The `outcome` parameter is a hint that is recorded and otherwise ignored —
 * anyone can type `?outcome=approved` into the address bar. `reconcileSession`
 * re-queries Windcave and decides for itself.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('public_token', token)
    .single();

  if (order) {
    await recordPaymentEvent(order.id, 'callback_received', {
      outcome: request.nextUrl.searchParams.get('outcome'),
    });
    await reconcileSession(order.id);
  }

  return NextResponse.redirect(new URL(`/order/${token}`, request.nextUrl.origin));
}
