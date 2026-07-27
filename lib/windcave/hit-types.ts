// Windcave HIT (Host Initiated Transactions) wire types.
// Envelope verified against the PXHIT specification, v2.3.

/** A terminal soft button. `enabled` mirrors the `en` attribute. */
export type HitButton = {
  enabled: boolean;
  /** Label to render, e.g. "CANCEL". Empty when the terminal offers no label. */
  label: string;
};

/**
 * The `Result` block, present only once a transaction completes. Windcave uses
 * two-letter field codes; these are the readable equivalents.
 */
export type HitResult = {
  /** `AP` — the authorisation outcome. The only field that decides success. */
  authorised: boolean;
  /** `AC` — acquirer authorisation code. */
  authCode?: string;
  /** `RC` — response code. */
  responseCode?: string;
  /** `RT` — human-readable response text, e.g. "APPROVED". */
  responseText?: string;
  /** `TR` — DpsTxnRef, Windcave's unique transaction id. */
  transactionId?: string;
  /** `CN` — masked card number. */
  cardNumber?: string;
  /** `CT` — card type name, e.g. "Visa". */
  cardType?: string;
  /** `CH` — cardholder name. */
  cardHolder?: string;
  /** `AmtA` — transaction amount **in cents**. */
  amountCents?: number;
  /** `AmtS` — surcharge **in cents**. */
  surchargeCents?: number;
  /** `AmtT` — tip/gratuity **in cents**. Expected to always be 0 for Viki. */
  tipCents?: number;
  /** `AmtC` — cash-out **in cents**. */
  cashOutCents?: number;
};

export type HitStatus = {
  /** `Complete` — true once the terminal has finished. The polling terminator. */
  complete: boolean;
  /** `StatusId` — session-level stage. */
  statusId?: string;
  /** `TxnStatusId` — transaction-level stage; 8 = display result. */
  txnStatusId?: string;
  /** `TxnRef` echoed back by the terminal. */
  txnRef?: string;
  /** `ReCo` — top-level response code, often empty until completion. */
  reCo?: string;
  /** `Tmo` — the terminal's own timeout hint, in seconds. */
  timeoutSeconds?: string;
  /** `DL1` / `DL2` — the terminal's display lines. Render verbatim. */
  dl1?: string;
  dl2?: string;
  /** `B1` / `B2` — soft buttons offered to the operator. */
  b1?: HitButton;
  b2?: HitButton;
  /** `Rcpt` — receipt text, present on completion. */
  receipt?: string;
  result?: HitResult;
  /**
   * The unparsed response body. Diagnostics only — when the envelope is wrong
   * the parsed fields come back `undefined` and hide the reason, so the raw XML
   * is the only thing that shows it. Never rendered to customers.
   */
  raw?: string;
};

export type PurchaseInput = {
  /** `D.CC` string, e.g. "12.50". Never a JS number. */
  amount: string;
  currency: string;
  /** Unique per attempt. Reusing one replays the previous result. */
  txnRef: string;
  /** Optional merchant reference echoed on the transaction. */
  merchantReference?: string;
};

/** The value a soft-button press reports back to the terminal. */
export type HitButtonValue = 'YES' | 'NO' | 'CANCEL';
