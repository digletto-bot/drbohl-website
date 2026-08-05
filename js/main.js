/**
 * DR.BOHL — MAIN.JS
 * App entry point. Wires Slider, Menu, fitText, Tour Dates, and UI helpers.
 */

'use strict';

import Slider from './slider.js';
import Router from './router.js';
import Menu from './menu.js';
import { renderTourDates } from './tourDates.js';
import { fitText, updateProgressNav, dismissSwipeHint } from './animations.js';

document.addEventListener('DOMContentLoaded', () => {
	/* ── fitText ── */
	document.fonts.ready.then(() => {
		fitText();
		hideLoadingScreen();
		setTimeout(fitText, 120);
	});
	window.addEventListener('resize', fitText);

	/* ── Sliders: outer (title cards) + inner (subpage cards), kept in sync ── */
	const arrowPrev = document.getElementById('arrow-prev');
	const arrowNext = document.getElementById('arrow-next');
	function updateDesktopArrows(index) {
		arrowPrev?.classList.toggle('is-disabled', index === 0);
		arrowNext?.classList.toggle('is-disabled', index === slider.totalSlides - 1);
	}

	const slider = new Slider({
		onSlideChange: (index, prev) => {
			updateProgressNav(index);
			menu.onSlideChange(index);
			if (window.router) router.onSlideChange(index);
			dismissSwipeHint();
			subpageSlider.goTo(index);
			updateDesktopArrows(index);
			resetSubpageState(prev);
		},
	});
	updateDesktopArrows(slider.index);

	const ticketBtn = document.querySelector('.subpage-ticket-btn');
	const subpageSlider = new Slider({
		trackId: 'subpage-slider-track',
		cardSelector: '.subpage-card',
		bindKeyboard: false,
		onSlideChange: (index) => {
			slider.goTo(index);
			ticketBtn?.classList.toggle('is-active', index === 0);
		},
	});
	ticketBtn?.classList.toggle('is-active', subpageSlider.currentIndex === 0);

	updateProgressNav(slider.index);

	/* ── Menu ── */
	const menu = new Menu(slider);
	menu.onSlideChange(slider.index);

	/* ── Router ── */
	const router = new Router(slider);
	window.router = router;

	/* ── Progress nav clicks (title-card navbar + subpage-overlay navbar) ── */
	document.querySelectorAll('.progress-nav').forEach((nav) => {
		nav.querySelectorAll('.progress-nav__item').forEach((item, i) => {
			item.addEventListener('click', () => slider.goTo(i));
		});
	});

	/* ── Desktop arrows ── */
	document.getElementById('arrow-prev')?.addEventListener('click', () => slider.prev());
	document.getElementById('arrow-next')?.addEventListener('click', () => slider.next());

	/* ── Tour Dates (subpage card 0) ── */
	renderTourDates(document.getElementById('tour-list'));

	/* ── Contact form (subpage card 8) ── */
	document.getElementById('contact-form')?.addEventListener('submit', (e) => {
		e.preventDefault();
		closeSubpage();
	});

	/* ── About view (nested inside subpage card 8) ── */
	buildAboutContent();
	initAboutScroll();
	initAboutWordReveal();

	window.goToTickets = () => subpageSlider.goTo(0);
	window.subpagePrev = () => {
		const n = subpageSlider.totalSlides;
		subpageSlider.goTo((subpageSlider.currentIndex - 1 + n) % n);
	};
	window.subpageNext = () => {
		const n = subpageSlider.totalSlides;
		subpageSlider.goTo((subpageSlider.currentIndex + 1) % n);
	};

	function setViewToggle(activeView) {
		document.querySelectorAll('.view-switch__item').forEach((btn) => {
			const isActive = btn.dataset.view === activeView;
			btn.classList.toggle('is-active', isActive);
			btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
		});
	}

	window.showContactView = () => {
		document.getElementById('contact-view')?.classList.add('is-active');
		document.getElementById('about-view')?.classList.remove('is-active');
		setViewToggle('contact');
	};
	window.showAboutView = () => {
		document.getElementById('about-view')?.classList.add('is-active');
		document.getElementById('contact-view')?.classList.remove('is-active');
		setViewToggle('about');
		const card = document.getElementById('subpage-card-contact');
		if (card) card.scrollTop = 0;
		// Was measured while display:none (zero geometry); re-measure now it's visible.
		requestAnimationFrame(updateAboutFade);
	};
	window.openContactForm = () => {
		showContactView();
		openSubpage();
	};
	window.openAboutPage = () => {
		showAboutView();
		openSubpage();
	};

	// Handle clicks on contact page cutout button
	// -> Prevent opening the overlay, if the user meant to drag between slides
	const heroCutoutBtn = document.querySelector('.hero-cutout-button');
	let hcBtnStartX, hcBtnStartY;
	heroCutoutBtn.addEventListener('pointerdown', (e) => {
		hcBtnStartX = e.clientX;
		hcBtnStartY = e.clientY;
	});
	heroCutoutBtn.addEventListener('click', (e) => {
		if (Math.hypot(e.clientX - hcBtnStartX, e.clientY - hcBtnStartY) > 6) return;
		openAboutPage();
	});

	/* ── ESC closes everything ── */
	document.addEventListener('keydown', (e) => {
		if (e.key !== 'Escape') return;
		menu.close();
		closeSubpage();
	});
});

