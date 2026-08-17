import { Bullets, LegalPage, P, Section } from "./LegalPage";

/**
 * The privacy policy.
 *
 * Every claim here is checkable against the code, and should be RE-checked
 * whenever the answer changes:
 *
 *   - "no cookies" — nothing in the app writes `document.cookie`, and
 *     Fathom is cookieless by design.
 *   - "stays on your device" — src/lib/storage/localStorageAdapter.ts is
 *     the only persistence, and there is no server to send it to.
 *   - the analytics list — src/lib/analytics.ts is the complete set of
 *     events, and each one is a bare name with no payload.
 *
 * If a future change adds a backend, an account, or an event that carries
 * a value, this page is part of that change, not a follow-up to it.
 */
export function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="August 2026">
      <P>
        WordGirl is a word game. There are no accounts, no sign-up, and no
        newsletter, so there is no name, email address, or password to give
        us in the first place. This page describes the little that is
        collected anyway, and where it goes.
      </P>

      <Section heading="Your game progress stays on your device">
        <P>
          Everything the game remembers about you is stored by your browser,
          on the device you played on. That covers your daily results and
          streaks, your lifetime stats, your dictionary bookmarks, and your
          theme, text-size and font settings.
        </P>
        <P>
          None of it is sent anywhere. There is no server holding your
          history and no way for us to look up what you played. The flip
          side is that it is only as durable as your browser storage:
          clearing site data erases it, and it does not follow you to
          another device or another browser.
        </P>
      </Section>

      <Section heading="Cookies">
        <P>
          WordGirl sets no cookies at all, and shows no cookie banner
          because there is nothing to consent to.
        </P>
      </Section>

      <Section heading="Analytics">
        <P>
          Visits are counted with Fathom Analytics, which is cookieless and
          does not build a profile of you or follow you to other sites. It
          reports totals, not people. What it records is:
        </P>
        <Bullets
          items={[
            "which page was visited, and the site that linked you here",
            "rough technical details — browser, operating system, and country",
            "named actions inside a game, such as starting a puzzle, solving one, taking a hint, or tapping share",
          ]}
        />
        <P>
          Those named actions are names and nothing else. They carry no
          score, no puzzle, no word you entered, and no date — enough to see
          that hints are being used, never enough to reconstruct anyone's
          play. Nothing is recorded while you are offline.
        </P>
      </Section>

      <Section heading="Hosting">
        <P>
          The site is served by Netlify, which keeps standard server logs
          including IP addresses as part of delivering it — the ordinary
          record any web server keeps. The documentation at /docs is served
          from GitHub Pages.
        </P>
      </Section>

      <Section heading="Sharing your results">
        <P>
          The share button hands your result to your own device's share
          sheet, or copies it to your clipboard. Where it goes next is up to
          you, and WordGirl is not told. The text itself holds only that
          day's result — the date, your score, how long you took, how many
          hints you used — and a link back to the game.
        </P>
      </Section>

      <Section heading="Children">
        <P>
          The game is suitable for all ages and collects no personal
          information from anyone, of any age.
        </P>
      </Section>

      <Section heading="Changes">
        <P>
          If what is collected ever changes, this page changes with it and
          the date below is updated.
        </P>
      </Section>

      <Section heading="Contact">
        <P>
          Questions about this policy can be raised at{" "}
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
