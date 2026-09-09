/**
 * CSP hash auditing for the inline boot blocks (cspHashGuard in
 * vite.config.ts). Pure string-in/string-out so the negative space —
 * wrong directive, token hiding in a TOML comment, stale grants — is
 * unit-testable (cspHashes.test.ts); the build plugin only does file
 * I/O around these.
 */
import { createHash } from "node:crypto";

export interface InlineBlock {
  kind: "style" | "script";
  text: string;
}

/**
 * Every inline <style>/<script> in a document, exactly as a browser
 * would hash it (the raw text between the tags, untrimmed). HTML
 * comments are stripped first — a literal "<style>" mentioned in a
 * comment must not open a phantom block that swallows real content —
 * and a script tag carrying src= in any quoting is external, covered
 * by a host source rather than a hash.
 */
export function inlineBlocks(html: string): InlineBlock[] {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, "");
  const blocks: InlineBlock[] = [];
  const tag = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
  for (const m of stripped.matchAll(tag)) {
    const kind = m[1].toLowerCase() as InlineBlock["kind"];
    if (kind === "script" && /(^|[\s"'])src\s*=/i.test(m[2])) continue;
    blocks.push({ kind, text: m[3] });
  }
  return blocks;
}

/** The CSP source token for an inline block's text: 'sha256-<base64>'. */
export function cspHashToken(text: string): string {
  return `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;
}

/** The named directive's source list from a CSP header value, or []. */
export function cspDirective(csp: string, name: string): string[] {
  for (const part of csp.split(";")) {
    const tokens = part.trim().split(/\s+/);
    if (tokens[0] === name) return tokens.slice(1);
  }
  return [];
}

/**
 * The Content-Security-Policy header value out of netlify.toml — the
 * header line itself, so a token pasted into a nearby comment can
 * never satisfy the audit.
 */
export function cspHeaderValue(netlifyToml: string): string | null {
  const m = netlifyToml.match(/^\s*Content-Security-Policy\s*=\s*"([^"]*)"/m);
  return m ? m[1] : null;
}

export interface CspAudit {
  /** Blocks whose token is absent from THEIR directive — refused by browsers. */
  missing: string[];
  /** sha256 sources matching no shipped block — standing grants to prune. */
  stale: string[];
}

export function auditCspHashes(
  files: { name: string; html: string }[],
  csp: string,
): CspAudit {
  const current = { style: new Set<string>(), script: new Set<string>() };
  const missing: string[] = [];
  const reported = new Set<string>();
  for (const f of files) {
    for (const b of inlineBlocks(f.html)) {
      const token = cspHashToken(b.text);
      current[b.kind].add(token);
      const key = `${b.kind} ${token}`;
      if (!cspDirective(csp, `${b.kind}-src`).includes(token) && !reported.has(key)) {
        reported.add(key);
        missing.push(`${f.name} inline <${b.kind}>: add ${token} to ${b.kind}-src`);
      }
    }
  }
  const stale: string[] = [];
  for (const kind of ["style", "script"] as const) {
    for (const src of cspDirective(csp, `${kind}-src`)) {
      if (src.startsWith("'sha256-") && !current[kind].has(src)) {
        stale.push(`${kind}-src: ${src} matches no shipped inline <${kind}> — remove it`);
      }
    }
  }
  return { missing, stale };
}
