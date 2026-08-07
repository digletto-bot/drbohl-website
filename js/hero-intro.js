/**
 * DR.BOHL — HERO INTRO (PROTOTYPE)
 * ---------------------------------------------------------------
 * Cinematic asymmetric horizontal slice reveal for the DR.BOHL hero
 * title only (title card index 0), on first load only.
 *
 * No dependencies. Native Web Animations API + clip-path + transform.
 * GSAP was deliberately NOT used: this is three elements moving on
 * transform with staggered timing — WAAPI does it at zero payload
 * cost, on the compositor, with no library to ship.
 *
 * HOW IT WORKS
 * The original <span> is cloned three times into an absolutely
 * stacked overlay inside the existing .title-card__headline-wrap.
 * Each clone is clipped to one asymmetric horizontal band via
 * clip-path: inset(). Because fitText() writes an inline font-size
 * onto the source span, the clones inherit exact sizing for free —
 * so the assembled result is pixel-identical to the untouched title.
 *
 * Bands (deliberately NOT equal thirds):
 *   TOP     0–28%
 *   MIDDLE  28–64%
 *   BOTTOM  64–100%
 *
 * Order/direction: bottom (from left) → top (from right) → middle
 * (from left, shortest + quickest, "locks it together"), overlapping
 * rather than sequential. Then a single subtle scale impact on the
 * whole wrap. Total ≈ 640ms.
 *
 * CLEANUP: on completion the clones are removed and the original
 * span is restored to its normal state, so nothing temporary is left
 * in the DOM or on the compositor.
 *
 * Honors prefers-reduced-motion: no clones are created at all, the
 * title simply appears.
 */

'use strict';

/* power4.out ≈ cubic-bezier(0.23, 1, 0.32, 1) — the decisive,
   fast-out/slow-settle curve that gives this its trailer feel.
   power3.out ≈ cubic-bezier(0.215, 0.61, 0.355, 1) for the middle
   slice, which should land a touch tighter. */
const EASE_POWER4 = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_POWER3 = 'cubic-bezier(0.215, 0.61, 0.355, 1)';

const BANDS = [
	// name,  clip inset (top, bottom),  from X (em),  delay,  duration, easing
	{ key: 'bottom', top: 64, bottom: 0, fromEm: -0.55, delay: 0, duration: 470, ease: EASE_POWER4 },
	{ key: 'top', top: 0, bottom: 72, fromEm: 0.42, delay: 105, duration: 450, ease: EASE_POWER4 },
	{ key: 'middle', top: 28, bottom: 36, fromEm: -0.26, delay: 215, duration: 360, ease: EASE_POWER3 },
];

const IMPACT_DELAY = 470; // when all three have essentially landed
const IMPACT_DURATION = 150;

let running = false;

/**
 * Run the slice-reveal intro on the DR.BOHL hero title.
 * @param {boolean} force - replay even if it already ran (dev button).
 */
