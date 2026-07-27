# Windcave Integration Reference

Standing reference for Viki's Windcave account. Captured from the Windcave
onboarding emails so they never need to be re-supplied.

Viki uses **two separate Windcave channels**:

| Channel | What it is | Status |
|---|---|---|
| **Terminal payment** (HIT) | Card-present, on the physical CHU200TP reader | **Active** — [spec](./superpowers/specs/2026-07-27-viki-terminal-payment-design.md) · [plan](../plans/20260727-viki-terminal-payment/plan.md) |
| **Online payment** (REST / HPP) | Card-not-present, hosted page at checkout | ⏸️ On hold — [spec](./superpowers/specs/2026-07-27-viki-online-payment-design.md) · [plan](../plans/20260727-viki-online-payment/plan.md) |

> **Secrets rule.** This file records **identifiers only** — usernames, endpoints,
> merchant ids, station ids, test cards. API keys and Payline passwords are
> **never** written here, in any other tracked file, or in chat. They live in
> `.env.local` (git-ignored) and in the hosting provider's environment settings.

> ## 🔴 Rotate these before first use
>
> The terminal onboarding email transmitted the **`ScrHITKey`** and the
> **`VinapageUAT_Payline` password** in plain text through an untrusted channel,
> and they were subsequently pasted into a chat transcript.
>
> **Rotate both in Payline before wiring up the integration.** Otherwise the first
> thing the new code does is authenticate with a leaked credential. Neither value
> appears anywhere in this repository.

---

## 1. Account + credential map

| | |
|---|---|
| Customer ID | `144852` — quote this in every support email |
| Environment | **UAT / test** (production account is separate and not yet issued) |
| Payline portal | https://uat.windcave.com/pxmi3/logon |
| Password reset | https://uat.windcave.com/pxmi3/forgotpassword |
| Account email | `lamvh233@gmail.com` |
| Dev support | `devsupport@windcave.com` |

Payline is Windcave's web portal for reporting, refunds, and account admin.

**There are three separate logins.** Confusing them is the most likely early
mistake, so:

| Username | Purpose | Secret | Used by |
|---|---|---|---|
| `VinapageUAT_API` | REST API — online channel | API key, generated in Payline | `WINDCAVE_API_KEY` |
| `VinapageUAT_HIT` | HIT — terminal channel | `ScrHITKey` — **rotate**, see above | `WINDCAVE_HIT_KEY` |
| `VinapageUAT_Payline` | Portal login only | Password — **rotate**, see above | Humans, not code |

### Rolling a key

Done from Payline; see Windcave's "Generating or Rolling API credentials" guide.
Rolling **invalidates the old key** — update `.env.local` and the hosting
environment in the same sitting. A REST key is only fully visible once, so store
it immediately.

---

## 2. Endpoints

| Environment | Base URL |
|---|---|
| UAT | `https://uat.windcave.com/api/v1` |
| Production | `https://sec.windcave.com/api/v1` |

| Call | Method | Path |
|---|---|---|
| Create session | `POST` | `/sessions` — returns **202**, not 200 |
| Query session | `GET` | `/sessions/{sessionId}` |

**Authentication** is HTTP Basic:

```
Authorization: Basic base64("<username>:<apiKey>")
```

---

## 3. Environment variables

| Variable | Value | Where it comes from |
|---|---|---|
| `WINDCAVE_API_URL` | `https://uat.windcave.com/api/v1` | This document |
| `WINDCAVE_USERNAME` | `VinapageUAT_API` | This document |
| `WINDCAVE_API_KEY` | *(secret)* | Generated in Payline. `.env.local` only |
| `WINDCAVE_CURRENCY` | `NZD` | Fixed |
| `WINDCAVE_NOTIFICATION_BASE_URL` | Public HTTPS origin | Tunnel in dev; site origin in prod |

`WINDCAVE_API_KEY` is **server-only**. It must never be prefixed `NEXT_PUBLIC_`.
`lib/windcave/*` carries a `server-only` guard so a stray client import fails the
build rather than shipping the key to browsers.

`WINDCAVE_NOTIFICATION_BASE_URL` must be **publicly reachable over HTTPS** —
Windcave's servers call it directly. `localhost` will silently never receive
notifications. In local development use a tunnel (`cloudflared tunnel --url
http://localhost:3000`, or ngrok) and set this to the tunnel origin. A Vercel
preview deployment works equally well and is more stable.

---

## 4. Online channel (REST / HPP) — integration shape ⏸️

Viki uses the **Hosted Payment Page (HPP) redirect**. The server creates a
session, the customer is redirected to Windcave's page, pays, and returns.

