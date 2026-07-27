// `server-only` throws by design when imported outside a React Server Component,
// which would make every server module untestable. Vitest aliases the package to
// this empty stub so server code can be unit-tested; the real guard still applies
// to the Next.js build, which is where it actually matters.
export {};
