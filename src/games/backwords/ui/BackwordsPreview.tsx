/**
 * Hub-card miniature: thematic words meeting their reflections at the
 * glass — WON reflects as NOW, EYE and WOW look back at themselves.
 * All three are honestly playable mirror content.
 */
export function BackwordsPreview() {
  return (
    <div className="relative flex flex-col gap-[3px] pt-1" aria-hidden>
      {/* Miniature glass pane behind the reflections. */}
      <div
        className="absolute inset-y-[-4px] right-[-6px] left-[49px] rounded-lg"
        style={{
          background: `linear-gradient(105deg,
            color-mix(in oklab, var(--color-accent) 20%, var(--color-surface)) 0%,
            color-mix(in oklab, var(--color-accent) 8%, var(--color-surface)) 60%,
            color-mix(in oklab, var(--color-accent) 16%, var(--color-surface)) 100%)`,
        }}
      />
      <PreviewRow left="WON" right="NOW" accent />
      <PreviewRow left="EYE" right="EYE" />
      <PreviewRow left="WOW" right="WOW" />
    </div>
  );
}

function PreviewRow({
  left,
  right,
  accent = false,
}: {
  left: string;
  right: string;
  accent?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-[2px]">
      {[...left].map((ch, i) => (
        <div
          key={`l${i}`}
          className={`flex h-[15px] w-[15px] items-center justify-center rounded font-game text-[8px] ${
            accent ? "bg-accent text-surface" : "bg-surface text-ink"
          }`}
        >
          {ch}
        </div>
      ))}
      <div className="h-[15px] w-[3px] shrink-0 rounded-full bg-accent/60" />
      {[...right].map((ch, i) => (
        <div
          key={`r${i}`}
          className="flex h-[15px] w-[15px] items-center justify-center font-game text-[8px] text-ink-soft/70"
        >
          {ch}
        </div>
      ))}
    </div>
  );
}
