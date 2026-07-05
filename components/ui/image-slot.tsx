'use client';

import Image from 'next/image';
import { useState } from 'react';

type ImageSlotProps = {
  /** Placeholder caption; also the alt text fallback. */
  label: string;
  /** Real image URL (allowed hosts only). Omitted → styled placeholder. */
  src?: string;
  alt?: string;
  shape?: 'rect' | 'rounded';
  /** CSS aspect-ratio, e.g. "4 / 3". */
  ratio?: string;
  className?: string;
};

/**
 * Renders a real image when `src` is provided (and loads), otherwise a styled
 * placeholder box showing the label. Falls back to the placeholder if the image
 * fails to load. Real photography is out of scope this milestone, so most usages
 * pass only a label.
 */
export function ImageSlot({
  label,
  src,
  alt,
  shape = 'rounded',
  ratio,
  className = '',
}: ImageSlotProps) {
  const [failed, setFailed] = useState(false);
  const radius = shape === 'rounded' ? 'rounded-[var(--radius-card)]' : '';
  const style = ratio ? { aspectRatio: ratio } : undefined;

  if (src && !failed) {
    return (
      <div className={`relative overflow-hidden ${radius} ${className}`} style={style}>
        <Image
          src={src}
          alt={alt ?? label}
          fill
          sizes="100vw"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center border border-line bg-surface-alt ${radius} ${className}`}
      style={style}
      aria-label={alt ?? label}
      role="img"
    >
      <span className="px-3 text-center text-[11px] uppercase tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}
