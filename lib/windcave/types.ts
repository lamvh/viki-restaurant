// Windcave REST (online / Hosted Payment Page) wire types.
//
// Unrelated to `hit-types.ts`: that channel is XML and card-present, this one is
// JSON and card-not-present. They share nothing but a vendor.

export type WindcaveLink = {
  href: string;
  rel: string;
  method: string;
};

export type WindcaveCard = {
  cardHolderName?: string;
  cardNumber?: string;
  type?: string;
};

export type WindcaveTransaction = {
  id?: string;
  /** The authorisation outcome. The only field that decides success. */
  authorised?: boolean;
  responseText?: string;
  reCo?: string;
  authCode?: string;
  /** Two-decimal string, e.g. "12.50" — not cents, unlike the terminal channel. */
  amount?: string;
  currency?: string;
  card?: WindcaveCard;
  liabilityIndicator?: string;
};

export type WindcaveSession = {
  id: string;
  /** `init` → `pending` → `complete`. Complete does NOT mean paid. */
  state?: string;
  type?: string;
  amount?: string;
  currency?: string;
  merchantReference?: string;
  links?: WindcaveLink[];
  transactions?: WindcaveTransaction[];
};

export type CreateSessionInput = {
  /** Two-decimal string, e.g. "12.50". Never a JS number. */
  amount: string;
  currency: string;
  merchantReference: string;
  callbackUrls: { approved: string; declined: string; cancelled: string };
  notificationUrl: string;
  customer?: { email?: string; phoneNumber?: string };
};
