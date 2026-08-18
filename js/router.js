// Per-route <title> / meta description, keyed by slide index (same order
// as the title-card aria-labels in index.html). Drives search-snippet
// differentiation per section — reviewed/approved copy, not placeholder text.
const ROUTE_META = [
	{
		title: 'Dr.Bohl — Kabarett Tickets, Entertainer, Comedian',
		description:
			'Dr.Bohl — Kabarettist, Entertainer und Comedian aus Österreich. Kabarett-Tickets, Termine, TV-Auftritte, Musik und mehr.',
	},
	{
		title: 'Kabarett — Dr.Bohl',
		description:
			'Kabarett-Programme von Dr.Bohl: Solo, Anabohlika und mehr. Absolutes Kulturprogramm für jeden — Tickets und Termine hier.',
	},
	{
		title: 'Social Media — Dr.Bohl',
		description:
			'Folge Dr.Bohl auf Instagram, TikTok, YouTube, Facebook und Spotify für die neuesten Reels, Behind-the-Scenes und Musik.',
	},
	{
		title: 'Showtime — TV & Streaming | Dr.Bohl',
		description:
			"Dr.Bohl im Fernsehen: Dancing Stars, Tiafe Typen, Was gibt's Neues? und Willkommen Österreich — alle TV-Auftritte im Überblick.",
	},
	{
		title: 'Musik — Dr.Bohl',
		description:
			'Releases, Playlists und Hörproben von Dr.Bohl — Musik mit Schmäh, zum Streamen auf Spotify und YouTube.',
	},
	{
		title: 'Podcast — Dr.Bohl',
		description:
			'Zwei Shows, ein Bohl: Insider-Talk im Auto und Promi-Interviews bei der Melange — die Podcasts von Dr.Bohl zum Nachhören.',
	},
	{
		title: 'Shop — Dr.Bohl',
		description:
			'Limitierte Bohl100-Drops im offiziellen Dr.Bohl Shop — immer nur 100 Stück pro Produkt. Be quick and join the club.',
	},
	{
		title: 'Bohl Entertainment — Produktion & Kreation',
		description:
			'Bohl Entertainment: Entertainment, Produktion und Kreation aus einer Hand — von der Idee bis zur Umsetzung.',
	},
	{
		title: 'Kontakt — Dr.Bohl',
		description:
			'Anfragen, Buchungen und Kooperationen: Kontaktiere Dr.Bohl und das Team direkt hier.',
	},
];

class Router {
	constructor(slider) {
		this.slider = slider;
		this.routes = [];
		this.basePath = '';

		this._init();
	}

	_init() {
		this.slider.cards.forEach((card, i) => {
			this.routes.push({
				title: card.ariaLabel,
				path: i != 0 ? this._convertToPathName(card.ariaLabel) : '',
			});
		});

		const url = new URL(window.location.href);
		const pathSplit = url.pathname.split('/');
		const index = this.routes.findIndex((e) => e.path == pathSplit[pathSplit.length - 1]);

		// Everything before the route segment is the deploy prefix (e.g. "/drbohl-website"
		// on GitHub Pages, "" on Netlify). Store it so onSlideChange can rebuild URLs
		// without hardcoding a specific host's path layout.
		pathSplit[pathSplit.length - 1] = '';
		this.basePath = pathSplit.join('/').replace(/\/$/, '');

		// findIndex returns -1 for an unknown path, which is truthy — guard
		// explicitly so a bad deep link lands on Home instead of goTo(-1).
		if (index > 0) {
			this.slider.goTo(index);
		} else if (index == -1) {
			// Invalid path: slider is already showing Home, but the URL bar
			// still shows the bad path — correct it to match.
			this.onSlideChange(0);
		}

		// slider.goTo() above only fires the onSlideChange callback wired up
		// in main.js, which itself only calls back into this router once
		// `window.router` has been assigned — i.e. after this constructor
		// has already returned. So the very first paint's meta never runs
		// through onSlideChange; apply it directly here instead.
		this._applyMeta(index > 0 ? index : 0);
	}

	_convertToPathName = (label) => label.replace(/\s/g, '-').toLowerCase();

	onSlideChange(idx) {
		this._applyMeta(idx);

		// Skip while developing locally so we don't need redirect rules for a dev server.
		const { hostname } = window.location;
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
			return;
		}

		const pathComponent = this.routes[idx].path ? `/${this.routes[idx].path}` : '';
		const newPath = `${window.location.origin}${this.basePath}${pathComponent}`;

		window.history.replaceState(history.state, '', newPath);
		this._applyCanonical(newPath);
	}

	// Keeps <title>, meta description, and the OG/Twitter equivalents in
	// sync with whichever section is actually showing — see ROUTE_META
	// above for the reviewed per-route copy.
	_applyMeta(idx) {
		const meta = ROUTE_META[idx];
		if (!meta) return;

		document.title = meta.title;
		this._setMetaContent('meta[name="description"]', meta.description);
		this._setMetaContent('meta[property="og:title"]', meta.title);
		this._setMetaContent('meta[property="og:description"]', meta.description);
		this._setMetaContent('meta[name="twitter:title"]', meta.title);
		this._setMetaContent('meta[name="twitter:description"]', meta.description);
	}

	_setMetaContent(selector, content) {
		document.querySelector(selector)?.setAttribute('content', content);
	}

	_applyCanonical(url) {
		document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
		this._setMetaContent('meta[property="og:url"]', url);
	}
}

export default Router;
