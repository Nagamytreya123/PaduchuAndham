# Master UX/UI Prompt — Side-by-Side Product Showcase & Cinematic Transitions

**Use this document as a system or task prompt** when designing or implementing product browsing where **two (or more) products appear side by side** and the user moves between them with **premium, reel-quality motion**.

**Reference intent (static frames + motion reels):** monochromatic “studio” surfaces (soft blue / lavender / single-hue worlds), **large rounded hero card**, **floating photoreal product** with soft contact shadow, **oversized low-contrast brand wordmark** behind the product for depth, **partial second product** visible at the edge (carousel “peek”), **minimal sans hierarchy** (title, price, body), **circular size/color controls**, **bottom dots + chevrons**, **PLAY VIDEO**-style secondary CTA. Motion tags in references: *smooth animations*, *Motion*, *Figma* — prioritize **fluid horizontal choreography**, not generic carousel snaps.

---

## 1. North Star

Build a **side-by-side product stage**: the **primary product** is dominant center-left (or center); the **adjacent product** is **partially visible** (cropped) on the opposite edge — enough to read silhouette and color story, not a full second card. On transition, the **current hero exits** while the **incoming hero promotes** from the peek into full focus. The interaction must feel **cinematic, calm, expensive**, and **physics-based** (springs with high damping, tiny overshoot only).

**Non-goals:** harsh snaps, linear slides, busy multi-card grids, neon gamification, long motion (>1.2s) on primary path.

---

## 2. Layout System — “Dual Stage”

### 2.1 Composition

- **Viewport:** one **wide rounded container** (single hue or subtle vertical gradient), **generous padding**, **max-width** capped so the card feels editorial, not dashboard.
- **Z-layers (back → front):**
  1. Page background (solid or very soft gradient).
  2. **Ambient wordmark** or brand glyph — **large, low-opacity**, slightly **blurred or soft**, anchored to card — moves **slower than products** (parallax).
  3. **Product pair plane:** two product instances in one row — **flex or grid** with **overflow hidden** on the card so the inactive side **clips** as a peek.
  4. **Glass / frosted strip** optional for top nav links (Women / Kids / Customize pattern).
  5. **Typography + controls** on top with clear **T → price → description → selectors → CTAs** hierarchy.

### 2.2 Side-by-side rules

- **Active product:** ~**62–72%** of inner width, **larger scale** (1), **full opacity**, **sharpest image**, **strongest shadow**.
- **Adjacent peek:** ~**28–38%** visible of secondary, **scale 0.88–0.94**, **opacity 0.55–0.75**, **slight blur (2–4px)** optional, **lighter shadow**, **lower z-index**.
- **Vertical alignment:** optical center; allow **slight rotation** on hero shoe (2–6°) for energy — **subtle**, not toy-like.

### 2.3 Responsive

- **Desktop:** true side-by-side peek inside one card.
- **Tablet:** reduce peek width; keep same motion language.
- **Mobile:** optional **stack** (peek becomes small thumbnail strip) **or** single full-width hero with **edge peek** only — **must keep** horizontal swipe + same exit/enter semantics.

---

## 3. Motion Choreography — Transition Between Products

**Default direction:** “Next” = current moves **left**, incoming arrives from **right** (mirror for “Previous”).

### 3.1 Phase map (single transition)

| Phase | Active (exiting) | Incoming (from peek / off-stage) | Background / wordmark |
|-------|------------------|-----------------------------------|------------------------|
| **A — Intent** | Slight **press** on nav control or drag **elastic** | — | — |
| **B — Exit** | **x:** 0 → negative; **scale:** 1 → ~0.92; **opacity:** 1 → 0; **blur:** 0 → ~6px; **z-index** drops | Holds or begins **counter-motion** | **Parallax** drift opposite to product motion (~15–25% speed) |
| **C — Cross** | Continues off-canvas | **x:** from positive offset → 0; **scale:** ~1.06–1.1 → 1; **opacity:** 0 → 1; **blur:** ~8–12px → 0; **z-index** rises | Continues slow settle |
| **D — Settle** | Unmounted or fully hidden | **Spring** on scale/position: **stiffness medium**, **damping high**, **micro overshoot** only on scale (e.g. 1 → 1.012 → 1) | Ease-out to rest |

