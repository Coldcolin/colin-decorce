# Build Spec: Scroll‑Driven Portfolio Website

**Audience:** Claude Code (implementing agent)
**Reviewer:** Codex (verification)
**Goal:** Build a single‑page personal portfolio with an Apple‑style, scroll‑driven
canvas image‑sequence animation as the fixed background. The site is a **static
site — no framework, no build step, no bundler.** Three files plus assets.

Follow this document literally. Every value below is intentional. Where a value is a
placeholder for the site owner's content it is marked `<<LIKE THIS>>` — replace those,
but do not change design tokens, layout math, or the animation logic unless a section
explicitly says it is optional.

---

## 1. Outcome / definition of done

A visitor loads the page and sees a full‑viewport background of a subject (portrait,
product, 3D render, etc.) rendered on a `<canvas>`. As they scroll top→bottom, the
canvas plays through an ordered image sequence in lock‑step with scroll position, so
scrolling appears to rotate/animate the subject. Foreground content (hero, about,
projects, services, values, contact, footer) scrolls normally on top of the fixed
canvas, over a darkening gradient that keeps text readable.

The site must be:
- **Framework‑free:** plain HTML5 + CSS3 + vanilla JS (ES6). No React/Vue/Tailwind/jQuery.
- **Build‑free:** opens correctly by serving the folder statically. No `package.json` required to run.
- **Responsive:** 320 px phone → 1400 px desktop, with the breakpoints defined in §5.
- **Deployable to Vercel** as a static project with zero configuration.

---

## 2. Tech stack & hard constraints

| Concern | Choice | Notes |
|---|---|---|
| Markup | Single `index.html` | Semantic sections with `id`s for nav anchors |
| Styling | Single `style.css` | CSS custom properties, `backdrop-filter` glassmorphism |
| Behavior | Single `script.js` | Canvas sequence, IntersectionObserver nav, hamburger, form |
| Fonts | Google Fonts: **Oswald** (headings), **Inter** (body) | Loaded via `<link>` |
| Animation | HTML5 Canvas 2D + `scroll` event + `requestAnimationFrame` | No animation library |
| Contact | **Web3Forms** (`api.web3forms.com/submit`) | Serverless; needs a free access key |
| Hosting | Vercel static | No SSR, no serverless functions |

**Do not** introduce npm dependencies, CSS frameworks, or a bundler. If you scaffold a
`package.json` at all, it may only contain static‑preview convenience scripts; the site
must still work when the folder is served directly.

---

## 3. File & folder structure

```
portfolio/
├── index.html
├── style.css
├── script.js
├── frames/                 # ordered image sequence, zero-padded to 6 digits
│   ├── frame_000000.webp
│   ├── frame_000001.webp
│   └── … frame_000239.webp   # 240 frames total (0-indexed)
├── projects/               # project screenshots referenced by the cards
│   ├── project-1.png
│   ├── project-2.png
│   └── project-3.jpg
└── favicon.ico             # optional
```

Rules for `frames/`:
- Filenames are `frame_` + a **6‑digit zero‑padded** 0‑based index + `.webp`.
- Frames must be a single continuous motion (e.g. a subject turning ~180°→360°). The
  first and last frame determine the animation's start and end states.
- **Target ~240 frames.** Fewer than ~120 looks choppy; more than ~300 bloats load time.
- Keep each frame small: **WebP, ≤ ~25 KB each, 1280–1920 px wide**. Total sequence
  should stay in the ~4–6 MB range. See §7 for how to generate them.

---

## 4. Design system (exact tokens)

Declare these in `:root` and use the variables everywhere. Do not hardcode hexes that
duplicate a token.

```css
:root {
  --bg-color:      #0b0704;  /* near-black, warm */
  --text-color:    #ffffff;
  --text-muted:    #D2CFCD;
  --primary-color: #ea6c31;  /* vibrant orange accent  */
  --font-heading:  'Oswald', sans-serif;
  --font-body:     'Inter', sans-serif;
}
```

