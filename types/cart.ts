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
};

export type Order = {
  /** Mock order number, e.g. "VK-4821". */
  number: string;
  total: number;
  points: number;
  service: Service;
  eta: string;
  /** Epoch ms when the order was placed. */
  placedAt: number;
};
