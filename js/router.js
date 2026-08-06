class Router {
	constructor(slider) {
		this.slider = slider;
		this.routes = [];

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
		// findIndex returns -1 for an unknown path, which is truthy — guard
		// explicitly so a bad deep link lands on Home instead of goTo(-1).
		if (index > 0) this.slider.goTo(index);
	}

	_convertToPathName = (label) => label.replace(/\s/g, '-').toLowerCase();

	onSlideChange(idx) {
		// Remove this version once hosting no longer happens on github.io
		if (!window.location.href.includes('github')) {
			return;
		}

		const pathComponent = this.routes[idx].path ? `/${this.routes[idx].path}` : '';

		// Reinstate this version once hosting no longer happens on github.io
		// const newPath = `${window.location.origin}${pathComponent}`;

		// This is the temporary value for github.io
		const newPath = `${window.location.origin}/drbohl-website${pathComponent}`;

		window.history.replaceState(null, '', newPath);
	}
}

export default Router;
