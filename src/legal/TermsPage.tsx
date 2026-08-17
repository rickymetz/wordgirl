import { Bullets, LegalPage, P, Section } from "./LegalPage";

/**
 * Terms of use.
 *
 * Short on purpose. A free browser game with no accounts, no payments and
 * no user-submitted content has very little to govern, and a page of
 * boilerplate borrowed from a service that does have those things would
 * describe an app that does not exist.
 */
export function TermsPage() {
  return (
    <LegalPage title="Terms" updated="August 2026">
      <P>
        WordGirl is a free word game, offered as-is. Playing it means
        accepting the terms below.
      </P>

      <Section heading="Use of the game">
        <P>
          Play as much as you like, for personal enjoyment. What is not on
          is the small list of things that would spoil it for everyone else:
        </P>
        <Bullets
          items={[
            "attacking, overloading, or attempting to break the site",
            "scraping it in bulk, or passing this site off as your own",
            "charging other people for access to it",
          ]}
        />
      </Section>

      <Section heading="Source code">
        <P>
          WordGirl is source-available: the code is public, and you may
          fork it, change it and publish your version for any
          noncommercial purpose. Selling it, or folding it into something
          you sell, is not granted. The WordGirl and game names, the logos
          and the artwork are not covered — rename your fork before you
          publish it.
        </P>
        <P>
          The full terms are in the repository, as{" "}
          <a
            href="https://github.com/rickymetz/wordgirl/blob/main/LICENSE.md"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-ink underline underline-offset-2"
          >
            LICENSE.md
          </a>{" "}
          and{" "}
          <a
            href="https://github.com/rickymetz/wordgirl/blob/main/NOTICE.md"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-ink underline underline-offset-2"
          >
            NOTICE.md
          </a>
          . Where this page and the licence differ, the licence governs the
          code.
        </P>
      </Section>

      <Section heading="No guarantee of availability">
        <P>
          The game may be changed, interrupted, or taken offline at any
          time, without notice. Puzzles, rules, and scoring may change as
          the games are worked on.
        </P>
      </Section>

      <Section heading="Your progress">
        <P>
          Your streaks and stats live in your own browser's storage, and
          nothing keeps a backup. Clearing your browser data, switching
          devices, or a browser evicting the storage will lose them, and
          they cannot be recovered or restored. Treat a long streak as a
          nice thing rather than a safe one.
        </P>
      </Section>

      <Section heading="Word lists">
        <P>
          Answers are judged against a fixed word list built from ENABLE, a
          public-domain word list used widely for word games. A word being
          accepted or rejected is a property of that list, not a judgement
          about the word — the list is public, browsable in the app's
          dictionary, and certainly contains omissions.
        </P>
      </Section>

      <Section heading="No warranty">
        <P>
          The game is provided without warranty of any kind. It is a puzzle
          game; nothing in it is advice, and it comes with no promise that
          it will be available, correct, or bug-free.
        </P>
      </Section>

      <Section heading="Liability">
        <P>
          To the fullest extent the law allows, WordGirl and its author are
          not liable for any loss arising from your use of the game,
          including lost progress or lost streaks.
        </P>
      </Section>

      <Section heading="Changes">
        <P>
          These terms may be updated. The date below shows when they last
          were, and continuing to play means the current version applies.
        </P>
      </Section>

      <Section heading="Contact">
        <P>
          Questions can be raised at{" "}
          <a
            href="https://github.com/rickymetz/wordgirl/issues"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-ink underline underline-offset-2"
          >
            github.com/rickymetz/wordgirl
          </a>
          .
        </P>
      </Section>
    </LegalPage>
  );
}
