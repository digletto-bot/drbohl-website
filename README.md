# Dr.Bohl — Official Website

Mobile-first interactive title-card website for Austrian comedian and entertainer **Dr.Bohl**.

---

## Project Structure

```
/
├── index.html              ← Main entry point (10 swipeable title cards)
├── css/
│   ├── variables.css       ← Design tokens (colours, spacing, typography)
│   ├── base.css            ← Reset, font-face declarations, global defaults
│   ├── layout.css          ← Card frame, viewport, desktop phone-shell
│   ├── components.css      ← Progress nav, buttons, menu overlay, subpages
│   └── animations.css      ← Slide transitions, entrance effects, Ken Burns
├── js/
│   ├── main.js             ← App entry point; wires everything together
│   ├── slider.js           ← Slider class (swipe, keyboard, programmatic)
│   ├── menu.js             ← Menu class (open/close, active state, scroll)
│   └── animations.js       ← Progress nav updates, slide counter, swipe hint
├── assets/
│   ├── images/             ← Hero images (see naming below)
│   ├── icons/              ← SVG icons
│   └── fonts/              ← DrukCondensed + NeueHaasGrotesk
├── subpages/               ← 9 placeholder subpages
└── README.md
```

---

## How to Replace Images

Place files in `assets/images/` using these exact names:

| Slide             | Filename                       |
|-------------------|-------------------------------|
| Home              | `home-hero.jpg`                |
| Kabarett          | `kabarett-hero.jpg`            |
| Social Media      | `social-media-hero.jpg`        |
| Showtime          | `showtime-hero.jpg`            |
| Musik             | `musik-hero.jpg`               |
| Podcast           | `podcast-hero.jpg`             |
| Bohl100           | `bohl100-hero.jpg`             |
| Bohl Entertainment| `bohlentertainment-hero.jpg`   |
| About             | `about-hero.jpg`               |
| Schabernack       | `schabernack-hero.jpg`         |

**Desktop variants** (optional, wider crop): add `-desktop` suffix, e.g. `home-hero-desktop.jpg`.
Swap them in via CSS `@media (min-width: 600px)` if needed.

Recommended resolution: **1080 × 1920px** (portrait) for mobile hero images.
JPG at 80–85% quality for optimal file size. WebP also supported — update the `src` in HTML.

---

## How to Add New Title Cards

1. **HTML** (`index.html`) — add a new `<article class="title-card card--mynewslide is-next">` block following the existing pattern. Give it the next `data-index`.
2. **Progress nav** — add a new `<button class="progress-nav__item">` in the nav.
3. **Menu overlay** — add a new `<li><button class="menu-card">` in `#menu-list`.
4. **`slider.js`** — `totalSlides` is derived from the DOM; no code change needed.
5. **Image** — add `assets/images/mynewslide-hero.jpg`.
6. **Subpage** — create `subpages/mynewslide.html` following the existing template.

---

## How to Change Colours

All colours are defined as CSS custom properties in `css/variables.css`.

```css
--hero-yellow:   #f2c12e;   /* Primary accent */
--hover-yellow:  #e5a800;   /* Hover state */
--tap-yellow:    #fde99a;   /* Tap/click flash */
--bg-dark:       #1f1f1f;   /* Card backgrounds */
--black:         #0a0a0a;   /* Site background */
```

Change the value in one place — it propagates to every component.

---

## How to Update Fonts

1. Place `.woff2` (and optionally `.woff`) files in `assets/fonts/`.
2. Update the `@font-face` declarations at the top of `css/base.css`.
3. Update `--font-display` and `--font-body` in `css/variables.css` if switching families.

Required files for the default setup:

```
DrukCondensed-Bold.woff2 / .woff
DrukCondensed-Medium.woff2 / .woff
NeueHaasGrotesk-Text.woff2 / .woff
NeueHaasGrotesk-Medium.woff2 / .woff
NeueHaasGrotesk-Bold.woff2 / .woff
```

---

## How the Slider Works

**File:** `js/slider.js`

The slider uses CSS class-based positioning (`is-prev`, `is-current`, `is-next`) combined with `translateX()` transitions defined in `css/animations.css`.

- **`goTo(index)`** — animate to any slide
- **`next()` / `prev()`** — convenience wrappers
- **Touch / swipe** — threshold at 25% card width
- **Mouse drag** — works on desktop (damped by 0.65)
- **Keyboard** — `←` / `→` arrow keys

Animation: 450ms, `cubic-bezier(0.22, 1, 0.36, 1)` (spring-ish deceleration).

---

## How the Menu Overlay Works

**File:** `js/menu.js`

- Burger button → `menu.open()`
- Menu slides in from right (`translateX(100%)` → `translateX(0)`)
- Close via: close button, ESC key, or clicking the overlay backdrop
- Clicking a menu card → `close()` then `slider.goTo(index)` after 80ms
- Active card highlighted with yellow border
- Scrolls to the active item on open

---

## How Placeholder Subpages Are Linked

Each title card's bottom `<a href="subpages/X.html">` links to the corresponding placeholder.
Each subpage has a "Zurück" link back to `../index.html`.

When building out real subpages, simply replace the content of each `subpages/*.html` file.

---

## How Animations Are Structured

All CSS animations live in `css/animations.css`:

| Animation      | Trigger                  | Duration  |
|----------------|--------------------------|-----------|
| Slide push     | `.is-prev/current/next`  | 450ms     |
| Card entrance  | `.is-current` selector   | 500–550ms |
| Ken Burns zoom | `.is-current img`        | 8s        |
| Menu cards     | `.is-open .menu-card`    | 400ms stagger |
| Swipe hint     | On load, one-shot        | 2.4s      |
| Progress pulse | On bar becoming active   | 1.2s, 1×  |

JS-driven animation hooks are exported from `js/animations.js`:
- `updateProgressNav(index)`
- `updateSlideCounter(index, total)`
- `dismissSwipeHint()`

---

## Code Export

The site includes a built-in export button (visible on desktop, bottom-right corner).
Clicking it downloads all source files as `drbohl-website.zip` using JSZip (loaded from CDN on demand).

To export manually: right-click → Save Page As, or use any static site downloader.

---

## Desktop Implementation

On screens ≥ 600px, the site renders as a centered iPhone-style frame (390×844px) with:
- Subtle glow behind the frame
- Side navigation arrows (prev/next)
- Slide counter (01 / 10)
- Export code button

The same HTML/CSS/JS runs on both mobile and desktop — only the wrapper and decorative chrome change.

For desktop-specific hero images with a wider crop, add `-desktop` image variants and swap them in via `@media (min-width: 600px) { .card--X .title-card__image { content: url(...); } }`.

---

## Future Development Notes

- **Real subpages** — replace placeholder content in `subpages/*.html`
- **CMS integration** — slides can be driven from a JSON data file; replace hardcoded HTML with a template render
- **Video hero** — swap `<img>` for `<video autoplay muted loop playsinline>` in any card
- **Ticket integration** — connect Showtime card to a ticketing API
- **Analytics** — add slide view events (`goTo` callback in `main.js`)
- **PWA** — add `manifest.json` + service worker for installable app experience
- **Preloading** — preload next card's image on current card activation
- **Dark/light theme** — override CSS variables in a `[data-theme="light"]` selector
