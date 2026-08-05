# Windcave HIT — Card Terminal Integration Guide

**What this is.** A complete, self-contained engineering guide to integrating a
Windcave **card-present** terminal (SCR / CHU200 family) into any POS or web
application over **HIT** — Host Initiated Transactions.

**Who it's for.** Any developer wiring a physical Windcave reader to an
application, in any language or framework. Nothing here depends on a particular
codebase, stack, or database.

**Where the facts come from.** Windcave's PXHIT specification (v2.3), plus
behaviour **confirmed by running real transactions against live UAT hardware**.
Confirmed behaviour is marked ✅ where it **contradicts a plain reading of the
specification samples** — and several things do. Trust the confirmed value.

| | |
|---|---|
| Protocol spec (PDF) | https://www.windcave.com/Document/PXHIT.pdf |
| Developer docs index | https://www.windcave.com/developer-documentation |
| Dev support | `devsupport@windcave.com` |

> ### Secrets rule
>
> This document contains **identifiers only** — usernames, endpoints, merchant
> ids, station ids, test cards. API keys (`ScrHITKey`) and Payline passwords are
> never written into documentation, source, tickets, or chat. They belong in a
> git-ignored environment file and in the hosting provider's secret store.
>
> If a key has ever travelled through an untrusted channel — an onboarding email,
> a pasted chat transcript — **rotate it in Payline before writing any code
> against it.** Otherwise the first thing a new integration does is authenticate
> with a leaked credential.

---

## Contents