Derived/literal values used across the UI (keep consistent):
- Primary hover: `#f77a3f`
- Success text: `#4ade80` · Error text: `#ef4444`
- Glass surface fill: `rgba(255,255,255,0.03–0.05)`
- Glass border: `1px solid rgba(255,255,255,0.1)` (cards) / `0.05` (section dividers)
- Glass blur: `backdrop-filter: blur(10–16px)` (always pair with `-webkit-backdrop-filter`)
- Pill radius (buttons/nav): `2rem` · Card radius: `1rem` · Image radius: `1.5rem`
- Content max width: `1400px`, centered, `padding: 0 2rem` (`1.1rem` on mobile)

Typographic scale:
- Hero title: `font-family: var(--font-heading)`, `clamp(2.8rem, 15vw, 12rem)`,
  `line-height: 0.8`, `text-transform: uppercase`, `letter-spacing: -2px`.
- Section titles: Oswald, `3rem`, weight 400.
- About statement: Oswald, `2.2rem`, `line-height: 1.4`.
- Body copy: Inter, `0.9–1.2rem`, `line-height: 1.6`.
- Eyebrow labels (e.g. "✦ About Me"): `0.9rem`, muted, the accent‑colored ones use `--primary-color`.

**Global resets:** `* { box-sizing: border-box; margin: 0; padding: 0; }`,
`html { scroll-behavior: smooth; overflow-x: clip; }`,
`body { overflow-x: hidden; background: var(--bg-color); color: var(--text-color); font-family: var(--font-body); }`.

---

## 5. Layout — build these sections in order

All sections live inside `<main class="content-wrapper">`, which sits above the fixed
background layers. Structure:

```html
<body>
  <div class="animation-container">
    <canvas id="scroll-canvas"></canvas>
  </div>
  <div class="overlay-gradient"></div>
  <main class="content-wrapper">
    <header class="navbar"> … </header>
    <section class="hero"> … </section>
    <div class="stats-section"> … </div>
    <section class="about" id="about"> … </section>
    <section class="logos-strip"> … </section>     <!-- tech stack -->
    <section class="projects-section" id="projects"> … </section>
    <section class="services-section" id="services"> … </section>
    <section class="testimonials-section" id="testimonials"> … </section>  <!-- "core values" -->
    <section class="contact-section" id="contact"> … </section>
    <footer class="site-footer"> … </footer>
  </main>
  <script src="script.js"></script>
</body>
```

### 5.1 Background layers
- `.animation-container`: `position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: -2; background:#000;` centered flex.
- `canvas`: `width: 100vw; height: 100vh; object-fit: cover;`
- `.overlay-gradient`: `position: fixed; inset: 0; z-index: -1; pointer-events: none;`
  `background: linear-gradient(to bottom, rgba(11,7,4,0.4) 0%, rgba(11,7,4,0.9) 100%);`
- `.content-wrapper`: `position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; padding: 0 2rem;`

### 5.2 Navbar (`.navbar`, fixed, `z-index:1000`)
- Left: `.logo` (Oswald, uppercase, name).
- Center: `.nav-links` — a glass pill containing `<a class="nav-item">` for
  About / Projects / Services / Testimonials / Contact, plus an absolutely‑positioned
  `.nav-indicator` div that slides behind the active item.
- Right: `.nav-cta` primary button ("Start a Project") and a `.hamburger` button
  (3 `<span>`s) shown only on mobile.
- The sliding indicator transition: `left .3s cubic-bezier(.25,1,.5,1), width .3s cubic-bezier(.25,1,.5,1)`.

### 5.3 Hero (`.hero`, centered column)
- `.hero-top-label` eyebrow ("Hi, I am"), accent color.
- `.hero-title` — big two‑word name; second word wrapped in `<span>` at 90% white.
- `.hero-content` row: `.hero-left` (tagline `<h2>` + `.hero-actions` buttons) and
  `.hero-right` (`.stats-card` glass card with an avatar cluster + a headline stat).
  `.hero-content` uses `margin-top: -8rem` on desktop to overlap the giant title.

### 5.4 Stats band (`.stats-section`)
- 4‑column CSS grid, top+bottom hairline borders, faint white fill.
- Each `.stat-box`: big Oswald `--primary-color` number (`.stat-val`, `3rem`) + muted uppercase `.stat-label`.