```
POST /sessions
  type: "purchase"          amount: "12.50"   ← string, two decimals, never a number
  currency: "NZD"           merchantReference: "VK-XXXXXX"
  callbackUrls: { approved, declined, cancelled }
  notificationUrl: ".../api/windcave/fprn?t=<notification_token>"

→ 202 { id, state: "init", links: [ {rel:"self"}, {rel:"hpp"}, {rel:"submitCard"} ] }
```

Redirect the customer to `links[rel="hpp"].href`.

**Store and pass the `links` array through intact.** Windcave explicitly
recommends not reconstructing it — it is also what makes a later swap to the
Drop-In component a frontend-only change.

### Routes in this app

| Route | Purpose |
|---|---|
| `/order/return/[token]` | Where Windcave sends the customer back. Reconciles, then redirects |
| `/api/windcave/fprn` | FPRN webhook. Always answers 200 |
| `/order/[token]` | Server-rendered confirmation, `noindex` |

### Trust model — read this before changing payment code

**Neither the callback query param nor the FPRN body is evidence of payment.**
Both are *"something happened, go look"* triggers. A customer can hand-edit
`?outcome=approved`; an FPRN POST is unsigned and forgeable.

Only a server-side **query-session** decides. An order is marked paid when
**both** hold:

1. `transactions[0].authorised === true`, and
2. the session amount **equals the stored order total**.

`state: "complete"` does **not** mean paid — a declined card also completes.

---

## 5. Fail Proof Result Notification (FPRN)

Server-side notification so the payment outcome is captured even when the
customer closes the browser before returning. **Already enabled on this account.**

Windcave POSTs to the `notificationUrl` given at session creation. Viki's handler
resolves the order by an unguessable `notification_token`, then re-queries the
session for the authoritative result. It always returns `200` — a non-2xx makes
Windcave retry, and an unknown token must not be distinguishable from a known one.

---

## 6. Test cards (UAT only)

**3D Secure:**

| | |
|---|---|
| Number | `5588 8800 0007 7770` |
| Secure Code | `123` |
| Expiry | any future date |

Non-3DS test cards are listed on Windcave's test card page. Test cards work
**only** against the UAT endpoint.

---

## 7. Wallets

| | Status |
|---|---|
| Google Pay MID | `ab835b880af09ec86e546aad9b7c69ce2336b189` |
| Apple Pay | **Not yet available.** Requires completing Windcave's domain-registration steps 1–2, after which Windcave issues an Apple Pay MID |

Because payment happens on Windcave's domain under HPP, wallets can be enabled
later with **no code change** on our side.

---

## 8. Terminal channel (HIT) — card present

**This is the active channel.** HIT (Host Initiated Transactions) drives the
physical card reader over HTTPS.

### Hardware

| | |
|---|---|
| Model | CHU200TP (`AB0273-A36`) |
| Serial / StationID | `3425240086` |
| Purchase order | `43057` |
| Status | ✅ **Received and on hand** (2026-07-27) |
| Tracking (historical) | https://nzcouriers.co.nz/tools/track-a-parcel/ — barcode `WNZC00005702` |