**Durations:** exit **700–950ms** (tween + ease); enter blend **tween for blur/opacity**, **spring for x/scale**; total perceived beat **< 1.1s**.

**Easing (tween segments only):** `cubic-bezier(0.22, 1, 0.36, 1)` — **never** linear for hero motion.

### 3.2 Depth & focus

- **Camera metaphor:** during B–C, **slight blur** on **exiting** image; incoming **ramps to sharp**. At rest, only active is tack-sharp.
- **Shadow:** exiting **loses elevation**; incoming **gains layered shadow** (ambient + contact).

### 3.3 Text & controls (staggered from image)

**Order after product motion starts (not before):**

1. Outgoing **title/price** quick **fade + 8–16px slide** opposite travel direction (**~200–280ms**).
2. **Image / card plane** transition (main beat).
3. Incoming **title** → **price** → **description** → **size/color** → **primary CTA** with **stagger 60–100ms**, **fade + 12–24px rise**.

**CTAs last** so the eye lands on action after comprehension.

---

## 4. Microinteractions

- **Nav chevrons / dots:** hover **scale 1.04–1.08**, soft **glow** (same hue family), **spring** tap at **0.94** scale.
- **Idle:** **optional** 6–12px vertical **float** on hero product (slow loop, `ease-in-out`, **respect `prefers-reduced-motion`**).
- **Pointer parallax:** **2–6px** max translation on product against cursor; **rotate** max **2–4°**; spring-return on leave.
- **Drag (touch):** horizontal drag with **elastic resistance**; release past threshold commits **next/prev** with same choreography; below threshold **spring back** to center.

---

## 5. Technical Implementation Hints (for engineers)

- **AnimatePresence** with **`custom` direction**; variants **`enter` / `center` / `exit`** driven by **+1 / -1**.
- **GPU:** animate **`transform`**, **`opacity`**, **`filter`** only on promoted layers; avoid **width/height/margin** animation on the hero.
- **Layout:** `overflow: hidden` on the **card**, **flex row** for two product columns; animate **inner track** `translateX` **or** individual product wrappers — prefer **single track** if designing infinite strip, **dual nodes** if only two visible (current + peek).
- **Performance:** `will-change: transform` only while transitioning; remove after settle.
- **Accessibility:** respect **`prefers-reduced-motion`** (fade + short distance, no blur play, no idle float, no parallax).
- **Focus:** move **focus** to incoming title or “Add” control after transition when using keyboard.

---

## 6. Visual Design Tokens (from references)

- **Palette:** one **dominant hue** + white text + **1 accent** for selected chip; avoid rainbow UI.
- **Card:** **large radius** (16–28px), **subtle border** or **inner highlight**, **soft outer shadow**.
- **Typography:** modern **geometric or neo-grotesk** for UI; **display weight** for product name; **muted** body.
- **Imagery:** **cut-out or high-key** product on **tonal** ground; consistent **lighting direction** across SKUs when possible.

---

## 7. Acceptance Criteria (binary checks)

- [ ] Two products readable as **side-by-side** or **peek** in one hero.
- [ ] **Next** transition: current **exits left**, incoming **from right**, **settles center** with **spring-damped** finish.
- [ ] **Previous** mirrors cleanly.
- [ ] **Wordmark/background** moves **slower** than product layer.
- [ ] **Text stagger** runs **after** hero motion begins; **CTA last**.
- [ ] **60fps** on mid-tier mobile during transition (no layout thrash).
- [ ] **Reduced motion** path is **instantly usable** and dignified.

---

## 8. One-Line Brief (paste into tickets)

> **“Monochrome floating-product hero with side peek; on change, outgoing slides left + soft blur + scale down, incoming promotes from right with spring settle; parallax wordmark; stagger title → price → copy → selectors → CTA; GPU-only motion; full reduced-motion fallback.”**

---

## 9. Video reference note

If a **screen recording** (e.g. WhatsApp `.mp4`) contains timing beats not visible in static frames, **extract 3–5 keyframes** (start / mid-transition / settle) and append: **frame timestamps**, **direction**, and **easing feel** (snappy vs floaty) to section **3** above so implementation matches the reel exactly.

---

*Generated for Paduchuandham / ecommerce product showcase work. Adjust hue, copy, and commerce controls (size grid → your variant picker) to match your catalog.*