### 5.5 About (`.about`, `id="about"`)
- Two columns: `.about-label` (30%) eyebrow, `.about-text` (70%, max 800px) large Oswald statement + two `.btn` actions.

### 5.6 Tech strip (`.logos-strip`)
- Eyebrow title + a centered, wrapping row of technology names separated by `·`.

### 5.7 Projects (`.projects-section`, `id="projects"`)
- Right‑aligned `.projects-header` (accent eyebrow + Oswald title).
- `.projects-grid` — 2 columns, **staggered**: `.project-card:nth-child(even){ margin-top:6rem; }`.
- Each card: `.project-image-wrapper` (radius `1.5rem`, `aspect-ratio:16/10`, image
  scales to `1.05` on hover) + `.project-info` (Oswald `<h3>`, muted `<p>`, a
  `.project-tag` pill listing the stack).
- `.projects-footer`: large Oswald closing statement.

### 5.8 Services (`.services-section`, `id="services"`)
- Centered header. `.services-grid`: `repeat(auto-fit, minmax(300px,1fr))`.
- `.service-card` glass cards (Oswald `<h3>` + muted `<p>`).

### 5.9 Values / "Testimonials" (`.testimonials-section`, `id="testimonials"`)
- Same glass‑card grid pattern (`minmax(400px,1fr)`). Each card: italic statement `<p>` + `.client-info strong` label.

### 5.10 Contact (`.contact-section`, `id="contact"`)
- Centered header + `.contact-content` glass card holding the Web3Forms `<form>` (see §8).

### 5.11 Footer (`.site-footer`)
- `.footer-content` row: logo+role, `.footer-nav` anchors, `.social-links` (LinkedIn, GitHub). Copyright line below.

### Responsive breakpoints (required)
- **≤ 1024px:** hero title `clamp(3rem,12vw,8rem)`; `.hero-content` and `.about` stack to column.
- **≤ 768px:** projects grid → 1 column, remove even‑card offset; stats grid → 2 columns; tech strip wraps/centers.
- **≤ 600px:** full mobile pass — navbar becomes `position: relative` with a dropdown
  `.nav-links.mobile-open`; hamburger visible; hide `.nav-indicator` and `.nav-cta`;
  hero title `clamp(2.2rem,11vw,4rem)`; inputs use `font-size: max(0.95rem,16px)` to
  stop iOS zoom‑on‑focus.

---

## 6. The scroll animation (centerpiece — implement exactly)

Put this at the **top of `script.js`**. It preloads every frame, sizes the canvas to the
first frame, then maps scroll fraction → frame index and redraws inside `requestAnimationFrame`.

```js
const canvas  = document.getElementById('scroll-canvas');
const context = canvas.getContext('2d');

const frameCount   = 240; // MUST equal the number of files in /frames
const currentFrame = i => `./frames/frame_${i.toString().padStart(6, '0')}.webp`;

// Preload all frames up front
const images = [];
for (let i = 0; i < frameCount; i++) {
  const img = new Image();
  img.src = currentFrame(i);
  images.push(img);
}

// Size the canvas to the first frame and draw it
images[0].onload = () => {
  canvas.width  = images[0].naturalWidth  || 1920;
  canvas.height = images[0].naturalHeight || 1080;
  context.drawImage(images[0], 0, 0);
};

let currentFrameIndex = 0;

window.addEventListener('scroll', () => {
  const scrollTop     = document.documentElement.scrollTop;
  const maxScrollTop  = document.documentElement.scrollHeight - window.innerHeight;
  const scrollFraction = scrollTop / maxScrollTop;

  let frameIndex = Math.floor(scrollFraction * frameCount);
  frameIndex = Math.min(frameCount - 1, Math.max(0, frameIndex));

  if (frameIndex !== currentFrameIndex) {
    currentFrameIndex = frameIndex;
    requestAnimationFrame(() => {
      if (images[frameIndex] && images[frameIndex].complete) {
        context.drawImage(images[frameIndex], 0, 0);
      }
    });
  }
});
```

