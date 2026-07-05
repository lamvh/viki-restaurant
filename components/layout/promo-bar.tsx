/** Thin promotional bar across the top of every page. */
export function PromoBar() {
  return (
    <div className="bg-ink text-surface">
      <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs tracking-wide">
        10% off orders over $30 · Flat $4 delivery · Pickup ready in 15–20 min
      </p>
    </div>
  );
}
