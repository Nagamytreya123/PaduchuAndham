# Login / auth surface — design spec & QA checklist

Implementation lives in `client/src/pages/LoginPage.tsx` with tokens in `client/src/constants/authSurface.ts`. Global MUI theme remains dark; light auth uses **explicit hex tokens** so text never inherits near-white `text.primary` from the dark palette.

## Color tokens (semantic)

| Token | Value / role |
|--------|----------------|
| `stageBg` | Near-black stage behind panels (`#0B0B0C`) |
| `scrim` | (Legacy) Heavier scrim if reused elsewhere |
| `scrimOverVideo` | Darkening gradient on `/login` — **no full-viewport `backdrop-filter`** so video stays visible |
| `glass.*` | Semi-transparent panels + shared frosted `backdrop-filter` / borders / shadows |
| `panel.bg` | Solid hero fallback |
| `panel.border` | Hairline (solid panels) |
| `panelElevated.bg` | Solid form fallback |
| `panelElevated.border` | Card edge |
| `text.primary` | Headings / labels on light (`#1A1814`) |
| `text.muted` | Body / helper (`#4F483E`, ≥4.5:1 on `#F5F5F5` for 14px) |
| `text.onAccent` | Text on gold buttons (`#141210`) |
| `accent` / `accentHover` | Primary CTA gold (`#B8922E` / `#9A7824`) |
| `accentSoftBg` | Selected tab wash |
| `accentFocusRing` | 2px focus halo at ~42% opacity over accent |
| `input.bg` / `glass.inputBg` / `input.border` | Solid white / **~78% white in fields on glass** / `#D4CFC4` |
| `input.borderOnGlass` | Darker hairline on frosted panels (`#9A9286`) |
| `input.borderHover` / `input.borderFocus` | Hover + focus border deepen |
| `error` / `errorBg` | Inline errors |

## Spacing (8px grid)

- Outer stage padding: `24px` (xs) → `40px` (md) (`py` / `px` in theme units 3–5).
- Form card padding: `20px`–`32px`.
- Stack gaps between blocks: `16px` (`spacing={2}`).
- Tabs / primary CTA vertical rhythm: `12px`–`16px`.

## Type scale (this surface)

- Eyeline: **H1** Cormorant “Welcome back” / “Join the lookbook” (`h2` MUI variant for size, `component="h1"`).
- Short value prop: `body1`, muted token (not theme `text.secondary`).
- Section label “Returning customer”: `subtitle2` ~15px semibold.
- Microcopy / dev callout: `caption` + monospace stack for dev-only helper.

## Interactive states

| Control | Rest | Hover | Focus | Error | Disabled |
|---------|------|-------|-------|-------|----------|
| Outlined input | 1px `input.border`, `input.bg`, inset shadow | Border `input.borderHover` | 2px `accentFocusRing` + `input.borderFocus` | `error` border + helper text | Muted fill + 12% border |
| Tab | Muted text | 4% dark wash | Keyboard: browser + Mui-selected | — | — |
| Tab selected | `accentSoftBg` + **3px gold indicator** + primary text weight 600 | — | — | — | — |
| Primary (Google) | Solid `accent` | `accentHover` | `outline` 2px + offset | — | — |
| Dev outlined button | `input.border` | Gold border + soft bg | `accentFocusRing` outline | — | Muted border/text |
| Icon “Why sign in?” | Muted + hairline border | Light fill | Focus ring | — | — |

## Content hierarchy (DOM / visual)

1. **Tabs** (Sign in / Sign up) — unmistakable selected state (wash + indicator).
2. One-line value prop.
3. **Google** primary CTA.
4. **OR** divider.
5. Email / dev block (development only) with visible labels.
6. Secondary row: help link (sign-in) or terms copy (sign-up) + back to shop.

**Mobile:** Form column is **first in DOM** and `order: 1`; hero `order: 2` so the form appears first without relying on CSS-only reorder for focus.

**Desktop (`md+`):** Hero left (`order: 1`), form right (`order: 2`) via Grid `order`.

## Motion

- Panel entrance: ~350ms ease-out translate + opacity (skipped when `prefers-reduced-motion: reduce`).
- Tab panel cross-fade: 150–200ms (`AnimatePresence`).
- No parallax on the form; inputs stay visually stable.

## Keyboard order (Tab)

1. Tab “Sign in” → Tab “Sign up”
2. Continue with Google (link button)
3. (Dev) Display name → Email → Dev action button
4. “Can’t access your account?” (sign-in) or terms text (no tab stop on static Typography)
5. Back to shop link
6. (Hero) “Why sign in?” `IconButton`
7. (Hero has no other focusables except scroll—none)

## Wiring video

- **Source file:** `client/src/assets/auth-ambient.mp4` (imported as `import ambientVideoUrl from '../assets/auth-ambient.mp4?url'`). Vite emits a hashed file in `dist/assets/` so the URL is always correct in dev and production (no reliance on `/auth-ambient.mp4` in `public/`).
- **`Box[data-auth-ambient]`** wraps the clip (`object-fit: cover`, `muted`, `playsInline`). **`prefers-reduced-motion: reduce`**: no autoplay / no loop, video stays mounted for a still frame.
- **No full-page scrim** — the video sits directly behind nearly **transparent** glass panels (`backdrop-filter` + ~2% white tint). Typography uses light **text-shadow** so copy stays readable over motion.

## Acceptance tests

1. **Greyscale:** Headings, inputs, and card edges remain distinguishable (borders + weight, not hue alone).
2. **Keyboard:** Tab through every focusable control; each shows a visible focus ring or browser outline + custom gold halo on custom buttons.
3. **200% zoom:** No clipped inputs; `minWidth: 0` on grid columns; padding scales with breakpoints.

## Signup / errors (dev)

- Invalid email after blur: helper text under field.
- Sign-up name optional (dev); email validated on blur.
- API `devErr`: `Alert` with error token colors.
- Reference line for future password rules (dev-only monospace note).