Contract for this block:
- `frameCount` **must** equal the actual file count in `frames/`, or the end of the
  sequence never plays / throws past the array.
- Redraws only happen when the computed index changes (avoids redundant paints).
- Canvas intrinsic size = frame's natural size; CSS (`object-fit: cover`) handles display scaling.

**Optional hardening (allowed, recommended, do not change the mapping math):**
- Guard against `maxScrollTop === 0` (very short viewports): `const f = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;`.
- Add `<link rel="preload" as="image" href="./frames/frame_000000.webp">` for the first frame.
- Optionally show frame 0 until the sequence is warm; do **not** add a third‑party loader library.

---

## 7. Generating the frame sequence (the input you must produce)

The `frames/` folder is the one asset you can't copy — generate it from a short source
clip or a 3D turntable render. Use `ffmpeg` locally (not a runtime dependency of the site).

1. Record/obtain a **3–6 s** clip of the subject making one clean motion (a person
   turning their head, a product rotating). Steady lighting, plain background reads best.
2. Extract ~240 frames and convert to WebP:

```bash
mkdir -p frames

# Extract 240 evenly-spaced frames, scaled to 1280px wide, as WebP.
ffmpeg -i source.mp4 \
  -vf "scale=1280:-1,fps=240/$(ffprobe -v 0 -of csv=p=0 \
       -show_entries format=duration source.mp4)" \
  -qscale 75 \
  frames/frame_%06d.webp
```

Simpler, more predictable alternative — dump all frames, then keep 240 evenly:

```bash
ffmpeg -i source.mp4 -vf "scale=1280:-1" frames/tmp_%06d.png
# then downsample to ~240 and convert with your script of choice, renaming to
# frame_000000.webp … frame_000239.webp (contiguous, zero-padded, 0-based)
```

3. Verify: files are contiguous from `frame_000000` with no gaps, each ≤ ~25 KB, and the
   **count equals `frameCount` in `script.js`.** If you produce a different count, update
   `frameCount` to match — the two must always agree.

---

## 8. Contact form (Web3Forms)

Markup inside `.contact-content`:

```html
<form action="https://api.web3forms.com/submit" method="POST" id="contact-form" class="contact-form">
  <input type="hidden" name="access_key" value="<<YOUR_WEB3FORMS_ACCESS_KEY>>">
  <input type="hidden" name="subject"    value="New Portfolio Contact Message">
  <input type="hidden" name="from_name"  value="Portfolio Website">
  <input type="text"     name="name"    id="name"    placeholder="Your Name"    required>
  <input type="email"    name="email"   id="email"   placeholder="Your Email"   required>
  <textarea              name="message" id="message" placeholder="Your Message" rows="5" required></textarea>
  <button type="submit" id="submit-btn" class="btn btn-primary">Send Message <span class="arrow">↗</span></button>
  <div id="form-result" style="display:none;margin-top:1rem;font-size:0.9rem;text-align:center;"></div>
</form>
```

JS handler (append to `script.js`, inside `DOMContentLoaded`): `preventDefault`, validate
email with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, serialize form to JSON, `fetch` POST to
`https://api.web3forms.com/submit` with `Content-Type: application/json`. On `status === 200`
show a green success message and `form.reset()`; else show the returned message in red;
`catch` shows a generic error; `finally` restores the button and auto‑hides success after 5 s.
Set the button to a disabled "Sending…" state during the request.

> Get a free access key at web3forms.com (email‑based, no account server needed). The key
> is safe to expose in client code — that's how Web3Forms is designed.

---

## 9. Navigation behavior (script.js)

Inside `DOMContentLoaded`:
1. **Hamburger:** toggle `.mobile-open` on `#main-nav` and `.open` on the button; keep
   `aria-expanded` in sync; close on nav‑item click and on outside click.
2. **Active‑section highlighting:** an `IntersectionObserver` over `section[id]` with
   `rootMargin: '-40% 0px -60% 0px'` sets `.active` on the matching `.nav-item` and
   footer link.
3. **Sliding indicator:** on activation, position `.nav-indicator` to the active item's
   width/left (measured with `getBoundingClientRect` relative to the nav). Recompute on
   `resize`. Hidden on mobile.
