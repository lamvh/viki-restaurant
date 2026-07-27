import { NextResponse, type NextRequest } from 'next/server';

import { requireStaff } from '@/lib/auth/require-role';
import { pollTerminalPayment, pressTerminalButton } from '@/lib/orders/terminal-payment';
import { createServiceClient } from '@/lib/supabase/service-client';
import type { HitButtonValue } from '@/lib/windcave/hit-types';

export const dynamic = 'force-dynamic';

const BUTTON_VALUES: HitButtonValue[] = ['YES', 'NO', 'CANCEL'];

/**
 * Staff-guarded relay. The browser never talks to Windcave directly — the HIT
 * key stays server-side, and the staff session is re-checked on **every tick**,
 * not once when the dialog opened.
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, hit_txn_ref')
    .eq('id', orderId)
    .single();

  // The ref is looked up from the order, never taken from the query string —
  // otherwise staff could poll or cancel arbitrary transactions.
  if (!order?.hit_txn_ref) {
    return NextResponse.json({ error: 'No payment in progress' }, { status: 404 });
  }

  const buttonName = request.nextUrl.searchParams.get('button');
  const buttonValue = request.nextUrl.searchParams.get('value');

  try {
    if (buttonName === 'B1' || buttonName === 'B2') {
      const value = BUTTON_VALUES.includes(buttonValue as HitButtonValue)
        ? (buttonValue as HitButtonValue)
        : 'YES';
      return NextResponse.json(
        await pressTerminalButton(order.id, order.hit_txn_ref, buttonName, value),
      );
    }

    return NextResponse.json(await pollTerminalPayment(order.id, order.hit_txn_ref));
  } catch (cause) {
    console.error('Terminal poll failed', cause);
    return NextResponse.json({ error: 'Terminal unreachable' }, { status: 502 });
  }
}
