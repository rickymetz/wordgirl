import type { GameDefinition } from "./types";
import { polygram } from "./polygram";
import { crosshatch } from "./crosshatch";
import { pierglass } from "./pierglass";
import { doublet } from "./doublet";
import { serpentine } from "./serpentine";

/** Adding a game = new folder under games/ + one line here. */
export const games: GameDefinition[] = [polygram, crosshatch, pierglass, doublet, serpentine];
