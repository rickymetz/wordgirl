import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  auditCspHashes,
  cspDirective,
  cspHashToken,
  cspHeaderValue,
  inlineBlocks,
} from "./cspHashes";

const token = (text: string) =>
  `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

describe("inlineBlocks", () => {
  it("captures inline style and script, skipping external scripts", () => {
    const html = `
      <script src="https://cdn.example/x.js" defer></script>
      <script>doBoot();</script>
      <style>#a { color: red; }</style>
      <script type="module" crossorigin src="/assets/i.js"></script>`;
    expect(inlineBlocks(html)).toEqual([
      { kind: "script", text: "doBoot();" },
      { kind: "style", text: "#a { color: red; }" },
    ]);
  });

  it("treats data-src as inline, not external", () => {
    // \bsrc= alone would skip this block — the dangerous false negative.
    const html = `<script data-src="x">run();</script>`;
    expect(inlineBlocks(html)).toEqual([{ kind: "script", text: "run();" }]);
  });

  it("ignores tags mentioned inside HTML comments", () => {
    // Without comment-stripping, the commented "<style>" would open a
    // phantom block that swallows everything up to the REAL closing
    // tag, hashing the wrong content.
    const html = `
      <!-- the inline <style> is hashed -->
      <style>#real { top: 0; }</style>`;
    expect(inlineBlocks(html)).toEqual([
      { kind: "style", text: "#real { top: 0; }" },
    ]);
  });

  it("hashes the raw text, untrimmed", () => {
    const [block] = inlineBlocks("<style>\n  a\n</style>");
    expect(block.text).toBe("\n  a\n");
    expect(cspHashToken(block.text)).toBe(token("\n  a\n"));
  });
});

describe("cspHeaderValue / cspDirective", () => {
  const toml = `
# a comment mentioning 'sha256-DECOY=' must never satisfy the audit
[[headers]]
  [headers.values]
    Content-Security-Policy = "default-src 'self'; style-src 'self' 'sha256-AAA='; script-src 'self' https://cdn.example"
`;
  it("extracts the header value, not comments", () => {
    const csp = cspHeaderValue(toml)!;
    expect(csp).toContain("style-src");
    expect(csp).not.toContain("DECOY");
  });
  it("splits directives", () => {
    const csp = cspHeaderValue(toml)!;
    expect(cspDirective(csp, "style-src")).toEqual(["'self'", "'sha256-AAA='"]);
    expect(cspDirective(csp, "img-src")).toEqual([]);
  });
  it("returns null when no header exists", () => {
    expect(cspHeaderValue("[build]\n  command = 'x'")).toBeNull();
  });
});

describe("auditCspHashes", () => {
  const style = "#a{top:0}";
  const script = "go();";
  const files = [
    { name: "index.html", html: `<style>${style}</style><script>${script}</script>` },
    // A byte-identical shell must not duplicate reports.
    { name: "games/x/index.html", html: `<style>${style}</style><script>${script}</script>` },
  ];

  it("passes when each token sits in its own directive", () => {
    const csp = `style-src 'self' ${token(style)}; script-src 'self' ${token(script)}`;
    expect(auditCspHashes(files, csp)).toEqual({ missing: [], stale: [] });
  });

  it("fails a token pasted into the WRONG directive — and flags it stale there", () => {
    const csp = `style-src 'self' ${token(script)}; script-src 'self' ${token(style)}`;
    const { missing, stale } = auditCspHashes(files, csp);
    expect(missing).toHaveLength(2);
    expect(missing[0]).toContain("style-src");
    expect(stale).toHaveLength(2);
  });

  it("reports each missing token once across identical files", () => {
    const { missing } = auditCspHashes(files, "style-src 'self'; script-src 'self'");
    expect(missing).toHaveLength(2);
  });

  it("flags stale sha256 sources but never host/keyword sources", () => {
    const csp = `style-src 'self' ${token(style)} 'sha256-OLD='; script-src 'self' https://cdn.example ${token(script)}`;
    const { missing, stale } = auditCspHashes(files, csp);
    expect(missing).toEqual([]);
    expect(stale).toEqual([
      expect.stringContaining("'sha256-OLD='"),
    ]);
  });
});
