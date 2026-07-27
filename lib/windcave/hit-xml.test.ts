import { describe, expect, it } from 'vitest';

import {
  buildScrRequest,
  centsMatch,
  formatHitAmount,
  parseScrResponse,
} from './hit-xml';

const AUTH = { user: 'VikiUAT', key: 'secret-key', station: '3425240086' };

// Envelopes below mirror the PXHIT v2.3 samples verbatim in shape.
const IN_FLIGHT = `<Scr>
  <TxnType>Status</TxnType>
  <StatusId>3</StatusId>
  <TxnStatusId>2</TxnStatusId>
  <Complete>0</Complete>
  <ReCo/>
  <Tmo>20</Tmo>
  <TxnRef>VK-7KQ2X9-1</TxnRef>
  <DL1>PRESENT/INSERT</DL1>
  <DL2>SWIPE CARD</DL2>
  <B1 en="0"/>
  <B2 en="1">CANCEL</B2>
</Scr>`;

const APPROVED = `<Scr>
  <TxnType>Status</TxnType>
  <TxnRef>VK-7KQ2X9-1</TxnRef>
  <StatusId>6</StatusId>
  <TxnStatusId>8</TxnStatusId>
  <Complete>1</Complete>
  <RcptW>30</RcptW>
  <Rcpt>VIKI EFTPOS RECEIPT</Rcpt>
  <Result>
    <AC>000289</AC>
    <AP>1</AP>
    <CN>411111******1111</CN>
    <CT>Visa</CT>
    <RC>00</RC>
    <RT>APPROVED</RT>
    <TR>0000000c01159507</TR>
    <AmtA>1250</AmtA>
    <AmtS>0</AmtS>
    <AmtT>0</AmtT>
  </Result>
  <ReCo/>
  <DL1>APPROVED</DL1>
  <DL2/>
  <B1 en="0"/>
  <B2 en="0"/>
</Scr>`;

const DECLINED = `<Scr>
  <Complete>1</Complete>
  <TxnRef>VK-7KQ2X9-1</TxnRef>
  <Result>
    <AP>0</AP>
    <RC>05</RC>
    <RT>DECLINED</RT>
    <AmtA>1250</AmtA>
  </Result>
  <DL1>DECLINED</DL1>
</Scr>`;

describe('buildScrRequest', () => {
  it('puts user and key on the root as attributes, not child elements', () => {
    const xml = buildScrRequest(AUTH, { TxnType: 'Status', TxnRef: 'VK-1' });

    expect(xml).toContain('action="doScrHIT"');
    expect(xml).toContain('user="VikiUAT"');
    expect(xml).toContain('key="secret-key"');
    // The inferred-but-wrong shape had these as children. Guard against regressing.
    expect(xml).not.toContain('<user>');
    expect(xml).not.toContain('<key>');
  });

  it('always includes the station and echoes supplied fields', () => {
    const xml = buildScrRequest(AUTH, { TxnType: 'Purchase', Amount: '12.50', Cur: 'NZD' });

    expect(xml).toContain('<Station>3425240086</Station>');
    expect(xml).toContain('<TxnType>Purchase</TxnType>');
    expect(xml).toContain('<Amount>12.50</Amount>');
    expect(xml).toContain('<Cur>NZD</Cur>');
  });

  it('omits undefined fields rather than emitting empty elements', () => {
    const xml = buildScrRequest(AUTH, { TxnType: 'Status', MRef: undefined });

    expect(xml).not.toContain('MRef');
  });
});

describe('parseScrResponse — in flight', () => {
  const status = parseScrResponse(IN_FLIGHT);

  it('reports not complete', () => {
    expect(status.complete).toBe(false);
  });

  it('extracts the terminal display lines verbatim', () => {
    expect(status.dl1).toBe('PRESENT/INSERT');
    expect(status.dl2).toBe('SWIPE CARD');
  });

  it('reads the button enabled flag from the en attribute and the label from text', () => {
    expect(status.b1).toEqual({ enabled: false, label: '' });
    expect(status.b2).toEqual({ enabled: true, label: 'CANCEL' });
  });

  it('carries no result block until the terminal finishes', () => {
    expect(status.result).toBeUndefined();
  });

  it('surfaces the stage ids and timeout hint', () => {
    expect(status.statusId).toBe('3');
    expect(status.txnStatusId).toBe('2');
    expect(status.timeoutSeconds).toBe('20');
  });
});

describe('parseScrResponse — completed', () => {
  it('treats AP=1 as authorised and maps the two-letter result codes', () => {
    const status = parseScrResponse(APPROVED);

    expect(status.complete).toBe(true);
    expect(status.result?.authorised).toBe(true);
    expect(status.result?.authCode).toBe('000289');
    expect(status.result?.responseText).toBe('APPROVED');
    expect(status.result?.transactionId).toBe('0000000c01159507');
    expect(status.result?.cardType).toBe('Visa');
    expect(status.receipt).toBe('VIKI EFTPOS RECEIPT');
  });

  it('reads amounts as integer cents, not decimal strings', () => {
    const status = parseScrResponse(APPROVED);

    expect(status.result?.amountCents).toBe(1250);
    expect(status.result?.tipCents).toBe(0);
    expect(status.result?.surchargeCents).toBe(0);
  });

  it('treats AP=0 as declined while still reporting complete', () => {
    const status = parseScrResponse(DECLINED);

    expect(status.complete).toBe(true);
    expect(status.result?.authorised).toBe(false);
    expect(status.result?.responseText).toBe('DECLINED');
  });

  it('returns undefined for empty elements rather than an empty string', () => {
    const status = parseScrResponse(APPROVED);

    expect(status.dl2).toBeUndefined();
    expect(status.reCo).toBeUndefined();
  });
});

describe('parseScrResponse — malformed', () => {
  it('throws when the payload carries no Scr element', () => {
    expect(() => parseScrResponse('<html><body>Gateway error</body></html>')).toThrow(
      /no <Scr> element/,
    );
  });
});

describe('amounts', () => {
  it('formats request amounts as two-decimal strings', () => {
    expect(formatHitAmount(12.5)).toBe('12.50');
    expect(formatHitAmount(12)).toBe('12.00');
    expect(formatHitAmount(0.05)).toBe('0.05');
  });

  it('matches a decimal order total against integer result cents', () => {
    expect(centsMatch(12.5, 1250)).toBe(true);
    expect(centsMatch(12.5, 1300)).toBe(false);
  });

  it('survives float representation error', () => {
    // 10.1 * 100 is 1009.9999… in IEEE 754 — a naive comparison fails here.
    expect(centsMatch(10.1, 1010)).toBe(true);
    expect(centsMatch(0.29, 29)).toBe(true);
  });
});
