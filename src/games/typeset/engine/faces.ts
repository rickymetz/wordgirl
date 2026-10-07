/**
 * The typefaces Typeset draws from. Every face is open source (OFL) and is
 * used at its heaviest weight: the open fill is an outline drawn OUTSIDE
 * the letter and the middle fill is a cross-hatch, and both need stems
 * several times the outline's width to read. scripts/bake-typeset-glyphs.mjs
 * fetches each face at `weight`, extracts only the glyphs the pool uses,
 * and writes their outlines to glyphs.json — the app ships paths, never
 * font files, so the cards work offline and ignore the Font setting (they
 * are art, not text).
 *
 * Rules for adding a face (see the design notes in DESIGN.md):
 *  - heaviest weight it has, and stems at least 3x the open fill's outline
 *  - no blackletter or hairline scripts: their open and hatched fills
 *    turn to noise
 *  - `family` is the class shown on the faces board's legend and finish
 *    card, so two faces on one board must never share it
 */

export type FaceFamily =
  | "Old style"
  | "Geometric"
  | "Grotesque"
  | "Didone"
  | "Slab"
  | "Soft serif"
  | "Book serif"
  | "Monospace"
  | "Script"
  | "Brush";

/**
 * The SHAPE a family reads as at card size. Families are finer than a
 * player can see in one letter at a glance: a soft serif and a slab are
 * different families but, in a lone upright letter, near twins (review:
 * Fraunces and JetBrains Mono's "y" read as the same face). A faces trio
 * takes three different silhouettes (pool.test.ts).
 */
export type Silhouette = "serif" | "slab" | "sans" | "mono" | "script";

export const SILHOUETTE: Record<FaceFamily, Silhouette> = {
  "Old style": "serif",
  Didone: "serif",
  "Soft serif": "serif",
  "Book serif": "serif",
  Slab: "slab",
  Geometric: "sans",
  Grotesque: "sans",
  Monospace: "mono",
  Script: "script",
  Brush: "script",
};

/**
 * Letters that SHOW a monospace: narrow letters drawn wide, with the slab
 * feet and hooks a fixed advance forces on them. Checked against the baked
 * outlines, not assumed: JetBrains Mono's f, r and t have NO foot, and in
 * them (as in a round a, e, y) a black mono reads as just another grotesque.
 */
export const MONO_TELLING = new Set(["i", "j", "l"]);

export interface Face {
  id: FaceId;
  /** The face's published name. */
  name: string;
  family: FaceFamily;
  /** Designer credit for the faces board's finish card. */
  designer: string;
  /** One line of history for the finish card: where the face comes from. */
  note: string;
  /** Google Fonts family name, for the bake script. */
  googleFamily: string;
  weight: number;
}

export type FaceId =
  | "eb-garamond"
  | "jost"
  | "lobster"
  | "fraunces"
  | "literata"
  | "bodoni-moda"
  | "kaushan-script"
  | "roboto-slab"
  | "archivo-black"
  | "jetbrains-mono";

export const FACES: Record<FaceId, Face> = {
  "eb-garamond": {
    id: "eb-garamond",
    name: "EB Garamond",
    family: "Old style",
    designer: "Georg Duffner, after Garamont",
    googleFamily: "EB Garamond",
    note: "A revival of Claude Garamont's 16th-century romans, from a 1592 specimen.",
    weight: 800,
  },
  jost: {
    id: "jost",
    name: "Jost",
    family: "Geometric",
    designer: "Owen Earl, after Futura",
    googleFamily: "Jost",
    note: "A free take on the 1920s German geometric sans, Futura above all.",
    weight: 900,
  },
  lobster: {
    id: "lobster",
    name: "Lobster",
    family: "Script",
    designer: "Pablo Impallari",
    googleFamily: "Lobster",
    note: "A bold connected script, drawn with many alternates so letters join smoothly.",
    weight: 400,
  },
  fraunces: {
    id: "fraunces",
    name: "Fraunces",
    family: "Soft serif",
    designer: "Undercase Type",
    googleFamily: "Fraunces",
    note: "A \"wonky\" soft serif after early-1900s faces like Windsor and Cooper.",
    weight: 900,
  },
  literata: {
    id: "literata",
    name: "Literata",
    family: "Book serif",
    designer: "TypeTogether",
    googleFamily: "Literata",
    note: "Commissioned as the reading face of Google Play Books.",
    weight: 900,
  },
  "bodoni-moda": {
    id: "bodoni-moda",
    name: "Bodoni Moda",
    family: "Didone",
    designer: "Owen Earl, after Bodoni",
    googleFamily: "Bodoni Moda",
    note: "After Giambattista Bodoni's 18th-century Didones: hairline thins, heavy thicks.",
    weight: 900,
  },
  "kaushan-script": {
    id: "kaushan-script",
    name: "Kaushan Script",
    family: "Brush",
    designer: "Pablo Impallari",
    googleFamily: "Kaushan Script",
    note: "A brush script with the pace of quick hand lettering.",
    weight: 400,
  },
  "roboto-slab": {
    id: "roboto-slab",
    name: "Roboto Slab",
    family: "Slab",
    designer: "Christian Robertson",
    googleFamily: "Roboto Slab",
    note: "The slab-serif companion to Roboto, Android's system face.",
    weight: 900,
  },
  "archivo-black": {
    id: "archivo-black",
    name: "Archivo Black",
    family: "Grotesque",
    designer: "Omnibus-Type",
    googleFamily: "Archivo Black",
    note: "The heaviest member of Archivo, a grotesque made for headlines.",
    weight: 400,
  },
  "jetbrains-mono": {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    family: "Monospace",
    designer: "JetBrains",
    googleFamily: "JetBrains Mono",
    note: "Made for code: a tall lowercase, every letter the same width.",
    weight: 800,
  },
};