Units are inspected for tampering before packaging. **If the seal is broken or
missing, call Windcave Support before powering the unit on.** After receipt,
the Acquirer's security standards and
[PCI standards](https://www.pcisecuritystandards.org/pdfs/PCISSC_SMB_Flyer_-web.pdf)
apply.

Windcave terminals are certified to EMVCo contact/contactless specifications and
carry Mastercard TQM labels —
[details](https://www.windcave.com/emvco-certifications-and-tqm-labels).

### Endpoints

| Purpose | Environment | Address |
|---|---|---|
| POS → Windcave (our app) | UAT | `https://uat.windcave.com/hit/pos.aspx` |
| POS → Windcave (our app) | Production | `https://sec.windcave.com/hit/pos.aspx` |
| Terminal → Windcave (the device) | UAT | `uatscr.windcave.com` TCP port **65** |
| Terminal → Windcave (the device) | Production | `scr.windcave.com` TCP port **65** |

The device's outbound TCP path is a **network requirement, not an app concern**.
If port 65 is blocked, the terminal never comes online and no application-side
work will help.

**Protocol spec:** https://www.windcave.com/Document/PXHIT.pdf

### Environment variables

| Variable | Value |
|---|---|
| `WINDCAVE_HIT_URL` | `https://uat.windcave.com/hit/pos.aspx` |
| `WINDCAVE_HIT_USER` | `VinapageUAT_HIT` |
| `WINDCAVE_HIT_KEY` | *(secret — rotate first)* |
| `WINDCAVE_HIT_STATION` | `3425240086` |
| `WINDCAVE_HIT_POS_NAME` | `Viki` |
| `WINDCAVE_HIT_POS_VERSION` | `1.0` |
| `WINDCAVE_HIT_VENDOR_ID` | **Required.** Assigned by Windcave — set in `.env.local`, no code default |

### Flow

XML over HTTPS POST. A `Purchase` starts the sale; `Status` requests poll it
roughly every second while the app renders the terminal's own `DL1`/`DL2` display
text and `B1`/`B2` soft-button labels, until `Complete=1` and the `Result` block
is populated.

**`Complete` terminates the loop — not `ReCo`.** `Amount` is a `D.CC` string.

### Envelope — confirmed against the live UAT terminal

Verified by running real transactions, not read off the spec. Several of these
contradict a plain reading of the documentation samples, so change them only with
evidence:

| Fact | Detail |
|---|---|
| Root element | `<Scr action="doScrHIT" user="…" key="…">` — **`user` and `key` are attributes**, not child elements |
| Field order | **Matters.** The service validates a sequence: `Amount, Cur, TxnType, Station, TxnRef, DeviceId, PosName, PosVersion, VendorId, MRef`. Wrong order is rejected |
| `VendorId` | **Required.** Omitting it returns `Missing tag VendorID`. Spec sample spells it `VendorId`; the error message spells it `VendorID` |
| Rejection envelope | `<Scr><Response Code="XX">message</Response><TransactionIsComplete>1</TransactionIsComplete></Scr>` — no `Complete`, no `ReCo`, no `Result`. Must be parsed separately or the reason is lost |
| `Complete` | Two spellings in play: `Complete` on a normal reply, `TransactionIsComplete` on a rejection |
| Button press | A **separate `TxnType=UI`** request (`UiType=Bn`, `Name`, `Val`) — not a field on Status |
| `B1`/`B2` | Elements with an `en` attribute (`1` = enabled); the label is the text content |
| Result fields | Two-letter codes: `AP` (1/0 approved), `AC`, `RC`, `RT`, `TR`, `CN`, `CT` |
| Result amounts | `AmtA`, `AmtS`, `AmtT` are **integer cents**, not `D.CC` strings |
| Printing | The CHU200TP **has a thermal printer** and prints its own card receipt, but **HIT cannot send arbitrary content to it**. `TxnType=Receipt` only *retrieves* the EFTPOS receipt text (`Rcpt`, width `RcptW`) for the POS to print. An itemised food bill therefore prints from the POS, not the device |
| Cancelling | **No `Cancel` TxnType exists.** A sale can be stopped from the POS only while the terminal offers a button (`Val=CANCEL`); otherwise it must be cancelled on the device |
| `PJ` | "TxnRef not matched" — the transaction was never registered, usually because the Purchase itself was rejected |

### Behaviour confirmed for this account

| | |
|---|---|
| Split bill | **Not used** — one order, one payment, full amount |
| Tipping | **Off.** A tip would exceed the order total and trip the amount-mismatch guard |

### Routes in this app

| Route | Purpose |
|---|---|
| `/admin/orders` | Staff order list; start a charge or settle as cash |
| `/api/admin/terminal/status` | Staff-guarded poll relay — the browser never talks to Windcave |
| `/order/[token]` | Customer confirmation, `noindex` |

---

## 9. Going live — two separate certifications

Windcave certifies each channel independently. **Both are external turnarounds
that gate production regardless of how finished the code is.** Development and
UAT testing need neither.

| Channel | Certification | When to book |
|---|---|---|
| Terminal (HIT) | **POS certification** | **Now** — Windcave asks for as much notice as possible |
| Online (REST / HPP) | **eCom certification** | When that milestone resumes |

Production also requires a separate production account, credentials, and the
`sec.windcave.com` endpoints — none of which are issued yet.

---

## 10. Reference links

| | |
|---|---|
| REST API overview | https://www.windcave.com/developer-e-commerce-api-rest |
| Drop-In guide | https://www.windcave.com/developer-ecommerce-drop-in |
| Developer docs index | https://www.windcave.com/developer-documentation |
| Postman collection | https://www.postman.com/windcave-api/windcave/folder/hx6wvku/hosted-payment-page |

---

## 11. Not integrated (deliberately)

Tokenisation / stored cards, subscriptions and rebilling, refunds via API (use
Payline), and the Drop-In / Hosted Fields surfaces. Windcave supports all of
them; see [`../plans/backlog.md`](../plans/backlog.md) for where each sits.

Windcave also offers a subscription API — ask your account contact for the
details if recurring billing is ever needed.