export function playHeroIntro(force = false) {
	const card = document.querySelector('.title-card[data-index="0"]');
	if (!card) return;
	const wrap = card.querySelector('.title-card__headline-wrap');
	const source = card.querySelector('.title-card__headline-line');
	if (!wrap || !source) return;

	// Never overlap two runs (dev replay button spam).
	if (running && !force) return;

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// Reduced motion (or no WAAPI): show the title, do nothing else.
	if (reduceMotion || typeof source.animate !== 'function') {
		// Title simply appears at its final state; no clones, no motion.
		card.classList.remove('hero-intro-running');
		card.classList.add('hero-intro-done');
		return;
	}

	cleanup(wrap, source, card);
	running = true;

	/* Suppress the stock `.is-current .title-card__headline-line`
	   fadeUp for the duration of this run, via a class on the card
	   rather than an inline style — see cleanup() for why inline
	   overrides would break the card's later entrances. The class is
	   removed at the end, but by then the card is already settled and
	   .is-current hasn't re-fired, so fadeUp does not replay. */
	card.classList.add('hero-intro-running');

	// Stack the clones exactly over where the real span sits. The wrap
	// keeps its own box (the source span still occupies normal flow, just
	// invisible), so nothing reflows and there is no layout shift.
	const stage = document.createElement('div');
	stage.className = 'hero-intro-stage';
	stage.setAttribute('aria-hidden', 'true');

	const anims = [];

	BANDS.forEach((band) => {
		const clone = source.cloneNode(true);
		clone.removeAttribute('data-fit');
		clone.classList.add('hero-intro-slice');
		// Inline font-size came along with the clone (set by fitText), so
		// metrics match the original exactly.
		clone.style.opacity = '1';
		clone.style.animation = 'none';
		clone.style.clipPath = `inset(${band.top}% 0 ${band.bottom}% 0)`;
		stage.appendChild(clone);

		const a = clone.animate(
			[
				{ transform: `translate3d(${band.fromEm}em, 0, 0)`, opacity: 0 },
				{ opacity: 1, offset: 0.18 },
				{ transform: 'translate3d(0, 0, 0)', opacity: 1 },
			],
			{
				duration: band.duration,
				delay: band.delay,
				easing: band.ease,
				fill: 'both',
			}
		);
		anims.push(a);
	});

	wrap.appendChild(stage);

	// Subtle impact once the pieces meet — scale only, no bounce.
	const impact = wrap.animate(
		[
			{ transform: 'scale(1.02)' },
			{ transform: 'scale(1)' },
		],
		{
			duration: IMPACT_DURATION,
			delay: IMPACT_DELAY,
			easing: EASE_POWER3,
			fill: 'both',
		}
	);
	anims.push(impact);

	// Restore the real title and strip everything temporary.
	Promise.allSettled(anims.map((a) => a.finished)).then(() => {
		cleanup(wrap, source, card);
		running = false;
	});
}

/**
 * Remove every temporary artefact and hand styling control back to the
 * stylesheet.
 *
 * Important: the inline `animation`/`opacity` overrides MUST be cleared
 * (not left as 'none'/'1'). They exist only to stop the stock
 * `.is-current .title-card__headline-line { animation: fadeUp }` rule
 * from fighting the intro during the run. If they were left behind, the
 * hero card would permanently lose its normal fadeUp entrance every
 * later time you navigate back to it — a change to existing behaviour.
 * Setting them to '' removes the inline declaration entirely, so the
 * stylesheet rule applies again as normal.
 */
function cleanup(wrap, source, card) {
	wrap.querySelectorAll('.hero-intro-stage').forEach((n) => n.remove());
	wrap.getAnimations?.().forEach((a) => a.cancel());
	wrap.style.transform = '';
	source.style.opacity = '';
	source.style.animation = '';
	card?.classList.remove('hero-intro-running');
	card?.classList.add('hero-intro-done');
}

/* ─────────────────────────────────────────────────────────────
   DEV-ONLY replay button.
   Remove this function + its call in main.js to strip the prototype
   UI. Nothing else depends on it.
   ───────────────────────────────────────────────────────────── */
export function mountHeroIntroDevButton() {
	if (document.getElementById('hero-intro-replay')) return;
	const btn = document.createElement('button');
	btn.id = 'hero-intro-replay';
	btn.type = 'button';
	btn.textContent = '⟳ Replay Intro';
	btn.addEventListener('click', () => playHeroIntro(true));
	document.body.appendChild(btn);
}

/* Clear the settled-state marker as soon as the hero card stops being
   the current slide, so navigating away and back gives the card its
   normal fadeUp entrance again — i.e. existing behaviour is fully
   restored and the intro is genuinely first-load-only.

   Done here with a MutationObserver rather than by editing slider.js:
   the slider class is shared by both the title and subpage sliders and
   drives all navigation, so leaving it untouched keeps this prototype
   completely self-contained and trivially revertible. */
function watchHeroCard() {
	const card = document.querySelector('.title-card[data-index="0"]');
	if (!card || typeof MutationObserver !== 'function') return;
	new MutationObserver(() => {
		if (!card.classList.contains('is-current')) {
			card.classList.remove('hero-intro-done', 'hero-intro-running');
		}
	}).observe(card, { attributes: true, attributeFilter: ['class'] });
}

// Module eval happens before DOMContentLoaded, so defer until the card
// actually exists.
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', watchHeroCard, { once: true });
} else {
	watchHeroCard();
}
