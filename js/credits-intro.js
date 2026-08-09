/**
 * DR.BOHL — "IT'S SHOWTIME BABY!" CREDIT INTRO
 * ═══════════════════════════════════════════════════════════════
 * Action-movie title-card rush. Three words fly into centre screen
 * over solid black — alternating bottom / top / bottom — then the
 * camera pushes through the type: the word stack scales up hard
 * while both the text and the black backdrop fade to 0, revealing
 * the landing page underneath.
 *
 * The page is NEVER visible during the word rush. It sits fully
 * rendered beneath an opaque backdrop, so the reveal is the moment
 * the backdrop clears — not a crossfade over already-visible
 * content.
 *
 * ── PERFORMANCE ─────────────────────────────────────────────────
 * Only `transform` and `opacity` are animated — both compositor
 * properties, so no layout and no repaint on any frame. scale(N)
 * costs the same as scale(1): it is a matrix on an already
 * rasterised layer.
 *
 * Deliberately avoided:
 *   - animating background-color (triggers paint every frame)
 *   - text-as-mask / background-clip knockout (forces the masked
 *     layer to re-rasterise as it scales, which is exactly the
 *     expensive case, and goes blurry past ~4x)
 *   - filters, shadows, blur (paint-bound)
 *   - any library
 *
 * One getBoundingClientRect() is taken, once, before the push
 * begins — to compute the scale needed for this viewport. Never
 * per frame.
 *
 * Plays ONCE PER SESSION (sessionStorage). Returning visitors in
 * the same tab go straight to the page.
 *
 * Honours prefers-reduced-motion: overlay is never built.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const CONFIG = {
	words: ["IT'S", 'SHOWTIME', 'BABY!'],
	/** +1 = enters from below, -1 = enters from above. */
	directions: [1, -1, 1],
	/** Word rush */
	wordDuration: 340,
	wordStagger: 150,
	/** How far off-centre a word starts, as % of its own height. */
	wordTravel: 118,
	/** Words arrive oversized and shrink to 1 — this is what reads
	    as "rushing toward camera" rather than sliding up. */
	wordOvershoot: 1.5,
	/** Beat between the last word landing and the push-through. */
	holdAfterWords: 210,
	/** Camera push */
	pushDuration: 520,
	/** Multiplier applied to the computed scale, for extra travel
	    past the viewport edge. */
	pushScaleFactor: 2.2,
	pushScaleMin: 8,
	pushScaleMax: 26,
	/** Page starts slightly overscaled and settles as it appears. */
	pageFromScale: 1.12,
	sessionKey: 'drbohl:intro-played',
};

/* Fast-out, hard settle — the words snap into place. */
const EASE_WORD = 'cubic-bezier(0.16, 1, 0.3, 1)';
/* Ease-IN for the push: the camera accelerates into the zoom
   rather than drifting, which is what sells the punch-through. */
const EASE_PUSH = 'cubic-bezier(0.7, 0, 0.84, 0)';
/* Page settles out of its overscale. */
const EASE_PAGE = 'cubic-bezier(0.16, 1, 0.3, 1)';

/* ═══════════════════════════════════════════════════════════════
   IMPLEMENTATION
   ═══════════════════════════════════════════════════════════════ */

let running = false;

function teardown() {
	document.querySelectorAll('.intro-credits').forEach((n) => {
		n.getAnimations?.().forEach((a) => a.cancel());
		n.querySelectorAll('*').forEach((c) => c.getAnimations?.().forEach((a) => a.cancel()));
		n.remove();
	});
	document.documentElement.classList.remove('intro-active');
}

/**
 * @param {boolean} force - bypass the session gate (dev replay).
 */
