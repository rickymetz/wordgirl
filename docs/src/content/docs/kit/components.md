---
title: Game kit — components
description: The shared UI parts that all the games use.
---

This is the rule: look in the kit before you make a new part. If you copy code from an other game a second time, move the code into the kit.

## Board and feedback (`src/components/game/`)

### Tile, tileClasses, and TileSocket

`Tile` is the letter tile. There is only one letter tile. It has four tones:

| Tone | Use |
|------|-----|
| `tile` | at rest, on plain surfaces only |
| `surface` | on tinted panels |
| `accent` | with attention |
| `ghost` | almost transparent |

The option `mini` gives the small size for hub cards. The function `tileClasses(tone, mini?)` gives the same style as a class string. Use it for motion elements that cannot contain the component. `TileSocket` is the empty position with the broken line. Use the option `subdued` on tinted panels.

### GameToast and useToast

`GameToast` is the message above the board. An example is "Not a word". The hook `useToast()` gives `{ toast, show(text, durationMs?) }`. Each message has a nonce. Thus the same message shows again correctly. The component has `aria-hidden`. Put the message text in an `aria-live` area also.

## Dialogs (`src/components/`)

- **BottomSheet.** A sheet from the bottom on telephones. A dialog in the center on larger screens. Put it in `<AnimatePresence>`.
- **CoachSheet** with **Key**. The instructions sheet. Each game gives a list of `CoachRule` items. Each item has an icon, a title, and a text.
- **ModalDialog.** A card in the center for confirmations. Without `onClose`, the dialog does not close from the background or the Escape key.
- **useModalFocus(active).** The focus control for all dialogs. It moves the focus to the element with `data-autofocus`. It keeps the Tab key in the dialog. It moves the focus back when the dialog closes.
- **SettingsDialog.** The theme and text size controls. It is in `data-level="neutral"`.
- **HomeLink.** The link to the hub with a large touch area.
- **ConfettiOverlay.** The confetti animation at the solve. It does not operate when the user prefers less motion.
- **StoragePrompt.** The persistent storage request. The game layout shows it.

## Results and shares

**ShareButton** has the options `text` and `gameId`. It is the share button in the accent color. It uses the system share sheet when it is available. If not, it copies the text. Only the share text is different in each game. The text ends with `SHARE_URL`. Emoji are permitted only in share texts.

## Hub and archive

### GameStatus

`GameStatus` is the state block on a hub card. It shows the date and the state line. An example is "Solved, 3-day streak". A game gives two load functions. One function gives the state text. One function gives the streak. This is approximately 15 lines for each game. The block loads again at midnight and when the application comes to the front.

### GameArchive

`GameArchive` makes the full archive page from a configuration. Do not make an archive page by hand. The `GameArchiveConfig` has these fields:

- `gameId` — the game id.
- `accent` — the accent key. This is the same as `accentLevel`.
- `epoch` — the first date of the game.
- `loadAllDays()` — gives all the saved days.
- `loadStats()` — gives the statistics.
- `hasPlayed(stats)` — true when the player has data.
- `statTiles(stats)` — gives the six stat tiles.
- `isDone(day)` — true when a day is complete.
- `rowStatus(dateKey, day)` — gives the text and the state for one row.

The component controls all the layout and the colors. The configuration is approximately 30 lines. Refer to `ui/ArchivePage.tsx` in each game.

### GameTrends

`GameTrends` makes the statistics page from a configuration. It shows one small chart for each metric in the accent color. The window is 30 days. A touch on a day shows its value. A metric gives `null` for a day without data. A gap shows in the chart, not a zero. Refer to [Charts](/docs/design/charts/).
