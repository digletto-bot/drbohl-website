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
		if (index > 0) this.slider.goTo(index);
	}

	_convertToPathName = (label) => label.replace(/\s/g, '-').toLowerCase();

	onSlideChange(idx) {
		// Skip while developing locally so we don't need redirect rules for a dev server.
		const { hostname } = window.location;
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
			return;
		}

		const pathComponent = this.routes[idx].path ? `/${this.routes[idx].path}` : '';
		const newPath = `${window.location.origin}${this.basePath}${pathComponent}` || '/';

		window.history.replaceState(history.state, '', newPath);
	}
}

export default Router;