/* ── Loading screen: fades out once fonts are ready and fitText has run ── */
function hideLoadingScreen() {
	document.getElementById('loading-screen')?.classList.add('is-hidden');
}

/* ── Subpage overlay (single unified container; called from inline onclick) ──
   Opening pushes a synthetic history entry so the mobile/browser back button
   closes the overlay instead of navigating away; popstate below reacts to
   that entry going away (whether via back button or our own history.back()
   call in closeSubpage) by closing it. */
window.openSubpage = function () {
	const sp = document.getElementById('subpage-overlay');
	if (sp.classList.contains('is-open')) return;
	sp.classList.add('is-open');
	sp.setAttribute('aria-hidden', 'false');
	document.querySelector('.subpage-card.is-current')?.scrollTo(0, 0);
	history.pushState({ subpage: true }, '', window.location.href);
};

function hideSubpageOverlay(sp) {
	document.activeElement.blur();
	sp.classList.remove('is-open');
	sp.setAttribute('aria-hidden', 'true');
	resetSubpageState(document.querySelector('.subpage-card.is-current')?.dataset.index);
}

window.closeSubpage = function () {
	const sp = document.getElementById('subpage-overlay');
	if (!sp.classList.contains('is-open')) return;
	hideSubpageOverlay(sp);
	if (history.state?.subpage) history.back();
};

window.addEventListener('popstate', (e) => {
	const sp = document.getElementById('subpage-overlay');
	if (e.state?.subpage) {
		sp.classList.add('is-open');
		sp.setAttribute('aria-hidden', 'false');
	} else if (sp.classList.contains('is-open')) {
		hideSubpageOverlay(sp);
	}
});

/* ── About page copy ── */
const ABOUT_LEAD = 'Vom gelben Pfannenwender zum Whackofatz';
const ABOUT_PARAGRAPHS = [
	`Die Karriere von Dr.Bohl begann fernab großer Bühnen. Für ein Geburtstagsvideo erfand Paulus Bohl verschiedene Wiener Charaktere, während sein Bruder Benjamin die Interviews führte – mit einem gelben Pfannenwender als improvisiertem Mikrofon. Aus dem privaten Scherz entwickelte sich ein unverwechselbares Comedy-Format. Spätestens mit dem viralen Video „Studenten in den Sommerferien“ erreichten die Brüder ein größeres Publikum auf Facebook, Instagram, YouTube und später TikTok.`,
	`Im Jänner 2020 wagten Paulus und Benjamin den Schritt auf die Bühne. Vor Familie, Freunden und Wegbegleitern spielten sie ihr erstes Programm „Dr.Bohl – Live!“ im Keller ihrer ehemaligen Schule. Aus dem Experiment wurden ausverkaufte Vorstellungen. Noch im selben Jahr starteten sie den Podcast „Bohlmobil“, in dem ihre persönliche Dynamik und ihr spontaner Humor stärker in den Mittelpunkt rückten.`,
	`Mit „ANABOHLIKA“, das 2023 im Wiener Stadtsaal Premiere feierte, gelang der Sprung auf größere Kabarettbühnen. Die bekannten Figuren wurden weiterentwickelt, die Inszenierung aufwendiger und Dr.Bohl zunehmend zu einer eigenständigen Unterhaltungsmarke. Auftritte bei Ö3, ORF, FM4 und PULS 4 erweiterten die Reichweite über Social Media hinaus.`,
	`2025 präsentierte Paulus mit „SOLO“ sein drittes Kabarettprogramm und erstmals einen Abend ohne Benjamin als Bühnenpartner. Seine Teilnahme bei „Dancing Stars“, wo er den zweiten Platz erreichte, machte ihn schließlich einem breiten österreichischen Fernsehpublikum bekannt.`,
	`Mit Bohl Entertainment folgte der nächste konsequente Schritt: Aus Kurzvideos, Podcast und Kabarett entstand ein Unternehmen für Medien, Social Content, Markenkooperationen und eigene Entertainment-Formate. Dr.Bohl steht heute für den erfolgreichen Übergang von digitaler Kreativität zu professioneller Medienproduktion.`,
];

