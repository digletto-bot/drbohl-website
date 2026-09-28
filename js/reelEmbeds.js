/**
 * DR.BOHL — INSTAGRAM REEL EMBEDS
 * Loaded on demand, the first time the Social Media subpage is opened.
 *
 * Instagram's embed.js is heavy and third-party, so it is not part of the
 * initial page load: it (and the stats file) are only fetched here.
 *
 * Also renders the icon row above each reel from assets/data/reel-stats.json
 * (produced by scripts/fetch-reel-stats.mjs). A stat that has no value is
 * simply not shown — nothing is ever estimated or placeholder-filled.
 */

const EMBED_SRC = 'https://www.instagram.com/embed.js';
// Resolved relative to this file (js/ → ../assets/data/), never from the
// domain root: the site must also work when served from a subfolder.
const STATS_URL = new URL('../assets/data/reel-stats.json', import.meta.url).href;

// Feather icons (MIT), stroke-based so they follow currentColor.
const ICONS = {
	views:
		'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
	likes:
		'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
	shares: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
};
const LABELS = { views: 'Aufrufe', likes: 'Likes', shares: 'Geteilt' };
const ORDER = ['views', 'likes', 'shares'];

/**
 * Compact German-style count: 950 → "950", 1234 → "1,2K", 88827 → "88,8K",
 * 237000 → "237K", 1250000 → "1,3M".
 * @param {number} n
 * @returns {string}
 */
export function abbreviate(n) {
	const short = (value, suffix) => {
		const digits = value >= 100 ? 0 : 1;
		return value.toFixed(digits).replace(/\.0$/, '').replace('.', ',') + suffix;
	};
	if (n < 1000) return String(n);
	if (n < 1e6) return short(n / 1e3, 'K');
	return short(n / 1e6, 'M');
}

function statHtml(kind, value) {
	const full = value.toLocaleString('de-AT');
	return `<span class="reel-stat" title="${full} ${LABELS[kind]}" aria-label="${full} ${LABELS[kind]}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[kind]}</svg><span class="reel-stat__value">${abbreviate(value)}</span></span>`;
}

async function renderStats() {
	try {
		const res = await fetch(STATS_URL);
		if (!res.ok) return;
		const { reels = {} } = await res.json();
		document.querySelectorAll('.reel-stats[data-reel]').forEach((row) => {
			const stats = reels[row.dataset.reel];
			if (!stats) return;
			const html = ORDER.filter((k) => Number.isFinite(stats[k])).map((k) => statHtml(k, stats[k]));
			if (!html.length) return;
			row.innerHTML = html.join('');
			row.hidden = false;
		});
	} catch (e) {
		// Stats are decoration — the embeds must work without them.
		console.warn('Reel stats unavailable', e);
	}
}

function loadEmbedScript() {
	if (window.instgrm?.Embeds) {
		window.instgrm.Embeds.process();
		return;
	}
	if (document.querySelector(`script[src="${EMBED_SRC}"]`)) return;
	const script = document.createElement('script');
	script.async = true;
	script.src = EMBED_SRC;
	// embed.js scans for blockquotes on its own once loaded; process() is a
	// harmless second pass for the case where it ran before we were ready.
	script.onload = () => window.instgrm?.Embeds?.process();
	document.head.appendChild(script);
}

let started = false;
export function initReelEmbeds() {
	if (started) return;
	started = true;
	renderStats();
	loadEmbedScript();
}