export function playCreditsIntro(force = false) {
	if (running && !force) return;

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const alreadyPlayed = (() => {
		try {
			return sessionStorage.getItem(CONFIG.sessionKey) === '1';
		} catch {
			return false; // private mode / storage blocked — just play it
		}
	})();

	// Never build the overlay at all if we're not going to animate.
	// The page is already fully rendered, so there is nothing to do.
	if (!force && (reduceMotion || alreadyPlayed || typeof document.body.animate !== 'function')) {
		return;
	}

	try {
		sessionStorage.setItem(CONFIG.sessionKey, '1');
	} catch {
		/* storage unavailable — intro simply replays next load */
	}

	teardown();
	running = true;
	document.documentElement.classList.add('intro-active');

	const overlay = document.createElement('div');
	overlay.className = 'intro-credits';
	overlay.setAttribute('aria-hidden', 'true');

	const backdrop = document.createElement('div');
	backdrop.className = 'intro-credits__backdrop';

	const stack = document.createElement('div');
	stack.className = 'intro-credits__stack';

	const wordEls = CONFIG.words.map((text) => {
		const el = document.createElement('span');
		el.className = 'intro-credits__word';
		el.textContent = text;
		stack.appendChild(el);
		return el;
	});

	overlay.append(backdrop, stack);
	document.body.appendChild(overlay);

	const anims = [];

	// ── 1. Word rush ────────────────────────────────────────────
	wordEls.forEach((el, i) => {
		const dir = CONFIG.directions[i] ?? 1;
		anims.push(
			el.animate(
				[
					{
						transform: `translate3d(0, ${dir * CONFIG.wordTravel}%, 0) scale(${CONFIG.wordOvershoot})`,
						opacity: 0,
					},
					{
						transform: `translate3d(0, ${dir * 8}%, 0) scale(1.02)`,
						opacity: 1,
						offset: 0.62,
					},
					{ transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
				],
				{
					duration: CONFIG.wordDuration,
					delay: i * CONFIG.wordStagger,
					easing: EASE_WORD,
					fill: 'both',
				}
			)
		);
	});

	const wordsEnd = (wordEls.length - 1) * CONFIG.wordStagger + CONFIG.wordDuration;
	const pushStart = wordsEnd + CONFIG.holdAfterWords;

	// ── 2. Camera push ──────────────────────────────────────────
	// Scale is computed from the actual rendered stack against this
	// viewport, so the type clears the edge on a phone and on an
	// ultrawide alike. Read once, here — never during the animation.
	//
	// Both axes matter: on a tall phone the stack's HEIGHT is the
	// constraint, but on a wide desktop the longest word ("SHOWTIME")
	// is far wider than the stack is tall, so scaling for height alone
	// would let the type's left/right edges stay on screen through the
	// whole push. Take whichever axis needs more.
	const rect = stack.getBoundingClientRect();
	const byHeight = rect.height > 0 ? (window.innerHeight * CONFIG.pushScaleFactor) / rect.height : 0;
	const byWidth = rect.width > 0 ? (window.innerWidth * CONFIG.pushScaleFactor) / rect.width : 0;
	const needed = Math.max(byHeight, byWidth) || CONFIG.pushScaleMin;
	const pushScale = Math.min(CONFIG.pushScaleMax, Math.max(CONFIG.pushScaleMin, needed));

	anims.push(
		stack.animate(
			[
				{ transform: 'scale(1)', opacity: 1 },
				{ transform: 'scale(1.06)', opacity: 1, offset: 0.14 },
				{ transform: `scale(${pushScale})`, opacity: 0 },
			],
			{ duration: CONFIG.pushDuration, delay: pushStart, easing: EASE_PUSH, fill: 'both' }
		)
	);

	// Backdrop clears in step with the push — this is the moment the
	// landing page becomes visible for the first time.
	anims.push(
		backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: CONFIG.pushDuration,
			delay: pushStart,
			easing: 'linear',
			fill: 'both',
		})
	);

	// ── 3. Page settle ──────────────────────────────────────────
	// Applied to the app root so the whole composition eases out of
	// a slight overscale as it's revealed, reading as the camera
	// coming to rest rather than a cut.
	const app = document.getElementById('app');
	if (app) {
		anims.push(
			app.animate(
				[
					{ transform: `scale(${CONFIG.pageFromScale})` },
					{ transform: 'scale(1)' },
				],
				{ duration: CONFIG.pushDuration + 180, delay: pushStart, easing: EASE_PAGE, fill: 'both' }
			)
		);
	}

	Promise.allSettled(anims.map((a) => a.finished)).then(() => {
		// Clear the page-settle transform explicitly: leaving a
		// finished fill:'both' animation on #app would keep a
		// transform (and a compositor layer) on the whole app root
		// for the rest of the session, and would break `position:
		// fixed` descendants inside it.
		if (app) app.getAnimations().forEach((a) => a.cancel());
		teardown();
		running = false;
	});
}

/* ─────────────────────────────────────────────────────────────
   DEV-ONLY replay control.
   Remove this function + its call in main.js to strip the
   prototype UI.
   ───────────────────────────────────────────────────────────── */
export function mountCreditsDevButton() {
	if (document.getElementById('intro-credits-replay')) return;
	const btn = document.createElement('button');
	btn.id = 'intro-credits-replay';
	btn.type = 'button';
	btn.textContent = '⟳ Replay Intro';
	btn.addEventListener('click', () => playCreditsIntro(true));
	document.body.appendChild(btn);
}
