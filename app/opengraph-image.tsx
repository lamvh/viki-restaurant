import { ImageResponse } from 'next/og';
import { RESTAURANT } from '@/data/restaurant';

export const alt = 'Viki — Vietnamese Street Food, Glenfield';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Self-contained social share image (no external assets) in the brand direction.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#2f6b4f',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 140, fontWeight: 700, lineHeight: 1 }}>
          {RESTAURANT.name}
        </div>
        <div style={{ marginTop: 24, fontSize: 44, opacity: 0.92 }}>
          Vietnamese Street Food · Glenfield, Auckland
        </div>
      </div>
    ),
    { ...size },
  );
}
