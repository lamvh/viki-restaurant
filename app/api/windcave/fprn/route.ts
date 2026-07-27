import { NextResponse, type NextRequest } from 'next/server';

import { recordPaymentEvent } from '@/lib/orders/payment-events';
import { createServiceClient } from '@/lib/supabase/service-client';
import { reconcileSession } from '@/lib/windcave/reconcile';

export const dynamic = 'force-dynamic';

/**
 * Fail Proof Result Notification — fires even when the customer never returns,
 * which is the point of it.
 *
 * The body is untrusted; it only tells us which order to go re-query. Always
 * answers 200: a non-2xx makes Windcave retry, and an unknown token must not be
 * distinguishable from a known one or this endpoint becomes an oracle.
 */
async function handle(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.json({ received: true });

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('notification_token', token)
    .single();

  if (!order) return NextResponse.json({ received: true });

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  await recordPaymentEvent(order.id, 'fprn_received', body);
  await reconcileSession(order.id);

  return NextResponse.json({ received: true });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