4. Keep the first item active while scrolled above the About section.

Guard every `getElementById`/`querySelector` with a null check so the script never throws
if a section is renamed or removed.

---

## 10. Accessibility & performance

- `<img>` needs real `alt`; decorative avatars can be `alt=""`.
- Hamburger button: `aria-label` + `aria-expanded`.
- Maintain text contrast against the gradient (that's what `.overlay-gradient` is for).
- Respect reduced motion — **recommended optional addition:**
  `@media (prefers-reduced-motion: reduce)` may pin the canvas to frame 0 and disable the
  scroll redraw. Do not remove the animation for everyone.
- `frames/` is the main payload budget; keep it lean per §3/§7.
- Fonts: use `&display=swap` in the Google Fonts URL.

---

## 11. Deployment (Vercel, zero‑config)

1. Push the folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import into Vercel. Framework preset: **Other**. Build command: **none**. Output
   directory: the repo root (the folder containing `index.html`).
3. Deploy. Because everything is static and paths are relative (`./frames/…`), it serves
   from Vercel's CDN with no config file. A `vercel.json` is **not** required.

Local preview: `python3 -m http.server 8000` from the project root, then open
`http://localhost:8000` (serve over HTTP, not `file://`, so `fetch`/canvas behave).

---

## 12. Content to replace (owner's placeholders)

Swap these for the site owner's real content; leave everything else intact:
- `<<NAME>>` (logo, hero title, footer), `<<ROLE / TAGLINE>>`, `<<ABOUT PARAGRAPHS>>`
- `<<STAT VALUE>>` × 4 and their labels
- Tech strip list, the three (or more) project cards (`projects/*` images, titles,
  descriptions, stack tags), the three services, the three value cards
- Social URLs (LinkedIn, GitHub), primary CTA link (e.g. WhatsApp/`mailto:`/Calendly)
- `<<YOUR_WEB3FORMS_ACCESS_KEY>>`
- The `frames/` sequence (owner's own subject)

Do not ship the reference site's personal data, images, or access key.

---

## 13. Acceptance checklist (Codex: verify each)

Structure & stack
- [ ] Exactly `index.html`, `style.css`, `script.js` drive the site; no framework/bundler imported.
- [ ] Site works when the folder is served statically (no build step required).
- [ ] Google Fonts Oswald + Inter loaded; `:root` tokens from §4 present and used.

Animation
- [ ] `frames/` contains contiguous `frame_000000.webp …` with no gaps.
- [ ] `frameCount` in `script.js` **equals** the file count in `frames/`.
- [ ] Scrolling top→bottom advances the canvas through the full sequence; scroll up reverses.
- [ ] Canvas is a fixed, full‑viewport background (`z-index:-2`) under the gradient (`z-index:-1`); content is above (`z-index:1`).
- [ ] Redraws are gated on frame‑index change and wrapped in `requestAnimationFrame`.
- [ ] No console errors at the top or bottom of the page (index never runs out of range).

Layout & responsive
- [ ] All nine content sections present in the §5 order with correct `id`s.
- [ ] Projects grid is 2‑col staggered on desktop, 1‑col on ≤768px.
- [ ] ≤1024 / ≤768 / ≤600 breakpoints behave per §5; no horizontal scroll at 320px.
- [ ] Mobile hamburger opens/closes the dropdown; nav indicator hidden on mobile.

Nav & form
- [ ] Scrolling updates the active nav item via IntersectionObserver; indicator slides on desktop.
- [ ] Contact form validates email, POSTs to Web3Forms, shows success/error, resets on success.
- [ ] A real `access_key` placeholder is present (not the reference site's key).

Accessibility & deploy
- [ ] Images have `alt`; hamburger has `aria-label` + `aria-expanded`.
- [ ] Deploys to Vercel as a static "Other" project with no build command and relative asset paths.

---

### Reference implementation of the animation loop (canonical)
If any ambiguity arises, the §6 code block is the source of truth for the scroll→frame
mapping. Reproduce its behavior exactly; treat everything marked "optional" as additive
hardening that must not alter that mapping.