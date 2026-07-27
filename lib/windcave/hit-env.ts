import 'server-only';

/**
 * Windcave HIT terminal configuration. Read at request time, never at module
 * load, so a missing key fails one payment with a clear message rather than
 * breaking the whole build.
 */
export type HitEnv = {
  url: string;
  user: string;
  key: string;
  station: string;
  posName: string;
  deviceId: string;
  /** POS software version reported to Windcave. */
  posVersion: string;
  /**
   * Vendor identifier assigned by Windcave. **Required** — the service rejects a
   * Purchase without it ("Missing tag VendorID"). Deliberately has no default:
   * a placeholder would be accepted in UAT and rejected in production, which is
   * the worst possible time to find out.
   */
  vendorId: string;
  currency: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Terminal payment is not configured — see docs/windcave-integration.md.`,
    );
  }
  return value;
}

export function hitEnv(): HitEnv {
  return Object.freeze({
    url: process.env.WINDCAVE_HIT_URL ?? 'https://uat.windcave.com/hit/pos.aspx',
    user: required('WINDCAVE_HIT_USER'),
    key: required('WINDCAVE_HIT_KEY'),
    station: required('WINDCAVE_HIT_STATION'),
    posName: process.env.WINDCAVE_HIT_POS_NAME ?? 'Viki',
    deviceId: process.env.WINDCAVE_HIT_DEVICE_ID ?? process.env.WINDCAVE_HIT_POS_NAME ?? 'Viki',
    posVersion: process.env.WINDCAVE_HIT_POS_VERSION ?? '1.0',
    vendorId: required('WINDCAVE_HIT_VENDOR_ID'),
    currency: process.env.WINDCAVE_CURRENCY ?? 'NZD',
  });
}
