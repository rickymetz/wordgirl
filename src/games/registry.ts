import type { GameDefinition } from "./types";
import { polygram } from "./polygram";
import { crosshatch } from "./crosshatch";
import { backwords } from "./backwords";

/** Adding a game = new folder under games/ + one line here. */
export const games: GameDefinition[] = [polygram, crosshatch, backwords];
