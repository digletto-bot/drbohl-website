/**
 * DR.BOHL — SHUTTER INTRO (PROTOTYPE)
 * ═══════════════════════════════════════════════════════════════
 * Full-viewport cinematic shutter reveal. The real page renders
 * underneath, untouched; a temporary overlay of black horizontal
 * shutters retracts in a choreographed sequence, exposing slices of
 * the WHOLE landing composition at once — background, performer,
 * DR.BOHL title, progress nav, burger, CTA — not just the title.
 *
 * No dependencies. clip-path is avoided in favour of transform:
 * scaleX() on absolutely-positioned bands, driven by WAAPI, so every
 * animated property is compositor-only (no layout, no paint).
 *
 * ── HOW THE BANDS WORK ───────────────────────────────────────────
 * The overlay is a stack of black bands that together cover 100% of
 * the viewport. Each band has a `top`/`height` (in vh %) and its own
 * retract direction, controlled by transform-origin:
 *     left   → scaleX(1→0) from origin left  = opens L→R
 *     right  → opens R→L
 *     center → opens outward from the middle
 * A band retracting IS the reveal — the page beneath is already there.
 *
 * ── RESPONSIVE ───────────────────────────────────────────────────
 * Band distributions are defined per existing project breakpoint
 * (documented in BREAKPOINTS below) rather than reusing desktop
 * percentages everywhere, because the hero composition genuinely
 * changes: at ≥600px the image switches to centre-cover and side
 * arrows appear; at ≥800px the progress nav becomes centre-justified.
 * All band geometry is in vh/% — no brittle pixel values — so it
 * scales continuously between breakpoints with no discontinuity.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CONFIG — all mask sizes and timing live here.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Existing project breakpoints relevant to the first viewport.
 * (Inspected from css/variables.css, css/layout.css, css/components.css —
 * NOT invented, and NOT modified.)
 *   400 — progress-nav padding shift
 *   600 — --side-pad 20→24px; hero image → centre-cover; desktop side
 *         arrows appear; progress-nav gap 5→8px
 *   800 — progress-nav becomes centre-justified (largest visual shift)
 */
const BREAKPOINTS = [0, 400, 600, 800];

/**
 * Band layouts per breakpoint. `top`/`height` are viewport-height %.
 * Deliberately irregular: no equal thirds, no symmetry. Each set is
 * tuned to where that breakpoint's composition actually puts things.
 *
 * order = reveal group:
 *   0 → Reveal #1, the narrow lower slit
 *   1 → Reveal #2, larger upper region
 *   2 → Reveal #3, central region
 *   3 → the leftover black bands that hold ~100ms then snap away
 */
const LAYOUTS = {
	// ── <400px: compact phones. Title sits lower relative to viewport,
	//    progress nav is tight to the top edge.
	0: [
		{ top: 0, height: 9, dir: 'right', order: 3 },
		{ top: 9, height: 22, dir: 'right', order: 1 }, // progress nav + top of title
		{ top: 31, height: 6, dir: 'left', order: 3 },
		{ top: 37, height: 19, dir: 'center', order: 2 }, // title body / performer head
		{ top: 56, height: 12, dir: 'left', order: 3 },
		{ top: 68, height: 11, dir: 'left', order: 0 }, // lower slit — performer mass
		{ top: 79, height: 8, dir: 'right', order: 3 },
		{ top: 87, height: 13, dir: 'left', order: 3 }, // CTA + swipe hint
	],

	// ── 400–599px: standard phones.
	400: [
		{ top: 0, height: 8, dir: 'right', order: 3 },
		{ top: 8, height: 24, dir: 'right', order: 1 },
		{ top: 32, height: 5, dir: 'left', order: 3 },
		{ top: 37, height: 21, dir: 'center', order: 2 },
		{ top: 58, height: 11, dir: 'right', order: 3 },
		{ top: 69, height: 10, dir: 'left', order: 0 },
		{ top: 79, height: 9, dir: 'left', order: 3 },
		{ top: 88, height: 12, dir: 'right', order: 3 },
	],

	// ── 600–799px: tablets / small desktop. Image becomes centre-cover,
	//    side arrows appear at the vertical middle — the central band is
	//    widened so it exposes both arrows with the title.
	600: [
		{ top: 0, height: 7, dir: 'right', order: 3 },
		{ top: 7, height: 26, dir: 'right', order: 1 },
		{ top: 33, height: 4, dir: 'left', order: 3 },
		{ top: 37, height: 24, dir: 'center', order: 2 }, // title + both side arrows
		{ top: 61, height: 9, dir: 'right', order: 3 },
		{ top: 70, height: 9, dir: 'left', order: 0 },
		{ top: 79, height: 10, dir: 'left', order: 3 },
		{ top: 89, height: 11, dir: 'right', order: 3 },
	],

	// ── ≥800px: progress nav centre-justified, wide cinematic crop.
	//    Bands get flatter/wider for a more letterboxed, trailer feel.
	800: [
		{ top: 0, height: 6, dir: 'right', order: 3 },
		{ top: 6, height: 28, dir: 'right', order: 1 }, // centred progress nav + title top
		{ top: 34, height: 4, dir: 'left', order: 3 },
		{ top: 38, height: 26, dir: 'center', order: 2 },
		{ top: 64, height: 6, dir: 'right', order: 3 },
		{ top: 70, height: 12, dir: 'left', order: 0 }, // wide lower slit
		{ top: 82, height: 7, dir: 'right', order: 3 },
		{ top: 89, height: 11, dir: 'left', order: 3 },
	],
};

