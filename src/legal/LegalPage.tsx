import type { ReactNode } from "react";
import { HomeLink } from "../components/HomeLink";

/**
 * Shell for the two prose pages, /privacy and /terms.
 *
 * These are the only screens in the app that are meant to be READ rather
 * than played, so they break two habits the game screens keep. They set
 * no height budget and are allowed to scroll — `#root` is `min-height`,
 * not a fixed `100dvh`, so a long page simply grows and the document
 * scrolls. And they carry no `data-level`: the root accent is already
 * the neutral black/white, which is what the hub and settings wear, and
 * a legal page belongs to the site rather than to any one game.
 *
 * Kept deliberately plain. A policy that is hard to skim is a policy
 * nobody reads, and the house copy rule — neutral and descriptive — is
 * doing more work here than anywhere else in the app.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** Human-readable, e.g. "August 2026". Shown at the foot of the page. */
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-16 md:max-w-2xl">
      <header className="flex items-center gap-4 pt-8 pb-7">
        <HomeLink />
        <h1 className="font-game text-lg">{title}</h1>
      </header>
      <main className="flex flex-col gap-7 leading-relaxed">
        {children}
        <p className="border-t border-line pt-5 text-sm text-ink-soft">
          Last updated {updated}.
        </p>
      </main>
    </div>
  );
}

/** One titled block of prose. */
export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-semibold">{heading}</h2>
      {children}
    </section>
  );
}

/** Body copy — soft ink, so the headings carry the structure. */
export function P({ children }: { children: ReactNode }) {
  return <p className="text-ink-soft">{children}</p>;
}

/** A list of points inside a section. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-ink-soft">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
