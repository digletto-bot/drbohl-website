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

/* Slide indices for subpages whose init work is deferred past first paint —
   Contact/About content is built lazily on first visit to that slide, and
   Tour Dates are only fetched once that subpage is actually opened. */
const CONTACT_SLIDE_INDEX = 8;
const TOUR_DATES_SLIDE_INDEX = 0;

let aboutInitialized = false;
function ensureAboutInit() {
	if (aboutInitialized) return;
	aboutInitialized = true;
	buildAboutContent();
	initAboutReveal();
	console.log('init about');
}

let tourDatesLoaded = false;
function ensureTourDatesLoaded() {
	if (tourDatesLoaded) return;
	tourDatesLoaded = true;
	renderTourDates(document.getElementById('tour-list'));
}

document.addEventListener('DOMContentLoaded', () => {
	/* ── fitText ── */
	/* ── fitText / loading screen ──
	   fitText needs DrukCond metrics to size headlines correctly, so it
	   must wait for fonts. But a hung/blocked font request must not trap
	   the visitor behind the loading screen forever — the 2500ms timeout
	   is a hard ceiling: whichever fires first (fonts.ready or the
	   timeout) reveals the site, and a guard flag stops the loser of that
	   race from running hideLoadingScreen twice (harmless, but the fitText
	   double-run without the font would render at fallback-font metrics,
	   hence the guard). */
	let revealed = false;
	function revealSite() {
		if (revealed) return;
		revealed = true;
		fitText();
		hideLoadingScreen();
		setTimeout(fitText, 120);
	}
	document.fonts.ready.then(revealSite);
	setTimeout(revealSite, 2500);
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
			if (index === CONTACT_SLIDE_INDEX) ensureAboutInit();
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
			if (index === TOUR_DATES_SLIDE_INDEX && subpageOverlayIsOpen())
				ensureTourDatesLoaded();
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
	window.slider = slider;
	window.subpageSlider = subpageSlider;

	/* ── Progress nav clicks (title-card navbar + subpage-overlay navbar) ── */
	document.querySelectorAll('.progress-nav').forEach((nav) => {
		nav.querySelectorAll('.progress-nav__item').forEach((item, i) => {
			item.addEventListener('click', () => slider.goTo(i));
		});
	});

	/* ── Desktop arrows ── */
	document.getElementById('arrow-prev')?.addEventListener('click', () => slider.prev());
	document.getElementById('arrow-next')?.addEventListener('click', () => slider.next());

	/* ── Contact form (subpage card 8) ── */
	document.getElementById('contact-form')?.addEventListener('submit', (e) => {
		e.preventDefault();
		closeSubpage();
	});

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
		// The reveal is driven by IntersectionObserver (initAboutReveal),
		// which re-evaluates automatically once the view flips from
		// display:none to visible — no manual geometry re-measure needed.
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

	// Handle clicks links contained by slider
	// -> Prevent opening the link, if the user meant to drag between slides
	document.querySelectorAll('a').forEach((link) => {
		let startX, startY;
		link.addEventListener('pointerdown', (e) => {
			startX = e.clientX;
			startY = e.clientY;
		});
		link.addEventListener('click', (e) => {
			if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) e.preventDefault();
		});
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
	if (window.subpageSlider?.currentIndex === TOUR_DATES_SLIDE_INDEX)
		ensureTourDatesLoaded();
};

const subpageOverlayIsOpen = () =>
	document.getElementById('subpage-overlay')?.classList.contains('is-open') ?? false;

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
		if (window.subpageSlider?.currentIndex === TOUR_DATES_SLIDE_INDEX)
			ensureTourDatesLoaded();
	} else if (sp.classList.contains('is-open')) {
		hideSubpageOverlay(sp);
		// Closing pops the pushState entry from openSubpage, landing back on
		// whatever entry/URL was current before the subpage opened — stale if
		// slides were changed (via replaceState) while the subpage was open.
		// Re-stamp the URL from the slider's actual current index to fix that.
		window.router?.onSlideChange(window.slider.index);
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

	// Plain paragraph markup — no per-word spans. The reveal system
	// (initAboutReveal) animates each <p> as one block via
	// IntersectionObserver + CSS transitions, so there is nothing here
	// to stagger at the word level.
	let html = `<div class="about-lead-mask"><p class="about-overlay__lead about-reveal">${ABOUT_LEAD}</p></div><span class="about-lead-rule" aria-hidden="true"></span>`;
	ABOUT_PARAGRAPHS.forEach((para) => {
		html += `<p class="about-reveal">${para}</p>`;
	});
	body.innerHTML = html;
	body.dataset.filled = 'true';
}

/* ── About view: editorial stage-light reveal ──
   Replaces the old two-part system (per-word IntersectionObserver
   stagger + a continuous per-scroll-frame line-geometry pass that
   re-measured every line's getBoundingClientRect() on every frame).
   This version: each paragraph (including the lead) is one reveal
   unit, triggered once via IntersectionObserver, animated with plain
   CSS transitions (opacity/transform — both compositor-friendly, no
   layout properties touched). No scroll listener, no per-frame
   JS, no line-detection reflow.
   The lead's upward-mask reveal and drawing rule are triggered
   together with the lead paragraph's own .is-in class (the mask and
   rule are separate elements, but styled to react to sibling/child
   .is-in state via the classes added below).
   The one-time "stage light" sweep is added just before each
   paragraph's own transition starts and removed after it completes
   (via `transitionend`), so `.about-sweep-once`'s pseudo-element and
   its `will-change` never persist once a paragraph has settled. */
function initAboutReveal() {
	const scrollEl = document.getElementById('subpage-card-contact');
	const body = document.getElementById('about-body');
	if (!body || !scrollEl) return;

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function revealNow(el) {
		el.classList.add('is-in');
		const rule = document.querySelector('.about-lead-rule');
		if (el.classList.contains('about-overlay__lead') && rule) rule.classList.add('is-in');
	}

	// Longest of the paragraph reveal (620ms) and the sweep's own
	// ::before travel (680ms), plus a small margin. Used as a
	// deterministic cleanup timer instead of `transitionend`: the
	// element animates several properties (opacity + transform) AND its
	// ::before animates two more, so the first `transitionend` to fire
	// would strip the sweep classes ~60ms early and cut the light band
	// short. A timer keyed to the true longest duration removes the
	// classes only once everything has genuinely finished.
	const SWEEP_CLEANUP_MS = 760;

	function revealWithSweep(el) {
		el.classList.add('about-sweep-once');
		// Force a style flush before adding the transition-triggering
		// classes, so the sweep's initial (pre-transition) position is
		// committed to a frame before it starts animating.
		void el.offsetWidth;
		el.classList.add('is-sweeping');
		revealNow(el);
		setTimeout(
			() => el.classList.remove('about-sweep-once', 'is-sweeping'),
			SWEEP_CLEANUP_MS
		);
	}

	if (reduceMotion || !('IntersectionObserver' in window)) {
		body.querySelectorAll('.about-reveal').forEach(revealNow);
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				revealWithSweep(entry.target);
				observer.unobserve(entry.target);
			});
		},
		{ root: scrollEl, rootMargin: '0px 0px -10% 0px', threshold: 0 }
	);

	body.querySelectorAll('.about-reveal').forEach((p) => observer.observe(p));
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
		const toggle = item.querySelector('.disco__toggle');
		bar.addEventListener('click', (e) => {
			// Let the Spotify badge link navigate instead of toggling.
			if (e.target.closest('.disco__spotify-badge')) return;
			const open = item.classList.toggle('is-open');
			toggle.setAttribute('aria-expanded', open);

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
						other.querySelector('.disco__toggle').setAttribute('aria-expanded', 'false');
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
		item.querySelector('.disco__toggle')?.setAttribute('aria-expanded', 'false');
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

/* ── Schabernack: timeline accordion (each year toggles independently) ── */
function initTimelineAccordion() {
	document.querySelectorAll('.tl-year').forEach((year) => {
		const head = year.querySelector('.tl-year__head');
		head.addEventListener('click', () => {
			const open = year.classList.toggle('is-open');
			head.setAttribute('aria-expanded', open);
		});
	});
}
initTimelineAccordion();

function resetTimelineAccordion() {
	document.querySelectorAll('.tl-year').forEach((year) => {
		year.classList.remove('is-open');
		year.querySelector('.tl-year__head')?.setAttribute('aria-expanded', 'false');
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
	else if (label === 'Schabernack') resetTimelineAccordion();
}

/* ── Podcast: single toggle button (title row) that morphs "+" into
   "×" via CSS rotation, unlike the Kabarett banners' two separately
   placed open/close controls. ── */
function initPodcastAccordion() {
	document.querySelectorAll('.podcast-tile').forEach((tile) => {
		const head = tile.querySelector('.podcast-tile__head');
		const toggle = tile.querySelector('.podcast-toggle');
		head.addEventListener('click', () => {
			const open = tile.classList.toggle('is-open');
			toggle.setAttribute('aria-expanded', open);
		});
	});
}
initPodcastAccordion();
