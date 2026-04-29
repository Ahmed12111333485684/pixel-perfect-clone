## Problem

In `src/routes/index.tsx`, the hero section overlays a gradient that fades from `primary` at the top to `background` at the bottom. The three outline buttons (`Browse available properties`, `Backoffice sign in`, `Contact us`) use white text on a translucent white background (`bg-white/10`, `border-white/30`). Where the gradient reaches the bottom, the backdrop becomes near-white, so the buttons visually disappear.

## Fix

Two small, focused changes — no layout or copy changes:

1. **Strengthen the gradient floor under the buttons.** Change the hero overlay so it doesn't fade all the way to `background`. Stop the fade at a darker midpoint so the area behind the CTAs stays dim enough for white text to read.
   - Current: `from-primary/80 via-primary/60 to-background`
   - New: `from-primary/85 via-primary/70 to-primary/40` (keeps the cinematic fade but never reaches white)

2. **Make the outline buttons more legible on any backdrop.** Bump the translucent fill and border so they hold contrast even if the gradient changes again.
   - `bg-white/10` → `bg-white/15`
   - `border-white/30` → `border-white/40`
   - Add a subtle `shadow-lg shadow-black/10` so the button edges separate from the background.

The primary gold "List a property" button already has solid contrast and stays as-is.

## Files

- `src/routes/index.tsx` — update hero gradient overlay class and the three outline `Button` classNames.

## Out of scope

- No changes to `available-properties`, `list-property`, or the footer.
- No design token changes in `src/styles.css`.
