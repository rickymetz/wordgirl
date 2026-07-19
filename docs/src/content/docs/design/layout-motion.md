---
title: Layout, motion, and text
description: The scroll rule, the touch rules, the motion rules, and the two fonts.
---

## The scroll rule

A game screen must not have a page scroll when the content is not too large. The root element is exactly 100dvh. It is a flex column. The safe area is inner padding. Pages use `grow`. Do not use `min-h-dvh`.

The board sizes must change with the root font size. Use `useViewport()`. Its `vh` value does not include the safe area. Its `rem` value is the text size setting. Multiply each pixel constant by `rem / 16`.

## Touch rules

- Each touch target is 44 pixels or more. An invisible extension is permitted.
- Game surfaces get `touch-manipulation` and `select-none`.
- Buttons on game surfaces use `e.preventDefault()` in `onPointerDown`. Thus a touch does not move the focus from the grid.
- Each puzzle input closes an open words panel. A window key handler for Enter or Space must first examine the focused control.

## Dialogs

Sheets use `BottomSheet` or `CoachSheet` in `<AnimatePresence>`. Confirmations in the center use `ModalDialog`. Each dialog gets the focus control from `useModalFocus`. Set `data-autofocus` on the first element for the focus. For a results card, set it on the card.

## Motion

Three layers obey the motion preference of the user:

1. A global CSS rule makes all transitions and animations almost zero.
2. The application root has `<MotionConfig reducedMotion="user">`.
3. Some components examine the preference in code. `BottomSheet` uses `useReducedMotion`. `ConfettiOverlay` does not show at all.

## Text

- `--font-display` is the font for the UI. The stack is Avenir Next, ui-rounded, and system-ui.
- `--font-game` is Rubik Mono One. This is the heavy game font. Each hidden letter shows as `?` in this font. The font has one width for all characters. Thus the layout does not move when letters appear.
- The root font size is 18 pixels on screens of 768 pixels or more. The text size setting multiplies it by 87.5 to 125 percent.

## Words and icons

- Use neutral, clear labels. Do not use decorative text or special terms.
- Use only lucide-react icons in the UI. Emoji are permitted only in share texts.
- The title symbol of a game comes after the title, not before. The correct example is "Serpentine ⟆". The incorrect example is "⟆ Serpentine". This rule applies in game headers, in documents, and in marketing.
- Archive separators use `·`, not `.`.