1. [What HIT is, and what it is not](#1-what-hit-is-and-what-it-is-not)
2. [Prerequisites](#2-prerequisites)
3. [The shared test rig](#3-the-shared-test-rig)
4. [API specification](#4-api-specification)
5. [Transaction lifecycle](#5-transaction-lifecycle)
6. [Implementation patterns that matter](#6-implementation-patterns-that-matter)
7. [What to persist](#7-what-to-persist)
8. [Failure and recovery matrix](#8-failure-and-recovery-matrix)
9. [Receipts and printing](#9-receipts-and-printing)
10. [Configuration](#10-configuration)
11. [Deliberately out of scope](#11-deliberately-out-of-scope)
12. [Testing](#12-testing)
13. [Going live](#13-going-live)
- [Appendix A — Reference implementation (pseudocode)](#appendix-a--reference-implementation-pseudocode)
- [Appendix B — The online channel (REST / HPP)](#appendix-b--the-online-channel-rest--hpp)
- [Appendix C — Reference links](#appendix-c--reference-links)

---

## 1. What HIT is, and what it is not

HIT drives a **physical card reader** over HTTPS. Your server posts XML to a
Windcave endpoint, then **polls a Status endpoint roughly once a second**,
rendering the terminal's own display text and soft-button labels to the
operator, until the service reports the transaction complete.

| | HIT (card present) | REST / HPP (card not present) |
|---|---|---|
| Customer | At the counter, taps/inserts a card | On a web page, redirected to Windcave |
| Wire format | XML over HTTPS POST | JSON over HTTPS |
| Shape | Stateful, chatty, long-polled | Fire-and-forget + webhook |
| Failure recovery | Re-poll a persisted `TxnRef` | FPRN webhook + query-session |
| Credential | `ScrHITKey` | API key |
| Certification | **POS certification** | **eCom certification** |

They are separate integrations with separate credentials and separate
certifications. Appendix B covers the online channel.

**HIT is not offline-capable.** There is no store-and-forward. If the terminal is
unreachable, the payment fails and must be retried.

**HIT is not a printer API.** See §9.

---

## 2. Prerequisites

### 2.1 Network — check this before writing any code

Two independent network paths exist, and only one is your application's concern:

| Path | Direction | Requirement |
|---|---|---|
| **POS → Windcave** | Your **server** → `https://…/hit/pos.aspx` | Ordinary outbound HTTPS (443) |
| **Terminal → Windcave** | The **device** → `uatscr.windcave.com` / `scr.windcave.com` | **Outbound TCP port 65** |

If port 65 is blocked on the network the terminal sits on, **the terminal never
comes online and no application-side work will help.** Confirm the device shows
an idle/ready screen before debugging anything else.

### 2.2 Hardware handling

Units ship sealed and are inspected for tampering before packaging. **If the seal
is broken or missing, call Windcave Support before powering the unit on.** After
receipt, the acquirer's security standards and
[PCI standards](https://www.pcisecuritystandards.org/pdfs/PCISSC_SMB_Flyer_-web.pdf)
apply. Windcave terminals are certified to EMVCo contact/contactless specs and
carry Mastercard TQM labels —
[details](https://www.windcave.com/emvco-certifications-and-tqm-labels).

### 2.3 Three separate logins

Confusing these is the most common early mistake. Windcave issues **one login per
channel, plus a portal login**, and they are not interchangeable:

| Login suffix | Purpose | Secret | Consumed by |
|---|---|---|---|
| `…_HIT` | HIT — terminal channel | `ScrHITKey` | Application config |
| `…_API` | REST API — online channel | API key, generated in Payline | Application config |
| `…_Payline` | Portal login only | Password | Humans, not code |

**Payline** is Windcave's web portal for reporting, refunds, and account admin.
Rolling a key there **invalidates the old one immediately** — update the local
environment and the hosting environment in the same sitting. A REST key is fully
visible only once, so store it the moment it is generated.

---

## 3. The shared test rig

One physical terminal is available for development and testing across projects.
**These values are shared — they are not per-project.**

| | |
|---|---|
| Model | CHU200TP (`AB0273-A36`) |
| Serial / `StationID` | **`3425240086`** |
| Environment | UAT / test only |
| Windcave customer ID | `144852` — quote in every support email |
| Payline portal | https://uat.windcave.com/pxmi3/logon |
| Password reset | https://uat.windcave.com/pxmi3/forgotpassword |

**Because there is exactly one terminal, there is exactly one station.** Two
projects — or two developers — cannot run transactions simultaneously; the device
will simply be busy. Coordinate access before testing.

### 3.1 Endpoints

| Purpose | Environment | Address |
|---|---|---|
| POS → Windcave (your app) | UAT | `https://uat.windcave.com/hit/pos.aspx` |
| POS → Windcave (your app) | Production | `https://sec.windcave.com/hit/pos.aspx` |
| Terminal → Windcave (the device) | UAT | `uatscr.windcave.com` TCP **65** |
| Terminal → Windcave (the device) | Production | `scr.windcave.com` TCP **65** |

### 3.2 Test cards

3D Secure test card:

| | |
|---|---|
| Number | `5588 8800 0007 7770` |
| Secure Code | `123` |
| Expiry | any future date |

Non-3DS test cards are listed on Windcave's test card page. **Test cards work
only against UAT endpoints.** To exercise a decline, use a card or amount
designated for that purpose in Windcave's test data — do not assume an arbitrary
number declines cleanly.

---

## 4. API specification

### 4.1 Transport

| | |
|---|---|
| Method | `POST` |
| URL | `https://uat.windcave.com/hit/pos.aspx` (UAT) |
| `Content-Type` | `application/xml` |
| Body | A single `<Scr>` XML document, UTF-8 |
| Success | HTTP `200` with an XML body |
| Caching | Must be disabled — every request is a state query |
| Timeout | **≥ 15 s.** A card prompt can sit for a while; terminals are slower than web APIs |

Every interaction — starting a sale, polling it, pressing a button, fetching a
receipt — is the same POST to the same URL. Only `TxnType` differs.

A non-`200` response is a **transport error**, not a decline. See §6.9.

### 4.2 Authentication

Credentials travel as **attributes on the root element**, in every request:

```xml
<Scr action="doScrHIT" user="YOUR_HIT_USER" key="YOUR_SCR_HIT_KEY">
```

| Attribute | Value |
|---|---|
| `action` | Always the literal `doScrHIT` |
| `user` | Your `…_HIT` username |
| `key` | Your `ScrHITKey` |

> ✅ **Confirmed against live UAT.** `user` and `key` are **attributes**, not child
> elements. The specification's prose can be read either way. Sending them as
> child elements fails.

There is no HTTP `Authorization` header, no bearer token, and no session. Every
request is independently authenticated by these two attributes — which is why
§6.10 (redaction) matters so much: the key is on the root element of every
single request body.

### 4.3 Request envelope and the field-order rule

```xml
<Scr action="doScrHIT" user="…" key="…">
  <FieldA>value</FieldA>
  <FieldB>value</FieldB>
  …
</Scr>
```

> ✅ **Confirmed: element order matters.** The service validates the child
> elements against an expected sequence. A request with every correct field in
> the wrong order is **rejected**.

Practical consequences:

- Build the request from an **ordered** structure (an array of pairs, an ordered
  map, or a hand-written template). Do not build it from a hash whose iteration
  order is unspecified.
- Do not let an XML serialiser sort or normalise element order.
- Omit optional fields entirely rather than emitting them empty — an empty
  element in the wrong place is still a wrongly-ordered element.

The per-transaction order is given in §4.5–4.8. Follow it literally.

### 4.4 Common field reference

Fields shared across transaction types. Every value is a **string** on the wire.

| Field | Type / format | Required | Notes |
|---|---|---|---|
| `Amount` | `D.CC` string, e.g. `12.50` | Purchase | **Never a number.** Always two decimals. `12.5` and `12` are wrong |
| `Cur` | ISO-4217 alpha-3, e.g. `NZD` | Purchase | Must match what the MID is configured for |
| `TxnType` | `Purchase` \| `Status` \| `UI` \| `Receipt` \| `Refund` | All | See §4.5–4.8 |
| `Station` | Numeric station id, e.g. `3425240086` | All | The terminal's serial. One station per terminal |
| `TxnRef` | Your unique reference, string | All | **Unique per attempt.** The recovery key — see §6.1, §6.2 |
| `DeviceId` | String | Purchase | Identifies the POS device/lane |
| `PosName` | String | Purchase | Your POS software name |
| `PosVersion` | String, e.g. `1.0` | Purchase | Your POS software version |
| `VendorId` | String, assigned by Windcave | Purchase | **Required — see below** |
| `MRef` | String | Optional | Merchant reference echoed onto the transaction; appears in Payline |

#### `VendorId` — the one that bites

> ✅ **Confirmed: `VendorId` is required.** Omitting it returns
> `Missing tag VendorID`.
>
> Note the capitalisation mismatch: **the specification sample writes `VendorId`;
> the error message writes `VendorID`.** Send `VendorId` — that is what the
> service accepts.

Give this config value **no default in code**. A placeholder is accepted in UAT
and rejected in production, which is the worst possible moment to discover it.
Fail loudly at configuration-read time instead.

### 4.5 `TxnType=Purchase` — start a sale

Begins a transaction on the terminal. The terminal wakes, displays the amount,
and waits for a card.

**Field order — exactly this sequence:**

```
Amount, Cur, TxnType, Station, TxnRef, DeviceId, PosName, PosVersion, VendorId, MRef
```

```xml
<Scr action="doScrHIT" user="YOUR_HIT_USER" key="YOUR_SCR_HIT_KEY">
  <Amount>12.50</Amount>
  <Cur>NZD</Cur>
  <TxnType>Purchase</TxnType>
  <Station>3425240086</Station>
  <TxnRef>ORD-000123-1</TxnRef>
  <DeviceId>LANE-01</DeviceId>
  <PosName>MyPos</PosName>
  <PosVersion>1.0</PosVersion>
  <VendorId>ASSIGNED_BY_WINDCAVE</VendorId>
  <MRef>ORD-000123</MRef>
</Scr>
```

**Response.** A normal `<Scr>` envelope (§4.9), typically with `Complete=0` — the
sale has started and is now in flight. **The Purchase response is not the
result.** Move immediately to polling.

If the Purchase is rejected (§4.11), **no transaction exists**. A subsequent
`Status` on that `TxnRef` returns `PJ` ("TxnRef not matched"), which is a
symptom, not the cause — read the Purchase response for the real reason.

### 4.6 `TxnType=Status` — poll an in-flight sale

The workhorse. Called roughly once a second until the transaction completes.

**Field order:**

```
Station, TxnType, TxnRef
```

```xml
<Scr action="doScrHIT" user="YOUR_HIT_USER" key="YOUR_SCR_HIT_KEY">
  <Station>3425240086</Station>
  <TxnType>Status</TxnType>
  <TxnRef>ORD-000123-1</TxnRef>
</Scr>
```

**Response.** A normal `<Scr>` envelope carrying the terminal's current display
lines and buttons, and — once finished — `Complete=1` plus a `<Result>` block.

A `Status` request is **safe to repeat indefinitely** and safe to issue after
completion. It is the mechanism that makes an interrupted sale recoverable: as
long as you kept the `TxnRef`, you can always ask what happened. See §6.1.

### 4.7 `TxnType=UI` — relay a soft-button press

> ✅ **Confirmed: a button press is a separate request**, not a field on
> `Status`. Polling and pressing are distinct calls.

**Field order:**

```
Station, TxnType, UiType, Name, Val, TxnRef
```

```xml
<Scr action="doScrHIT" user="YOUR_HIT_USER" key="YOUR_SCR_HIT_KEY">
  <Station>3425240086</Station>
  <TxnType>UI</TxnType>
  <UiType>Bn</UiType>
  <Name>B2</Name>
  <Val>CANCEL</Val>
  <TxnRef>ORD-000123-1</TxnRef>
</Scr>
```

| Field | Values | Meaning |
|---|---|---|
| `UiType` | `Bn` | Button interaction |
| `Name` | `B1` \| `B2` | Which soft button was pressed |
| `Val` | `YES` \| `NO` \| `CANCEL` | The value the press reports back |

Only press a button the terminal is currently **offering** (`en="1"` in the last
`Status` response). Pressing one that is not offered is meaningless.

**Response.** Same envelope as `Status` — treat the reply as a status update and
finalise if it reports `Complete=1`.

### 4.8 `TxnType=Receipt` — retrieve EFTPOS receipt text

**Field order:**

```
Station, TxnType, TxnRef, DuplicateFlag, ReceiptType
```

```xml
<Scr action="doScrHIT" user="YOUR_HIT_USER" key="YOUR_SCR_HIT_KEY">
  <Station>3425240086</Station>
  <TxnType>Receipt</TxnType>
  <TxnRef>ORD-000123-1</TxnRef>
  <DuplicateFlag>0</DuplicateFlag>
  <ReceiptType>2</ReceiptType>
</Scr>
```

| Field | Values | Meaning |
|---|---|---|
| `DuplicateFlag` | `0` \| `1` | `1` marks the copy as a reprint |
| `ReceiptType` | integer | Receipt variant; check the PXHIT PDF for the full list |

**Response** carries `Rcpt` (the receipt text) and `RcptW` (its intended
character width). This only **retrieves** text — see §9.

### 4.9 Response envelope reference

```xml
<Scr>
  <Complete>0</Complete>
  <StatusId>…</StatusId>
  <TxnStatusId>4</TxnStatusId>
  <TxnRef>ORD-000123-1</TxnRef>
  <ReCo></ReCo>
  <Tmo>60</Tmo>
  <DL1>PRESENT CARD</DL1>
  <DL2>$12.50</DL2>
  <B1 en="0"/>
  <B2 en="1">CANCEL</B2>
</Scr>
```

| Element | Type | Present | Meaning |
|---|---|---|---|
| `Complete` | `0` \| `1` | Normal replies | **The poll terminator.** `1` = the terminal has finished |
| `TransactionIsComplete` | `0` \| `1` | **Rejections only** | The rejection envelope's completion flag — §4.11 |
| `StatusId` | string | Usually | Session-level stage |
| `TxnStatusId` | string | Usually | Transaction-level stage. `8` = displaying result |
| `TxnRef` | string | Usually | Echoed back. Verify it matches what you sent |
| `ReCo` | string | Usually | Top-level response code. **Often empty until completion** |
| `Tmo` | integer seconds | Sometimes | The terminal's own timeout hint |
| `DL1`, `DL2` | string | While in flight | The terminal's two display lines |
| `B1`, `B2` | element + `en` attr | While in flight | Soft buttons — see below |
| `Rcpt` | string | On `Receipt`, and on completion | EFTPOS receipt text |
| `RcptW` | integer | With `Rcpt` | Receipt width in characters |
| `Result` | element | **On completion only** | §4.10 |
| `Response` | element + `Code` attr | **Rejections only** | §4.11 |

#### `Complete` is the terminator — not `ReCo`

> ✅ **Confirmed.** `ReCo` is frequently empty right up until the end. Looping on
> it produces a poll that either never terminates or terminates early. Loop on
> `Complete` (and `TransactionIsComplete`).

#### `DL1` / `DL2` — render verbatim

These are the terminal's **own** display lines. Show them to the operator
unmodified. Do not substitute your own prompt text: the operator's screen and the
customer-facing device should say the same thing at the same time, or staff will
give customers wrong instructions.

#### `B1` / `B2` — soft buttons

```xml
<B1 en="0"/>                  <!-- disabled, no label -->
<B2 en="1">CANCEL</B2>        <!-- enabled, label is the TEXT CONTENT -->
```

> ✅ **Confirmed.** The `en` attribute is the enabled flag (`1` = enabled); the
> **label is the element's text content**, not an attribute.

When neither button is enabled, the POS has nothing it can press — including no
way to cancel. See §4.12.

### 4.10 `<Result>` block reference

Present **only once a transaction completes**:

```xml
<Result>
  <AP>1</AP>
  <AC>123456</AC>
  <RC>00</RC>
  <RT>APPROVED</RT>
  <TR>000001234567</TR>
  <CN>411111........1111</CN>
  <CT>Visa</CT>
  <CH>CARDHOLDER NAME</CH>
  <AmtA>1250</AmtA>
  <AmtS>0</AmtS>
  <AmtT>0</AmtT>
  <AmtC>0</AmtC>
</Result>
```

| Code | Name | Type | Meaning |
|---|---|---|---|
| `AP` | Approved | `1` \| `0` | **The only field that decides success** |
| `AC` | Auth code | string | Acquirer authorisation code |
| `RC` | Response code | string | e.g. `00` |
| `RT` | Response text | string | Human-readable, e.g. `APPROVED`, `DECLINED`. **Show this to the operator on a decline** — it is the terminal's own wording |
| `TR` | Transaction ref | string | `DpsTxnRef` — Windcave's unique id. **Persist it**; it is how you find the transaction in Payline |
| `CN` | Card number | string | Masked |
| `CT` | Card type | string | e.g. `Visa` |
| `CH` | Cardholder | string | Name, when available |
| `AmtA` | Amount | **integer cents** | The authorised amount |
| `AmtS` | Surcharge | **integer cents** | |
| `AmtT` | Tip / gratuity | **integer cents** | |
| `AmtC` | Cash out | **integer cents** | |

> ✅ **Confirmed: requests use `D.CC` strings (`"12.50"`); Result amounts are
> integer cents (`1250`).** They are not the same representation. Mixing them
> silently produces a 100× comparison bug that passes every test where the amount
> happens to be zero.
>
> Compare with: `round(expected * 100) === AmtA`.

### 4.11 Rejection envelope — a completely different shape

When the service refuses a request outright (bad field, missing tag, wrong order,
bad credentials) it returns **neither `Complete`, nor `ReCo`, nor `Result`**:

```xml
<Scr>
  <Response Code="XX">Missing tag VendorID</Response>
  <TransactionIsComplete>1</TransactionIsComplete>
</Scr>
```

| Element | Meaning |
|---|---|
| `Response` (text) | The human-readable reason. **The only place it appears** |
| `Response/@Code` | The rejection code |
| `TransactionIsComplete` | `1` — this exchange is over |

Three consequences you must handle:

1. **The completion flag has two spellings** — `Complete` on a normal reply,
   `TransactionIsComplete` on a rejection. Treat either `= "1"` as terminal.
2. **The reason lives only in `<Response>`.** A parser that only knows the normal
   shape returns an object full of `undefined` and *no explanation*. Parse this
   shape explicitly.
3. **A rejection is not a declined card.** The request never reached the
   terminal; no money moved; nothing needs retrying at the card level. Surface it
   as a configuration/integration error, not as a payment outcome.

**Always keep the raw response body for diagnostics.** When the envelope is
wrong, the parsed fields hide the reason and the unparsed XML is the only thing
that shows it.

### 4.12 Cancelling — there is no cancel transaction

> ✅ **Confirmed: no `Cancel` TxnType exists.**

A sale can be stopped from the POS **only** while the terminal is offering a
button whose value is `CANCEL` — relayed as a `TxnType=UI` request (§4.7). If no
button is offered, the sale must be cancelled **on the device**.

Surface this honestly: disable the cancel control and say *why*. Staff who
believe a disabled button is a bug will try harder, worse things.

### 4.13 Data-type rules

| Rule | Why |
|---|---|
| Keep every parsed value a **string** until you deliberately convert | `"0"` coerces to a falsy number and will quietly turn `AP=0` into "no result at all" |
| Disable automatic type coercion in your XML parser | Same reason. Leading zeros in codes are also lost |
| An element may parse as a **string or an object** | `<B2 en="1">CANCEL</B2>` has both attributes and text. Handle both shapes when reading text content |
| Request amounts: `D.CC` string | `12.50`, never `12.5`, never a number |
| Result amounts: integer cents | `1250` |
| Compare booleans as strings | `AP === "1"`, not truthiness |

### 4.14 Worked example — one complete sale

**1 — Start.** POST `Purchase` for `12.50`, `TxnRef=ORD-000123-1`.

```xml
<Scr><Complete>0</Complete><TxnRef>ORD-000123-1</TxnRef>
     <TxnStatusId>2</TxnStatusId><ReCo></ReCo></Scr>
```

**2 — Poll (t+1s).** POST `Status`. Terminal is waiting for the card:

```xml
<Scr><Complete>0</Complete><TxnRef>ORD-000123-1</TxnRef>
     <DL1>PRESENT CARD</DL1><DL2>$12.50</DL2>
     <B1 en="0"/><B2 en="1">CANCEL</B2><Tmo>60</Tmo></Scr>
```

→ Render `PRESENT CARD` / `$12.50`. Enable a CANCEL button.

**3 — Poll (t+6s).** Card presented, processing:

```xml
<Scr><Complete>0</Complete><TxnRef>ORD-000123-1</TxnRef>
     <DL1>PROCESSING</DL1><DL2>PLEASE WAIT</DL2>
     <B1 en="0"/><B2 en="0"/></Scr>
```

→ Both buttons disabled: **the sale can no longer be cancelled from the POS.**
Update the UI to say so.

**4 — Poll (t+9s).** Complete:

```xml
<Scr><Complete>1</Complete><TxnRef>ORD-000123-1</TxnRef>
     <TxnStatusId>8</TxnStatusId><ReCo>00</ReCo>
     <Rcpt>… EFTPOS receipt text …</Rcpt><RcptW>32</RcptW>
     <Result><AP>1</AP><AC>123456</AC><RC>00</RC><RT>APPROVED</RT>
             <TR>000001234567</TR><CN>411111........1111</CN><CT>Visa</CT>
             <AmtA>1250</AmtA><AmtS>0</AmtS><AmtT>0</AmtT><AmtC>0</AmtC>
     </Result></Scr>
```

→ Stop polling. Verify `AP === "1"` **and** `AmtA === 1250` against your stored
total of `12.50`. Both hold → mark paid, persist `TR` and `Rcpt`.

**Decline instead** would be identical except:

```xml
<Result><AP>0</AP><RC>05</RC><RT>DECLINED</RT>…</Result>
```

→ Not paid. Show `RT` to the operator. The record stays chargeable; a retry
allocates `ORD-000123-**2**`.

### 4.15 Codes worth knowing

| Code | Where | Meaning |
|---|---|---|
| `PJ` | `ReCo` / status | **"TxnRef not matched"** — the transaction was never registered, usually because the `Purchase` itself was rejected. Look at the Purchase response, not this one |
| `TxnStatusId=8` | Response | Display-result stage |
| `AP=1` / `AP=0` | Result | Approved / declined |
| `RC=00` | Result | Typically approved |

The full `StatusId` / `TxnStatusId` / `ReCo` enumerations are in the PXHIT PDF.
**Do not branch on any code not listed above without confirming it against the
spec and, ideally, a live run** — the codes that matter operationally are
`Complete`, `AP`, and `AmtA`.

---

## 5. Transaction lifecycle

```
1. Allocate TxnRef = "{yourRef}-{attempt}"
2. PERSIST TxnRef  ←──────────────── before anything is sent   (§6.1)
3. Claim the transaction (conditional update — one terminal, one sale)  (§6.8)
4. POST TxnType=Purchase
5. Loop, ~1s interval, with an overlap guard and a hard cutoff (~120 ticks):
     POST TxnType=Status with the same TxnRef
       ├─ render DL1 / DL2 verbatim
       ├─ render B1 / B2 when en="1"   → press = POST TxnType=UI
       └─ until Complete = 1
6. Finalise (idempotently):
     AP=1 and AmtA matches expected → paid; persist TR, Rcpt
     AP=1 and AmtA differs          → DO NOT fulfil; flag for manual review  (§6.6)
     AP=0                           → declined; still retryable with a NEW ref
7. Optionally POST TxnType=Receipt to retrieve receipt text
```

---

## 6. Implementation patterns that matter

These are the non-obvious ones. Everything else is ordinary HTTP.

### 6.1 Persist `TxnRef` **before** the request goes out

If the client or the server process dies mid-transaction, **the card may still
have been charged.** The only way to find out is a `Status` request carrying that
same `TxnRef` — so the ref must survive the crash that loses everything else.
Writing it after the POST leaves a window in which money moved and the
application has no idea.

This is HIT's equivalent of the online channel's FPRN: the mechanism that makes
the outcome knowable when the happy path is interrupted.

Test it by **closing the client mid-sale, completing the payment on the terminal,
and reopening.** If the record does not end up paid, this is not implemented
correctly. Do not accept it by inspection.

### 6.2 A new `TxnRef` for every attempt

Reusing a ref **replays the previous result for ever** — a declined sale stays
declined no matter how many times it is retried. Keep an attempt counter and
derive the ref from it: `ORD-000123-1`, `ORD-000123-2`.

Make the stored ref **unique** at the database level. It is the recovery key; a
duplicate makes recovery ambiguous.

### 6.3 The amount comes from the server, never the request

Recompute the total server-side from authoritative prices and charge *that*. A
client that can name its own total can name zero. This applies equally to a
browser cart and to a counter till.

### 6.4 The client never talks to Windcave

The browser or till UI polls **your** endpoint; your server polls Windcave. Two
reasons:

- the `ScrHITKey` stays server-side; and
- you get to **re-check authorisation on every tick**, not once when the dialog
  opened.

An unguarded poll endpoint is a remote control for a card terminal sitting on a
public counter. Return `401` and perform **no** terminal interaction.

### 6.5 Look the `TxnRef` up from the stored record

Never take it from the request/query string. Otherwise an authenticated operator
can poll — or cancel — arbitrary transactions, including another lane's.

### 6.6 Authorised is not sufficient

Mark a payment complete only when **both** hold:

1. `AP = 1`, **and**
2. `AmtA` equals the amount you computed.

A mismatch means something changed underneath you. Record it, **refuse the
transition**, and route it to manual review in Payline. Deliberately provide **no
one-click "mark it paid anyway"** — an unexplained amount difference is not
something to paper over.

**Tipping, surcharging, and cash-out break this guard.** If any is enabled on the
MID, the authorised amount legitimately exceeds your total and the guard fires on
every sale. Decide explicitly: either disable them on the MID, or widen the
comparison to `AmtA - AmtT - AmtS - AmtC`. Silently loosening the check is the
wrong answer — it is the check that stops you fulfilling on a figure you did not
compute.

### 6.7 Finalisation must be idempotent

Two clients, a recovery re-poll, and a button press can all land on a transaction
that already finished. Make the completion write **conditional on the
pre-completion state** so concurrent finalises produce exactly one transition.

### 6.8 Concurrency: one terminal, one sale

Claim the transaction with a conditional update **before** posting. The loser of
the race gets told *"the terminal is busy"* — not shown a second prompt that will
never be answered.

### 6.9 A transport failure is not a decline

Distinguish them in your error types:

| | Retryable? |
|---|---|
| Network error, timeout, non-2xx, malformed XML | **Yes** — nothing is known about the card |
| Rejection envelope (§4.11) | Yes, after fixing the request. No transaction was created |
| `AP=0` decline | **No** — retry only as a deliberate new attempt with a new ref |

Retrying a decline silently is how a customer gets charged twice. On transport
failure, release the claim so the operator can retry deliberately, and keep the
ref for forensics.

### 6.10 Redact the key before logging anything

The key rides on the **root element of every request**. Any code path that logs,
displays, stores, or attaches request XML must strip it first:

```
xml.replace(/key="[^"]*"/g, 'key="***REDACTED***"')
```

**Never attach the request body to an exception object** — exceptions get logged,
serialised, and shipped to error trackers.

Do keep the **response** body for diagnostics; it contains no credentials and is
often the only thing that explains a rejection.

### 6.11 Bound the poll loop

- Interval ~1 s.
- **Guard against overlapping requests** if one outlives the interval.
- Stop after a hard cutoff (~120 ticks ≈ 2 minutes) rather than polling a dead
  terminal for ever.
- When the cutoff fires, tell the operator the sale can be **resumed** — it is
  not lost, because the ref is persisted (§6.1).
- Hiding or closing the progress UI must **not** be presented as cancelling. The
  sale keeps running on the terminal. Say so.

---

## 7. What to persist

Framework-agnostic minimum, per transaction:

| Field | Why |
|---|---|
| `txn_ref` | **Unique.** Written before the request. The recovery key |
| `attempt` | Increments per retry; feeds the ref |
| `amount` | The authoritative figure the terminal is asked for |
| `payment_status` | `pending` \| `paid` \| `unpaid` \| `failed` \| `cancelled` |
| `paid_at` | Set only on a completed payment |
| `transaction_id` | `TR` from the Result block. How you find it in Payline |
| `card_receipt` | `Rcpt` text, if you print an itemised bill (§9) |

Plus an **append-only event log** — one row per gateway interaction
(`started`, `start_failed`, `completed`, `amount_mismatch`, `settled_cash`, …)
storing the **raw payload**. This replaces a separate attempts table and is the
only thing that answers "what actually happened" after the fact.

**The event writer must never throw.** An audit failure must not fail a payment.

### State machine

`unpaid` and `failed` **both mean "not complete"**. Neither is terminal. Give the
operator three exits from either:

1. **Retry** the terminal charge (new `TxnRef`),
2. **Settle another way** (cash), recorded distinctly in the audit log,
3. **See the error** and escalate.

Only `paid` completes. Decide explicitly **who** is allowed to do (2) — it is the
one action that marks money received with no gateway record behind it.

---

## 8. Failure and recovery matrix

| Case | Expected behaviour |
|---|---|
| Terminal offline / unreachable | Claim released, status → `failed`, event logged, retry available |
| Card declined (`AP=0`) | Status → `failed`, still chargeable. Retry allocates a **new** `TxnRef` |
| Operator cancels via `B1`/`B2` | Declined; record untouched otherwise |
| Terminal offers no button | Cancel control disabled, **with an explanation**. Protocol limit, not a bug |
| Client closed mid-sale | Stays `pending` with `txn_ref` set. **Resume** re-polls the stored ref and reports the true outcome |
| Terminal unplugged mid-sale | Poll cutoff fires. Stays `pending` — **never** auto-marked paid |
| Two operators charge the same record | Conditional claim; loser told the terminal is busy. Exactly one `started` event |
| Poll without a valid session | `401`, no terminal interaction |
| Amount mismatch in the Result | Refuse the transition, record it, flag for manual review |
| Repeated finalise | Idempotent — exactly one transition |
| Envelope rejected (§4.11) | Surface `Response` text. **Not** a decline — the transaction never started |
| `Status` returns `PJ` | The `Purchase` was rejected. Read *that* response |

---

## 9. Receipts and printing

The terminal **has a thermal printer and prints its own card receipt**, but
**HIT cannot send arbitrary content to it.** `TxnType=Receipt` only *retrieves*
the EFTPOS receipt text (`Rcpt`, width `RcptW`) for the POS to print.

So an itemised bill prints from **your** POS, not from the device. If you want one
piece of paper showing both the items and the card transaction, **store `Rcpt` on
completion** and render it into your own printed bill. `Rcpt` also arrives on the
completing `Status` response, so a separate `Receipt` call is only needed for
reprints — pass `DuplicateFlag=1` to mark those.

---

## 10. Configuration

Generic variable names; adapt to your conventions.

```bash
WINDCAVE_HIT_URL=https://uat.windcave.com/hit/pos.aspx
WINDCAVE_HIT_USER=<the …_HIT login>
WINDCAVE_HIT_KEY=            # ScrHITKey — secret, server-only, never committed
WINDCAVE_HIT_STATION=3425240086
WINDCAVE_HIT_POS_NAME=<your POS name>
WINDCAVE_HIT_POS_VERSION=1.0
WINDCAVE_HIT_DEVICE_ID=<your device/lane id>
WINDCAVE_HIT_VENDOR_ID=      # REQUIRED. Assigned by Windcave. No code default
WINDCAVE_CURRENCY=NZD
```

Three rules:

- **The key is server-only.** Never expose it to a client bundle. If your
  framework has a server-only guard, apply it to the whole Windcave module so a
  stray client import fails the build rather than shipping the key to browsers.
- **Read configuration at request time, not at module load.** A missing value
  should fail one payment with a named, actionable error — not the whole build or
  the whole process.
- `USER`, `KEY`, `STATION`, `VENDOR_ID` are **required** and should throw by name
  when absent. The rest may have defaults — **except `VENDOR_ID`** (§4.4).

---

## 11. Deliberately out of scope

Windcave supports all of these; none are required for a working terminal
integration, and each carries its own complexity:

- **Refunds via HIT** (`TxnType=Refund`) — use Payline until there is a reason
  not to.
- **Multiple terminals** — one station per config is far simpler; add a station
  selector only when a second device exists.
- **Offline / store-and-forward** — not a HIT capability at all.
- **Tokenisation / stored cards, subscriptions, rebilling** — online-channel
  features.
- **Split bills and partial amounts** — one transaction, full amount, unless
  explicitly required. Partial amounts interact badly with §6.6.

---

## 12. Testing

### 12.1 Automated

Unit-test against a **mocked HTTP layer**. **No live terminal calls in CI** — the
terminal is shared, physical, and slow.

Worth covering:

- envelope build/parse round trip, including `DL1`/`DL2`/`B1`/`B2` extraction;
- **element order** is preserved by your builder;
- the **rejection envelope** shape (§4.11) yields a readable reason;
- `Complete=0` → keep polling; `Complete=1` → finalise;
- `TransactionIsComplete=1` also terminates;
- `AP=1` → paid; `AP=0` → not paid, still retryable;
- **amount mismatch refuses the transition**;
- cents-vs-`D.CC` comparison is correct at non-round amounts (e.g. `12.05`);
- `TxnRef` increments per attempt;
- repeated finalise is idempotent;
- `"0"` does not coerce to falsy anywhere.

### 12.2 Manual UAT — requires the physical terminal

None of the following can be verified by inspection. **Coordinate access first —
there is one device (§3).**

| # | Test | Pass condition |
|---|---|---|
| **T1** | Approved sale | Operator screen mirrors the terminal's own prompts, changing in step with the device. Record → paid; `TR` persisted |
| **T2** | Inspect the Result amounts | `AmtT`, `AmtS`, `AmtC` all read `0`. Anything else means tipping / surcharging / cash-out is enabled — see §6.6 |
| **T3** | Declined sale | Decline shown using the terminal's own `RT` text. Record → `failed`, still chargeable |
| **T4** | Retry after decline | Allocates `…-2`, **not** the same `TxnRef`. Verify the stored ref |
| **T5** | Operator cancel via soft button | Terminal aborts; record → `failed`. If no button is offered, the control is disabled and says why |
| **T6** | Terminal unplugged mid-sale | Poll reports no response and stops at the cutoff. Record stays `pending` — **not** paid |
| **T7** | **Client closed mid-sale** ⭐ | Close the client entirely, complete payment on the terminal, reopen. **Resume** appears and reports the true outcome. If the card was charged, the record must end up **paid** |
| **T8** | Unauthenticated poll | `401`. No terminal interaction occurs |
| **T9** | Concurrent charge | Second attempt refused ("terminal is busy"). Exactly one `started` event |
| **T10** | Tampered client payload | The charged amount equals the **server** recomputation. Unknown ids rejected outright |
| **T11** | Envelope rejection | Deliberately omit `VendorId`. `Missing tag VendorID` is surfaced, not swallowed as a decline |
| **T12** | Wrong field order | Deliberately reorder `Purchase` fields. Confirm it is rejected and the reason is visible |

**T7 is the test that justifies §6.1.** Do not mark it passed by inspection.

### 12.3 After the run

Record anything surprising **in this document**. Confirmed live behaviour is
worth more than the specification, and the next person should not have to
rediscover it.

---

## 13. Going live

Certification is per channel, and each is an **external turnaround that gates
production regardless of how finished the code is.** Neither blocks development
or UAT.

| Channel | Certification | When to book |
|---|---|---|
| Terminal (HIT) | **POS certification** | **At the start of the work** — Windcave asks for as much notice as possible |
| Online (REST / HPP) | **eCom certification** | When that channel is built |

Production additionally requires:

- a **separate production account** and credentials;
- production endpoints — `https://sec.windcave.com/hit/pos.aspx`, and
  `scr.windcave.com:65` from the device;
- **rotated** `ScrHITKey` and Payline password if either has ever been exposed;
- the **real** `VendorId` — the placeholder problem §4.4 exists to prevent;
- a **production station id** — the UAT terminal is not the production terminal.

---

## Appendix A — Reference implementation (pseudocode)

Language-neutral. Translate directly.

```
CONST POLL_INTERVAL_MS = 1000
CONST MAX_TICKS        = 120        // ~2 minutes
CONST HTTP_TIMEOUT_MS  = 15000

// ---- transport -----------------------------------------------------------

function post(orderedFields) -> Status:
    xml = buildScr(config.user, config.key, orderedFields)   // ORDER PRESERVED
    try:
        res = httpPost(config.url, xml,
                       contentType = "application/xml",
                       timeout     = HTTP_TIMEOUT_MS,
                       cache       = "no-store")
    catch networkError as e:
        // Transport failure is NOT a decline. Do not attach xml — it holds the key.
        throw TransportError(e.message)

    if res.status != 200:
        throw TransportError("HTTP " + res.status, body = res.text)

    status        = parseScr(res.text)         // handles BOTH normal + rejection
    status.raw    = res.text                   // diagnostics
    status.sentXml = redactKey(xml)            // diagnostics, key stripped
    return status

// ---- transactions --------------------------------------------------------

function purchase(amount, currency, txnRef, merchantRef):
    return post(ordered[                       // ORDER IS PART OF THE CONTRACT
        Amount     = formatDCC(amount),        // "12.50"
        Cur        = currency,
        TxnType    = "Purchase",
        Station    = config.station,
        TxnRef     = txnRef,
        DeviceId   = config.deviceId,
        PosName    = config.posName,
        PosVersion = config.posVersion,
        VendorId   = config.vendorId,          // required
        MRef       = merchantRef,
    ])

function pollStatus(txnRef):
    return post(ordered[Station = config.station, TxnType = "Status", TxnRef = txnRef])

function pressButton(txnRef, name, value):     // name: B1|B2, value: YES|NO|CANCEL
    return post(ordered[Station = config.station, TxnType = "UI", UiType = "Bn",
                        Name = name, Val = value, TxnRef = txnRef])

function getReceipt(txnRef, duplicate):
    return post(ordered[Station = config.station, TxnType = "Receipt", TxnRef = txnRef,
                        DuplicateFlag = duplicate ? "1" : "0", ReceiptType = "2"])

// ---- parsing -------------------------------------------------------------

function parseScr(xml) -> Status:
    scr = xmlParse(xml, coerceTypes = false).Scr    // keep EVERYTHING a string
    if scr is missing: throw ParseError

    return Status{
        // two spellings — either terminates the loop
        complete     : text(scr.Complete) == "1" or text(scr.TransactionIsComplete) == "1",
        // rejection envelope: the reason exists ONLY here
        errorCode    : attr(scr.Response, "Code"),
        errorMessage : text(scr.Response),
        txnRef       : text(scr.TxnRef),
        reCo         : text(scr.ReCo),
        dl1          : text(scr.DL1),
        dl2          : text(scr.DL2),
        b1           : button(scr.B1),              // {enabled: attr en == "1", label: text}
        b2           : button(scr.B2),
        receipt      : text(scr.Rcpt),
        result       : scr.Result ? Result{
                          authorised : text(Result.AP) == "1",
                          authCode   : text(Result.AC),
                          respCode   : text(Result.RC),
                          respText   : text(Result.RT),
                          txnId      : text(Result.TR),
                          cardNumber : text(Result.CN),
                          cardType   : text(Result.CT),
                          amountCents: int(Result.AmtA),     // CENTS, not D.CC
                          tipCents   : int(Result.AmtT),
                          surchCents : int(Result.AmtS),
                       } : none
    }

// ---- orchestration -------------------------------------------------------

function startPayment(recordId) -> Result:
    record = load(recordId)
    if record.paymentStatus == "paid":        return error("already paid")
    if record.paymentStatus not in [unpaid, failed]:
                                              return error("payment in progress")

    attempt = record.attempt + 1
    txnRef  = record.reference + "-" + attempt

    // (a) PERSIST THE REF FIRST, and (b) claim atomically in the same write.
    // Conditional on the chargeable states = the concurrency guard.
    claimed = updateWhere(recordId, { paymentStatus in [unpaid, failed] },
                          set { txnRef, attempt, paymentStatus = "pending" })
    if not claimed: return error("the terminal is busy with another payment")

    logEvent(recordId, "started", { txnRef, attempt })

    try:
        purchase(record.total, config.currency, txnRef, record.reference)
                                              // amount from the RECORD, never the request
    catch TransportError as e:
        logEvent(recordId, "start_failed", { txnRef, message: e.message })
        update(recordId, { paymentStatus = "failed" })     // release the claim
        return error("could not reach the terminal")

    return ok(txnRef)


function pollTick(recordId, txnRef) -> Status:              // called ~1/s, re-auth EVERY tick
    requireOperatorSession()                                // else 401, no terminal call
    txnRef = load(recordId).txnRef                          // NEVER from the request
    status = pollStatus(txnRef)
    if status.complete: status.settled = finalise(recordId, txnRef, status)
    return status


function finalise(recordId, txnRef, status) -> "paid"|"failed"|"mismatch":
    record = load(recordId)
    if record.paymentStatus == "paid": return "paid"        // idempotent

    logEvent(recordId, "completed", { txnRef, status })

    if status.result?.authorised:
        // Authorised is NOT enough — verify the amount you computed.
        if status.result.amountCents != round(record.total * 100):
            logEvent(recordId, "amount_mismatch",
                     { expected: record.total, actual: status.result.amountCents })
            return "mismatch"                               // DO NOT fulfil

        updateWhere(recordId, { paymentStatus == "pending" },   // conditional = idempotent
                    set { paymentStatus = "paid",
                          paidAt        = now(),
                          transactionId = status.result.txnId,
                          cardReceipt   = status.receipt })
        return "paid"

    updateWhere(recordId, { paymentStatus == "pending" }, set { paymentStatus = "failed" })
    return "failed"
```

**Client-side poll loop:**

```
ticks = 0; inFlight = false
every POLL_INTERVAL_MS while not settled:
    if inFlight: skip this tick            // overlap guard
    inFlight = true
    status = GET yourServer/terminal/status?recordId=…
        on 401 -> "your session expired; the sale is still running on the terminal"
        on !ok -> "the terminal is not responding"
    render(status.dl1, status.dl2)                        // verbatim
    renderButtons(status.b1, status.b2)                   // only when enabled
    inFlight = false
    if ++ticks >= MAX_TICKS: stop, offer "resume"          // never auto-fail as unpaid
```

---

## Appendix B — The online channel (REST / HPP)

The same Windcave account can carry a **card-not-present** channel. It is a
separate integration with separate credentials and separate certification, but
its trust model is worth understanding because it is the same reasoning as §6.1
and §6.6.

### Endpoints

| Environment | Base URL |
|---|---|
| UAT | `https://uat.windcave.com/api/v1` |
| Production | `https://sec.windcave.com/api/v1` |

| Call | Method | Path |
|---|---|---|
| Create session | `POST` | `/sessions` — returns **202**, not 200 |
| Query session | `GET` | `/sessions/{sessionId}` |

Authentication is HTTP Basic:
`Authorization: Basic base64("<username>:<apiKey>")`.

### Hosted Payment Page flow

```
POST /sessions
  type: "purchase"        amount: "12.50"   ← string, two decimals, never a number
  currency: "NZD"         merchantReference: "ORD-000123"
  callbackUrls: { approved, declined, cancelled }
  notificationUrl: "https://…/webhook?t=<unguessable_token>"

→ 202 { id, state: "init", links: [ {rel:"self"}, {rel:"hpp"}, {rel:"submitCard"} ] }
```

Redirect the customer to `links[rel="hpp"].href`. **Store and pass the `links`
array through intact** — Windcave explicitly recommends not reconstructing it,
and it is what makes a later swap to the Drop-In component a frontend-only
change.

### Trust model

**Neither the callback query parameter nor the webhook body is evidence of
payment.** Both are *"something happened, go look"* triggers. A customer can
hand-edit `?outcome=approved`; the notification POST is unsigned and forgeable.

Only a **server-side query-session** decides. Mark paid when **both** hold:

1. `transactions[0].authorised === true`, and
2. the session amount **equals your stored total**.

`state: "complete"` does **not** mean paid — a declined card also completes.

That is exactly §6.6, for exactly the reason in §6.1: the outcome must be
knowable from the server, independent of whatever the client reports.

### FPRN — Fail Proof Result Notification

Server-side notification so the outcome is captured even when the customer closes
the browser before returning. Windcave POSTs to the `notificationUrl` given at
session creation; your handler resolves the record by an unguessable token, then
**re-queries the session** for the authoritative result.

It must **always return `200`** — a non-2xx makes Windcave retry, and an unknown
token must not be distinguishable from a known one.

The notification URL must be **publicly reachable over HTTPS**. `localhost`
silently never receives anything; use a tunnel (`cloudflared tunnel --url
http://localhost:3000`, ngrok) or a preview deployment.

### Wallets

Because payment happens on Windcave's domain under HPP, **Google Pay and Apple
Pay can be enabled with no code change.** Apple Pay requires completing
Windcave's domain-registration steps first, after which Windcave issues an Apple
Pay MID.

---

## Appendix C — Reference links

| | |
|---|---|
| PXHIT protocol spec (terminal) | https://www.windcave.com/Document/PXHIT.pdf |
| REST API overview (online) | https://www.windcave.com/developer-e-commerce-api-rest |
| Drop-In guide | https://www.windcave.com/developer-ecommerce-drop-in |
| Developer docs index | https://www.windcave.com/developer-documentation |
| Postman collection (HPP) | https://www.postman.com/windcave-api/windcave/folder/hx6wvku/hosted-payment-page |
| EMVCo certifications / TQM labels | https://www.windcave.com/emvco-certifications-and-tqm-labels |
| PCI standards (SMB flyer) | https://www.pcisecuritystandards.org/pdfs/PCISSC_SMB_Flyer_-web.pdf |
| Payline (UAT) | https://uat.windcave.com/pxmi3/logon |
| Payline password reset (UAT) | https://uat.windcave.com/pxmi3/forgotpassword |
| Dev support | `devsupport@windcave.com` |
