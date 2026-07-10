import { Sparkles } from "lucide-react";
import { Tile, tileClasses } from "../../../components/game/Tile";

/**
 * Hub-card miniature of the real board: the glass turns SAW into WAS
 * (seeing into the past — the game in one image), while the
 * palindromes MADAM and MOM straddle the line, middle tile ON it at
 * the board's tile rhythm. MOM survives a caps mirror, so it carries
 * the in-glass sparkle. All three are honestly playable mirror
 * content, and MADAM is the coach's own example.
 */
const TILE = 13;
const SLOT = TILE + 4; // middle slot: tile + 2px inset each side
const LEFT = TILE * 3 + 4; // fits WAS (3 tiles + gaps)
const LINE_X = LEFT + SLOT / 2;

export function BackwordsPreview() {
  return (
    <div className="relative flex flex-col gap-[3px] pt-1" aria-hidden>
      {/* The glass pane, its left edge on the mirror line. */}
      <div
        className="absolute inset-y-[-4px] right-[-6px] rounded-lg"
        style={{ left: LINE_X, background: "var(--backwords-glass)" }}
      />
      {/* One continuous line, like the board's. */}
      <div
        className="absolute inset-y-[-4px] w-[2px] rounded-full bg-accent/60"
        style={{ left: LINE_X - 1 }}
      />
      <PreviewRow left="WAS" right="SAW" accent />
      <PreviewRow left="MA" middle="D" right="AM" />
      <PreviewRow left="M" middle="O" right="M" glyph />
    </div>
  );
}

function PreviewRow({
  left,
  middle,
  right,
  accent = false,
  glyph = false,
}: {
  left: string;
  middle?: string;
  right: string;
  accent?: boolean;
  glyph?: boolean;
}) {
  return (
    <div className="relative flex items-center">
      <div
        className="flex shrink-0 items-center justify-end gap-[2px]"
        style={{ width: LEFT }}
      >
        {[...left].map((ch, i) => (
          <SolidTile key={i} accent={accent}>
            {ch}
          </SolidTile>
        ))}
      </div>
      {/* The middle slot: a palindrome's center tile sits ON the line. */}
      <div
        className="z-10 flex shrink-0 justify-center"
        style={{ width: SLOT }}
      >
        {middle && <MiddleTile>{middle}</MiddleTile>}
      </div>
      <div className="flex shrink-0 items-center gap-[2px]">
        {[...right].map((ch, i) => (
          <Tile key={i} mini tone="ghost" style={{ width: TILE, height: TILE }}>
            {ch}
          </Tile>
        ))}
        {glyph && <Sparkles className="ml-[2px] h-2.5 w-2.5 text-accent" />}
      </div>
    </div>
  );
}

/** Half real, half reflection — like the board's straddle tile. */
function MiddleTile({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex shrink-0 rounded font-game text-[8px] shadow-sm"
      style={{ width: TILE, height: TILE }}
    >
      <span
        className={`${tileClasses("surface", true)} absolute inset-0`}
        style={{ clipPath: "inset(0 50% 0 0)" }}
      >
        {children}
      </span>
      <span
        className={`${tileClasses("ghost", true)} absolute inset-0`}
        style={{ clipPath: "inset(0 0 0 50%)" }}
      >
        {children}
      </span>
    </div>
  );
}

function SolidTile({
  accent,
  children,
}: {
  accent: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tile
      mini
      tone={accent ? "accent" : "surface"}
      className={accent ? "" : "shadow-sm"}
      style={{ width: TILE, height: TILE }}
    >
      {children}
    </Tile>
  );
}
