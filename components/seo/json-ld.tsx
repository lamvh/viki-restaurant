/**
 * Renders a JSON-LD <script> for structured data. `data` is always static,
 * app-controlled content (no user input), so serialising it is safe; we still
 * escape `<` to be defensive against script-breakout in any future string.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
