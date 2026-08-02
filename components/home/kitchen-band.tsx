const PILLARS = [
  {
    figure: 'Only',
    title: 'Charcoal grill in NZ',
    body: 'The imported grill behind every plate of thịt nướng.',
  },
  {
    figure: 'Daily',
    title: 'Broth & herbs',
    body: 'Phở broth simmered overnight, herbs cut each morning.',
  },
  {
    figure: 'GF·DF',
    title: 'Options for all',
    body: 'Tell us about allergies or dietary needs and we will adjust the plate.',
  },
];

/** "Our kitchen" — the three claims the whole brand rests on. */
export function KitchenBand() {
  return (
    <section
      id="our-kitchen"
      className="scroll-mt-[var(--header-h)] border-y border-line px-4 py-10 sm:px-8 sm:py-14 lg:px-11"
    >
      <div className="mx-auto mb-8 max-w-[640px] text-center">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[2px] text-brand">Our kitchen</p>
        <h2 className="mb-3 text-[clamp(24px,3.2vw,34px)]">Our kitchen, in three things</h2>
        <p className="text-pretty text-[14.5px] leading-[1.6] text-subtle">
          Hanoi-born advisors, a charcoal grill imported for this kitchen, and herbs cut the morning
          they are served.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[clamp(20px,3vw,40px)] text-center">
        {PILLARS.map((pillar) => (
          <div key={pillar.title}>
            <p className="font-display text-[40px] leading-none text-brand">{pillar.figure}</p>
            <h3 className="mb-1 mt-2 font-body text-base font-bold">{pillar.title}</h3>
            <p className="text-[13px] leading-[1.55] text-muted">{pillar.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