/** Timing, in ms. Total ≈ 890ms. */
const TIMING = {
	order0Delay: 0, // Reveal #1 — lower slit
	order0Duration: 175,
	order1Delay: 110, // Reveal #2 — upper region, ~100ms later
	order1Duration: 230,
	order2Delay: 295, // Reveal #3 — central region
	order2Duration: 235,
	holdBeforeFinal: 105, // leftover black bands linger
	order3Duration: 240, // final retract of everything remaining
	order3Stagger: 16, // slight cascade so it doesn't snap as one slab
};

/* power4.out — decisive, fast-out then settle. The cinematic feel is
   in this curve; a linear or eased-in-out shutter reads as generic UI. */
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

/* ═══════════════════════════════════════════════════════════════
   IMPLEMENTATION
   ═══════════════════════════════════════════════════════════════ */

let running = false;

function currentLayout() {
	const w = window.innerWidth;
	let chosen = 0;
	for (const bp of BREAKPOINTS) if (w >= bp) chosen = bp;
	return LAYOUTS[chosen];
}

function originFor(dir) {
	return dir === 'right' ? 'right center' : dir === 'center' ? 'center center' : 'left center';
}

/**
 * Play the shutter reveal.
 * @param {boolean} force - replay even if one is in flight (dev button).
 */
export function playShutterIntro(force = false) {
	if (running && !force) return;

	teardown();

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	// Reduced motion, or no WAAPI: never build the overlay at all — the
	// page is already fully rendered underneath, so there is nothing to
	// reveal and no motion occurs.
	if (reduceMotion || typeof document.body.animate !== 'function') return;

	running = true;

	const overlay = document.createElement('div');
	overlay.className = 'shutter-intro';
	overlay.setAttribute('aria-hidden', 'true');

	const layout = currentLayout();
	const anims = [];
	let order3Index = 0;

	layout.forEach((band) => {
		const el = document.createElement('div');
		el.className = 'shutter-intro__band';
		el.style.top = band.top + 'vh';
		el.style.height = band.height + 'vh';
		el.style.transformOrigin = originFor(band.dir);
		overlay.appendChild(el);

		let delay;
		let duration;
		if (band.order === 0) {
			delay = TIMING.order0Delay;
			duration = TIMING.order0Duration;
		} else if (band.order === 1) {
			delay = TIMING.order1Delay;
			duration = TIMING.order1Duration;
		} else if (band.order === 2) {
			delay = TIMING.order2Delay;
			duration = TIMING.order2Duration;
		} else {
			// Leftover bands: wait for the central reveal to finish, hold,
			// then cascade away.
			delay =
				TIMING.order2Delay +
				TIMING.order2Duration +
				TIMING.holdBeforeFinal +
				order3Index * TIMING.order3Stagger;
			duration = TIMING.order3Duration;
			order3Index++;
		}

		anims.push(
			el.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
				duration,
				delay,
				easing: EASE,
				fill: 'both',
			})
		);
	});

	document.body.appendChild(overlay);

	// Remove the overlay entirely once done — no lingering DOM, no
	// compositor layers, zero ongoing runtime cost.
	Promise.allSettled(anims.map((a) => a.finished)).then(() => {
		teardown();
		running = false;
	});
}

function teardown() {
	document.querySelectorAll('.shutter-intro').forEach((n) => {
		n.getAnimations?.().forEach((a) => a.cancel());
		n.remove();
	});
}

/* ─────────────────────────────────────────────────────────────
   DEV-ONLY replay control.
   Remove this function + its call in main.js to strip the prototype UI.
   ───────────────────────────────────────────────────────────── */
export function mountShutterDevButton() {
	if (document.getElementById('shutter-intro-replay')) return;
	const btn = document.createElement('button');
	btn.id = 'shutter-intro-replay';
	btn.type = 'button';
	btn.textContent = '⟳ Replay Shutter';
	btn.addEventListener('click', () => playShutterIntro(true));
	document.body.appendChild(btn);
}
