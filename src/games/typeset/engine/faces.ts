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

export interface Face {
  id: FaceId;
  /** The face's published name. */
  name: string;
  family: FaceFamily;
  /** Designer credit for the faces board's finish card. */
  designer: string;
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
    weight: 800,
  },
  jost: {
    id: "jost",
    name: "Jost",
    family: "Geometric",
    designer: "Owen Earl, after Futura",
    googleFamily: "Jost",
    weight: 900,
  },
  lobster: {
    id: "lobster",
    name: "Lobster",
    family: "Script",
    designer: "Pablo Impallari",
    googleFamily: "Lobster",
    weight: 400,
  },
  fraunces: {
    id: "fraunces",
    name: "Fraunces",
    family: "Soft serif",
    designer: "Undercase Type",
    googleFamily: "Fraunces",
    weight: 900,
  },
  literata: {
    id: "literata",
    name: "Literata",
    family: "Book serif",
    designer: "TypeTogether",
    googleFamily: "Literata",
    weight: 900,
  },
  "bodoni-moda": {
    id: "bodoni-moda",
    name: "Bodoni Moda",
    family: "Didone",
    designer: "Owen Earl, after Bodoni",
    googleFamily: "Bodoni Moda",
    weight: 900,
  },
  "kaushan-script": {
    id: "kaushan-script",
    name: "Kaushan Script",
    family: "Brush",
    designer: "Pablo Impallari",
    googleFamily: "Kaushan Script",
    weight: 400,
  },
  "roboto-slab": {
    id: "roboto-slab",
    name: "Roboto Slab",
    family: "Slab",
    designer: "Christian Robertson",
    googleFamily: "Roboto Slab",
    weight: 900,
  },
  "archivo-black": {
    id: "archivo-black",
    name: "Archivo Black",
    family: "Grotesque",
    designer: "Omnibus-Type",
    googleFamily: "Archivo Black",
    weight: 400,
  },
  "jetbrains-mono": {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    family: "Monospace",
    designer: "JetBrains",
    googleFamily: "JetBrains Mono",
    weight: 800,
  },
};