function buildAboutContent() {
	const body = document.getElementById('about-body');
	if (!body || body.dataset.filled) return;
	const maxSpreadMs = 620;

	function splitWords(text) {
		const words = text.split(/\s+/).filter(Boolean);
		const step = Math.min(30, maxSpreadMs / words.length);
		return words
			.map(
				(w, j) =>
					`<span class="word" style="transition-delay:${Math.round(j * step)}ms">${w}</span>`
			)
			.join(' ');
	}

	let html = `<p class="about-overlay__lead">${splitWords(ABOUT_LEAD)}</p>`;
	ABOUT_PARAGRAPHS.forEach((para) => {
		html += `<p>${splitWords(para)}</p>`;
	});
	body.innerHTML = html;
	body.dataset.filled = 'true';
}

/* ── About view: stagger-reveal each paragraph's words as it scrolls into view ── */
function initAboutWordReveal() {
	const body = document.getElementById('about-body');
	const scrollEl = document.getElementById('subpage-card-contact');
	if (!body || !scrollEl || !('IntersectionObserver' in window)) return;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				entry.target.querySelectorAll('.word').forEach((w) => w.classList.add('is-in'));
				observer.unobserve(entry.target);
			});
		},
		{ root: scrollEl, rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
	);

	body.querySelectorAll('p').forEach((p) => observer.observe(p));
}

/* ── About view scroll: each rendered LINE contracts/fades toward BOTH
   the sticky header at top AND the fixed bottom bar, as a single unit,
   gradually. Fade (opacity) and scale are two INDEPENDENT effects with
   their own zone sizes — scale starts much earlier/subtler
   (maxScaleZone), fade only kicks in right at the edge (maxFadeZone) —
   so a line visibly shrinks for a while before it also starts vanishing.
   Scale additionally eases in exponentially (slow at first, ramping up
   fast right at the edge) rather than linearly.
   Crucially, the breakpoint where a line STARTS any effect is clamped to
   that line's own resting distance from whichever edge, captured at the
   moment the view opens (scrollTop is always 0 then — see
   showAboutView()) — so nothing can ever appear mid-fade/scale before
   the user has actually scrolled. A line already sitting inside what
   would be a zone at rest gets that zone shrunk to its actual resting
   gap instead of borrowing distance that doesn't exist yet; a line not
   yet visible (below the bottom bar) keeps the full zone so it animates
   in properly once scrolled to.
   Each paragraph's .word spans get wrapped into one block-level
   .about-line span per detected line — that's what makes a line scale
   together instead of every word shrinking around its own center.
   Perf notes (this runs on every scroll frame on mobile, so it stays cheap):
   - Line-wrapping (and each line's zones) requires a full reflow pass,
     so it only happens when the view opens or the viewport resizes,
     never mid-scroll.
   - Each scroll frame reads one getBoundingClientRect() per LINE (not per
     word) — line count is much smaller than word count.
   - A line that's fully clear of both edges' zones "settles" and is
     skipped (no style write) on subsequent frames until that changes, so
     only lines actually inside a zone get touched.
   - will-change is toggled only on lines currently inside a zone, instead
     of living permanently on every line/word, avoiding stray compositor
     layers on mobile GPUs.
   - Word-level opacity (the fade-in reveal) and line-level opacity (this
     scroll effect) live on different elements and simply multiply
     together visually, so a not-yet-revealed word can never be forced
     visible by the line's scroll state. ── */
