// Cart + order types (design spec §5, §6).

export type Service = 'pickup' | 'delivery';

export type CartLine = {
  /** Stable identity for a customised line: item id + selected options + notes. */
  key: string;
  id: string;
  name: string;
  /** Per-unit price, already including selected option prices. */
  unit: number;
  qty: number;
  /** Human-readable selected option labels shown under the line. */
  labels: string[];
  notes: string;
  /**
   * Selected option choice ids. The trusted basis for server-side repricing —
   * `labels` are display text and `key` embeds free-text notes, so neither can
   * be parsed back reliably.
   */
  choiceIds: string[];
};

/**
 * Untrusted wire shape sent to the server at checkout. Prices are deliberately
 * absent: the server rebuilds every unit price from the menu.
 */
export type CheckoutLineInput = {
  itemId: string;
  choiceIds: string[];
  qty: number;
  notes: string;
};

export type CheckoutPayload = {
  service: Service;
  lines: CheckoutLineInput[];
  name: string;
  phone: string;
  email: string;
  address: string;
  /** `cash` = pay on collection. `card` is the online channel, not yet enabled. */
  paymentMethod: 'card' | 'cash';
};
