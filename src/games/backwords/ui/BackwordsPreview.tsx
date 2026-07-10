/**
 * Hub-card miniature: words meeting their reflections at the glass —
 * WAS|SAW and TOP|POT, one row lit in the game accent.
 */
export function BackwordsPreview() {
  return (
    <div className="flex flex-col gap-[3px]" aria-hidden>
      <PreviewRow left="WAS" right="SAW" accent />
      <PreviewRow left="TOP" right="POT" />
      <PreviewRow left="MOM" right="MOM" />
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
    <div className="flex items-center gap-[3px]">
      {[...left].map((ch, i) => (
        <div
          key={`l${i}`}
          className={`flex h-[22px] w-[22px] items-center justify-center rounded font-game text-[10px] ${
            accent ? "bg-accent text-surface" : "bg-surface text-ink"
          }`}
        >
          {ch}
        </div>
      ))}
      <div className="h-[22px] w-[3px] shrink-0 rounded-full bg-accent-soft" />
      {[...right].map((ch, i) => (
        <div
          key={`r${i}`}
          className="flex h-[22px] w-[22px] items-center justify-center rounded bg-surface font-game text-[10px] text-ink-soft/50"
        >
          {ch}
        </div>
      ))}
    </div>
  );
}