let updateAboutFade = () => {};

function initAboutScroll() {
	const scrollEl = document.getElementById('subpage-card-contact');
	const header = document.querySelector('.about-overlay__header');
	const bottomBar = document.querySelector('.subpage-bottombar');
	const body = document.getElementById('about-body');
	if (!scrollEl || !header || !body) return;

	const maxFadeZoneTop = 40; // upper bound on how early a line may start fading (top)
	const maxScaleZoneTop = 150; // upper bound on how early a line may start scaling (top)
	const maxFadeZoneBottom = 140; // same, but as a line enters from the bottom
	const maxScaleZoneBottom = 220; // same, but as a line enters from the bottom
	let ticking = false;
	// flat list of { el, fadeZoneTop, scaleZoneTop, fadeZoneBottom,
	// scaleZoneBottom, maxZoneTop, maxZoneBottom, settled }
	let lines = [];

	// Exponential ease-in: barely moves for most of the approach, then
	// ramps up sharply right at the edge. t: 1 = at rest, 0 = fully at edge.
	function easeScale(t) {
		const p = 1 - t;
		const eased =
			p <= 0 ? 0
			: p >= 1 ? 1
			: Math.pow(2, 10 * (p - 1));
		return 1 - eased;
	}

	function applyLine(el, tFade, tScale) {
		el.style.opacity = tFade;
		el.style.transform = `scale(${(0.85 + tScale * 0.15).toFixed(3)})`;
	}

	// A zone shrinks to the line's actual resting distance from an edge if
	// that distance is smaller than the max (preventing pre-trigger at
	// rest); otherwise it keeps the full max — including when the line
	// isn't visible yet at rest (negative/undefined distance), so it still
	// animates in properly once scrolled into range.
	function clampZone(maxZone, restingGap) {
		return restingGap >= 0 && restingGap < maxZone ? restingGap : maxZone;
	}

	// Wrap each paragraph's words into one block span per rendered line, so
	// a line contracts as a single cohesive unit rather than each word
	// scaling around its own center. Re-run only on view-open/resize —
	// both of those always happen at scrollTop 0, which is what lets us
	// safely capture each line's resting gap from each edge below.
	function rebuildLines() {
		lines = [];
		const headerBottom = header.getBoundingClientRect().bottom;
		const bottomEdge =
			bottomBar ?
				bottomBar.getBoundingClientRect().top
			:	scrollEl.getBoundingClientRect().bottom;

		body.querySelectorAll('p').forEach((p) => {
			const words = Array.from(p.querySelectorAll('.word'));
			if (!words.length) return;

			// Flatten first (undoes any previous line-wrapping) so natural
			// reflow can be re-measured accurately.
			const flat = document.createDocumentFragment();
			words.forEach((w, i) => {
				flat.appendChild(w);
				if (i < words.length - 1) flat.appendChild(document.createTextNode(' '));
			});
			p.replaceChildren(flat);

			// Detect line breaks from the now-flat natural flow, tracking each
			// line's top and bottom edge as we go.
			const groups = [];
			let lastTop = null;
			words.forEach((w) => {
				const rect = w.getBoundingClientRect();
				if (lastTop === null || Math.abs(rect.top - lastTop) > 2) {
					groups.push({ words: [], top: Infinity, bottom: 0 });
					lastTop = rect.top;
				}
				const group = groups[groups.length - 1];
				group.words.push(w);
				group.top = Math.min(group.top, rect.top);
				group.bottom = Math.max(group.bottom, rect.bottom);
			});

			// Rebuild as one block wrapper per detected line.
			const wrapped = document.createDocumentFragment();
			groups.forEach((group) => {
				const lineEl = document.createElement('span');
				lineEl.className = 'about-line';
				group.words.forEach((w, i) => {
					lineEl.appendChild(w);
					if (i < group.words.length - 1)
						lineEl.appendChild(document.createTextNode(' '));
				});
				wrapped.appendChild(lineEl);

				const restingGapTop = group.bottom - headerBottom;
				const restingGapBottom = bottomEdge - group.top;
				const fadeZoneTop = clampZone(maxFadeZoneTop, restingGapTop);
				const scaleZoneTop = clampZone(maxScaleZoneTop, restingGapTop);
				const fadeZoneBottom = clampZone(maxFadeZoneBottom, restingGapBottom);
				const scaleZoneBottom = clampZone(maxScaleZoneBottom, restingGapBottom);
				lines.push({
					el: lineEl,
					fadeZoneTop,
					scaleZoneTop,
					fadeZoneBottom,
					scaleZoneBottom,
					maxZoneTop: Math.max(fadeZoneTop, scaleZoneTop),
					maxZoneBottom: Math.max(fadeZoneBottom, scaleZoneBottom),
					settled: undefined,
				});
			});
			p.replaceChildren(wrapped);
		});
	}

	function update() {
		const headerBottom = header.getBoundingClientRect().bottom;
		const bottomEdge =
			bottomBar ?
				bottomBar.getBoundingClientRect().top
			:	scrollEl.getBoundingClientRect().bottom;

		lines.forEach((line) => {
			const rect = line.el.getBoundingClientRect();
			const topGap = rect.bottom - headerBottom;
			const bottomGap = bottomEdge - rect.top;

			const atRestTop = line.maxZoneTop <= 0 || topGap >= line.maxZoneTop;
			const atRestBottom = line.maxZoneBottom <= 0 || bottomGap >= line.maxZoneBottom;

			// Fully clear of both edges' zones: snap to rest once, then skip
			// this line entirely until its state changes again.
			if (atRestTop && atRestBottom) {
				if (line.settled !== 1) {
					applyLine(line.el, 1, 1);
					line.el.style.willChange = 'auto';
					line.settled = 1;
				}
				return;
			}
			// Fully behind the header, or not yet scrolled up past the bottom
			// bar: fully hidden either way.
			if (topGap <= 0 || bottomGap <= 0) {
				if (line.settled !== 0) {
					applyLine(line.el, 0, 0);
					line.el.style.willChange = 'auto';
					line.settled = 0;
				}
				return;
			}

			if (line.settled !== null) line.el.style.willChange = 'transform, opacity';
			line.settled = null;

			const tFadeTop = line.fadeZoneTop <= 0 ? 1 : Math.min(1, topGap / line.fadeZoneTop);
			const tFadeBottom =
				line.fadeZoneBottom <= 0 ? 1 : Math.min(1, bottomGap / line.fadeZoneBottom);
			const tScaleTop =
				line.scaleZoneTop <= 0 ? 1 : easeScale(Math.min(1, topGap / line.scaleZoneTop));
			const tScaleBottom =
				line.scaleZoneBottom <= 0 ?
					1
				:	easeScale(Math.min(1, bottomGap / line.scaleZoneBottom));

			applyLine(
				line.el,
				Math.min(tFadeTop, tFadeBottom),
				Math.min(tScaleTop, tScaleBottom)
			);
		});
		ticking = false;
	}

	updateAboutFade = () => {
		rebuildLines();
		update();
	};

	scrollEl.addEventListener(
		'scroll',
		() => {
			if (!ticking) {
				requestAnimationFrame(update);
				ticking = true;
			}
		},
		{ passive: true }
	);

	let resizeTimer;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			if (document.getElementById('about-view')?.classList.contains('is-active')) {
				updateAboutFade();
			}
		}, 150);
	});
}

