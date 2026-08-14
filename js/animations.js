/**
 * DR.BOHL — ANIMATIONS.JS
 * fitText: scales every headline line to fill full available width on ONE line.
 */

'use strict';

const SIDE_PAD = 24;

/**
 * fitText — every .title-card__headline-line gets scaled to exactly fill
 * (card width − 2×padding) on a single line, regardless of data attributes.
 * All lines use data-fit="true" behaviour — max size, no wrapping.
 */
export function fitText() {
	const track = document.getElementById('slider-track');
	const availW = (track ? track.offsetWidth : window.innerWidth) - SIDE_PAD * 2;

	const screenW = window.innerWidth;
	const seed =
		screenW < 600 ? 120
		: screenW <= 1000 ? 140
		: 160;

	document.querySelectorAll('.title-card__headline-line').forEach((el) => {
		// Seed at large size, measure, then scale to fit exactly
		el.style.fontSize = seed + 'px';
		const ratio = availW / el.scrollWidth;
		// Apply, but never exceed the seed
		el.style.fontSize = Math.min(Math.floor(seed * ratio), seed) + 'px';
	});
}

export function updateProgressNav(index) {
	document.querySelectorAll('.progress-nav').forEach((nav) => {
		nav.querySelectorAll('.progress-nav__item').forEach((item, i) => {
			item.classList.toggle('is-active', i === index);
			item.setAttribute('aria-current', i === index ? 'true' : 'false');
		});
	});
}

/**
 * updateImageEdgeFade — toggles .has-edge-fade on each .title-card__image,
 * which CSS uses to mask its own left/right edges into the background.
 * Only ever true on desktop, where width:auto can leave the image
 * narrower than its card. Must be re-run on resize and once each image
 * has loaded, since the rendered width depends on both the viewport and
 * the image's intrinsic ratio.
 */
export function updateImageEdgeFade() {
	document.querySelectorAll('.title-card__image').forEach((img) => {
		const inner = img.closest('.title-card__inner');
		if (!inner) return;
		const isNarrow = img.offsetWidth > 0 && img.offsetWidth < inner.offsetWidth - 1;
		img.classList.toggle('has-edge-fade', isNarrow);
	});
}

export function dismissSwipeHint() {
	const h = document.querySelector('.swipe-hint');
	if (h) {
		h.style.animation = 'none';
		h.style.opacity = '0';
		h.style.transition = 'opacity .3s ease';
	}
}
