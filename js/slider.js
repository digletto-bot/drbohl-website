/**
 * DR.BOHL — SLIDER.JS
 * Horizontal push-slide system. Touch, mouse drag, keyboard, programmatic.
 */

'use strict';

const MAX_SCROLL_THRESHOLD = 200;

class Slider {
	constructor(options = {}) {
		this.track = document.getElementById(options.trackId || 'slider-track');
		this.cards = Array.from(
			this.track.querySelectorAll(options.cardSelector || '.title-card')
		);
		this.totalSlides = this.cards.length;
		this.currentIndex = 0;
		this.isAnimating = false;
		this.onSlideChange = options.onSlideChange || null;
		this.animationDuration = parseInt(
			getComputedStyle(document.documentElement)
				.getPropertyValue('--slide-duration')
				.trim()
				.replaceAll(/[a-zA-Z]/g, '')
		);

		// Touch state
		this._tx = 0;
		this._ty = 0;
		this._tdx = 0;
		this._isH = null;
		this._drag = false;

		// Mouse state
		this._md = false;
		this._mx = 0;
		this._mdx = 0;

		// Animation frame throttling (preventing jittering on mobile IOS)
		this.rafPending = false;
		this.tapEnded = false;

		this._applyPositions();
		this._bindTouch();
		this._bindMouse();
		if (options.bindKeyboard !== false) this._bindKeyboard();
	}

	/* ── Position all cards by index ── */
	_applyPositions() {
		this.cards.forEach((card, i) => {
			card.classList.remove('is-prev', 'is-current', 'is-next');
			card.style.transform = '';
			if (i < this.currentIndex) card.classList.add('is-prev');
			else if (i === this.currentIndex) card.classList.add('is-current');
			else card.classList.add('is-next');
		});
	}

	/* ── Navigate to slide index t ── */
	goTo(t) {
		if (this.isAnimating || t === this.currentIndex || t < 0 || t >= this.totalSlides)
			return;
		this.isAnimating = true;
		const prev = this.currentIndex;
		this.currentIndex = t;
		this._applyPositions();

		// Re-trigger Ken Burns on active image
		const img = this.cards[this.currentIndex].querySelector('.title-card__image');
		if (img) {
			img.style.animation = 'none';
			void img.offsetWidth;
			img.style.animation = '';
		}

		// Re-trigger Ken Burns on active hero cutout (Contact slide)
		const cutoutWrap = this.cards[this.currentIndex].querySelector(
			'.hero-cutout-image-wrap'
		);
		if (cutoutWrap) {
			cutoutWrap.style.animation = 'none';
			void cutoutWrap.offsetWidth;
			cutoutWrap.style.animation = '';
		}

		if (this.onSlideChange) this.onSlideChange(this.currentIndex, prev);
		setTimeout(() => {
			this.isAnimating = false;
			this._resetDrag();
		}, this.animationDuration + 10);
	}

	next() {
		this.goTo(this.currentIndex + 1);
	}
	prev() {
		this.goTo(this.currentIndex - 1);
	}
	get index() {
		return this.currentIndex;
	}

	/* ── Touch swipe ── */
	_bindTouch() {
		this.track.addEventListener(
			'touchstart',
			(e) => {
				if (
					e.target instanceof HTMLInputElement ||
					e.target instanceof HTMLTextAreaElement
				)
					return;
				this._tx = e.touches[0].clientX;
				this._ty = e.touches[0].clientY;
				this._tdx = 0;
				this._drag = true;
				this._isH = null;
				this.tapEnded = false;
			},
			{ passive: true }
		);

		this.track.addEventListener(
			'touchmove',
			(e) => {
				if (!this._drag) return;
				const dx = e.touches[0].clientX - this._tx;
				const dy = e.touches[0].clientY - this._ty;
				if (this._isH === null) this._isH = Math.abs(dx) > Math.abs(dy);
				if (!this._isH) return;
				e.preventDefault();
				this._tdx = dx;

				if (!this.rafPending) {
					this.rafPending = true;
					requestAnimationFrame(() => {
						if (!this.tapEnded) this._applyDrag(dx);
						this.rafPending = false;
					});
				}
			},
			{ passive: false }
		);

		this.track.addEventListener('touchend', () => {
			this.tapEnded = true;
			if (!this._drag || !this._isH) {
				this._drag = false;
				return;
			}
			this._drag = false;
			const thr = Math.min(MAX_SCROLL_THRESHOLD, this.track.offsetWidth * 0.2);
			if (this._tdx < -thr && this.currentIndex < this.totalSlides - 1) {
				this.next();
			} else if (this._tdx > thr && this.currentIndex >= 1) {
				this.prev();
			} else this._resetDrag();
		});
	}

	/* ── Mouse drag ── */
	_bindMouse() {
		this.track.addEventListener('mousedown', (e) => {
			if (
				e.button != 0 ||
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;
			this._md = true;
			this._mx = e.clientX;
			this._mdx = 0;
			this.track.style.cursor = 'grabbing';
			this.tapEnded = false;
			// Iframes (YouTube/Spotify embeds) swallow mouse events that pass
			// over them, which stops the window mousemove/mouseup listeners
			// below from firing. Disable their pointer events for the
			// duration of the drag so the browser keeps routing to window.
			this.track.classList.add('is-dragging');
		});
		window.addEventListener('mousemove', (e) => {
			if (e.button != 0) return;
			if (!this._md) return;
			this._mdx = e.clientX - this._mx;

			if (!this.rafPending) {
				this.rafPending = true;
				requestAnimationFrame(() => {
					if (!this.tapEnded) this._applyDrag(this._mdx);
					this.rafPending = false;
				});
			}
		});
		window.addEventListener('mouseup', (e) => {
			if (e.button != 0) return;
			this.tapEnded = true;
			if (!this._md) return;
			this._md = false;
			this.track.style.cursor = '';
			this.track.classList.remove('is-dragging');
			const thr = Math.min(MAX_SCROLL_THRESHOLD, this.track.offsetWidth * 0.2);
			if (this._mdx < -thr && this.currentIndex < this.totalSlides - 1) {
				this.next();
			} else if (this._mdx > thr && this.currentIndex >= 1) {
				this.prev();
			} else this._resetDrag();
		});
	}

	/* ── Keyboard ── */
	_bindKeyboard() {
		document.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowRight') this.next();
			if (e.key === 'ArrowLeft') this.prev();
		});
	}

	/* ── Drag helpers ── */
	_applyDrag(dx) {
		const d = dx * 0.85;
		if (this.cards[this.currentIndex])
			this.cards[this.currentIndex].style.transform = `translateX(${d}px)`;
		if (this.cards[this.currentIndex - 1])
			this.cards[this.currentIndex - 1].style.transform =
				`translateX(calc(-100% + ${d}px))`;
		if (this.cards[this.currentIndex + 1])
			this.cards[this.currentIndex + 1].style.transform =
				`translateX(calc(100% + ${d}px))`;
	}

	_resetDrag() {
		if (this.isAnimating || this._drag || this._md) return;
		this.cards.forEach((c) => {
			c.style.transition = 'none';
			c.style.transform = '';
			void c.offsetWidth;
			c.style.transition = '';
		});
	}
}

export default Slider;