/* ── Bohl Entertainment brochure: scroll-reveal (subpage card 7) ── */
function initBrochureReveal() {
	const card = document.querySelector('.subpage-card[data-index="7"]');
	if (!card) return;
	card.addEventListener('dragstart', (e) => e.preventDefault());
	const els = card.querySelectorAll('.be-reveal');
	if (!els.length) return;

	if (!('IntersectionObserver' in window)) {
		els.forEach((el) => el.classList.add('is-visible'));
		return;
	}

	const io = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					io.unobserve(entry.target);
				}
			});
		},
		{ root: card, threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
	);

	els.forEach((el, i) => {
		el.style.transitionDelay = `${(i % 4) * 60}ms`;
		io.observe(el);
	});
}
initBrochureReveal();

/* ── Musik: discography accordion with lazy embeds ── */
function initDiscography() {
	const items = document.querySelectorAll('.disco__item');
	items.forEach((item) => {
		const bar = item.querySelector('.disco__bar');
		bar.addEventListener('click', () => {
			const open = item.classList.toggle('is-open');
			bar.setAttribute('aria-expanded', open);

			// lazy-inject iframes on first open
			if (open && !item.dataset.loaded) {
				const yt = item.dataset.yt;
				const sp = item.dataset.sp;
				const spKind = item.dataset.spKind || 'track';
				const videoEl = item.querySelector('.disco__video');
				if (yt && videoEl) {
					videoEl.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
				}
				if (sp) {
					item.querySelector('.disco__spotify').innerHTML =
						`<iframe src="https://open.spotify.com/embed/${spKind}/${sp}?theme=0" title="Spotify player" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
				}
				item.dataset.loaded = 'true';
			}

			// close others
			if (open) {
				items.forEach((other) => {
					if (other !== item && other.classList.contains('is-open')) {
						other.classList.remove('is-open');
						other.querySelector('.disco__bar').setAttribute('aria-expanded', 'false');
					}
				});
			}
		});
	});
}
initDiscography();

/* Collapses all discography foldouts and tears down their lazy-injected
   iframes (rather than just hiding them) so playback actually stops instead
   of continuing behind the closed panel. Clearing dataset.loaded means the
   track re-injects fresh, from the start, next time it's opened. */
function resetMusikDiscography() {
	document.querySelectorAll('.disco__item').forEach((item) => {
		item.classList.remove('is-open');
		item.querySelector('.disco__bar')?.setAttribute('aria-expanded', 'false');
		const video = item.querySelector('.disco__video');
		const spotify = item.querySelector('.disco__spotify');
		if (video) video.innerHTML = '';
		if (spotify) spotify.innerHTML = '';
		delete item.dataset.loaded;
	});
}

/* ── Kabarett: show-banner accordion (single open/close toggle) ── */
function initKabarettAccordion() {
	document.querySelectorAll('.kab-show').forEach((show) => {
		const openBtn = show.querySelector('.kab-open');
		openBtn.addEventListener('click', () => {
			const open = show.classList.toggle('is-open');
			openBtn.setAttribute('aria-expanded', open);
		});
	});
}
initKabarettAccordion();

function resetKabarettAccordion() {
	document.querySelectorAll('.kab-show').forEach((show) => {
		show.classList.remove('is-open');
		show.querySelector('.kab-open')?.setAttribute('aria-expanded', 'false');
	});
}

/* ── Reset per-subpage interactive state when leaving that subpage, whether
   because the overlay closed or the active slide changed. Keyed on the
   subpage-card's aria-label (same identity Router uses for its paths), not
   its index, so it doesn't depend on card order. ── */
function resetSubpageState(index) {
	if (index === undefined || index === null) return;
	const card = document.querySelector(`.subpage-card[data-index="${index}"]`);
	const label = card?.getAttribute('aria-label');
	if (label === 'Kabarett') resetKabarettAccordion();
	else if (label === 'Musik') resetMusikDiscography();
}

/* ── Podcast: single toggle button (title row) that morphs "+" into
   "×" via CSS rotation, unlike the Kabarett banners' two separately
   placed open/close controls. ── */
function initPodcastAccordion() {
	document.querySelectorAll('.podcast-tile').forEach((tile) => {
		const toggle = tile.querySelector('.podcast-toggle');
		toggle.addEventListener('click', () => {
			const open = tile.classList.toggle('is-open');
			toggle.setAttribute('aria-expanded', open);
		});
	});
}
initPodcastAccordion();
