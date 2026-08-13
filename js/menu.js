/**
 * DR.BOHL — MENU.JS
 * 3D card carousel.
 *
 * Architecture:
 * - Stage fills the available height with overflow:hidden + perspective
 * - Track sits at position:absolute, top = stage centre
 * - Each card is position:absolute, top = -(cardHeight/2) so offset-0
 *   card is perfectly centred in the stage
 * - JS drives translateY(offset * GAP) + rotateX + scale per card
 * - Drag interpolates a fractional position for smooth motion
 */

'use strict';

const CARD_GAP = 16; // px of visible gap between card edges (scale-aware)
const TILT_X = 10; // deg rotateX per card offset
const SCALE_STEP = 0.09; // scale reduction per offset step
const BRIGHTNESS_STEP = 0.4; // brightness reduction per offset step
const MIN_BRIGHTNESS = 0.4; // floor brightness
const VISIBLE_RANGE = 3; // cards shown above/below active
const SNAP_MS = 380; // snap animation duration

const FRICTION = 0.008; // exponential velocity decay per ms (higher = stops sooner)
const FLING_MIN_VELOCITY = 0.00035; // pos/ms: below this, snap immediately instead of coasting
const MAX_VELOCITY = 0.12; // pos/ms clamp on input velocity to avoid extreme flicks

// Final settle: a critically-damped spring (no overshoot) that picks up
// wherever the coast/drag left off, so there's no velocity discontinuity
// at handoff and the stop reads as crisp rather than a slow CSS ease-out.
const SETTLE_STIFFNESS = 1400; // pos/s² per pos-unit of displacement
const SETTLE_DAMPING = 2 * Math.sqrt(SETTLE_STIFFNESS); // critical damping
const SETTLE_SUB_DT = 1 / 240; // physics substep (s), for stability at low fps
const SETTLE_STOP_POS = 0.02; // pos-units from target to consider settled
const SETTLE_STOP_VEL = 0.25; // pos/s to consider settled

class Menu {
	constructor(slider) {
		this.slider = slider;
		this.overlay = document.getElementById('full-screen-menu');
		this.burgers = document.querySelectorAll('.menu-button');
		this.closeBtn = document.getElementById('menu-close');
		this.stage = document.getElementById('menu-stage');
		this.track = document.getElementById('menu-track');
		this.homeBtn = document.getElementById('menu-home');
		this.titles = Array.from(document.querySelectorAll('.menu-card-title'));
		this.cards = [];
		this.isOpen = false;

		this._pos = 0; // fractional active position
		this._activeIdx = 0;
		this._centeredIdx = -1; // whichever card is currently nearest dead-center
		this._dragging = false;
		this._dragged = false;
		this._dragY = 0;
		this._dragPos = 0;
		this._velocity = 0; // pos units per ms, smoothed
		this._lastMoveTime = 0;
		this._snapTimer = null;
		this._rafId = null;
		this._currentGap = CARD_GAP;

		this._init();
	}

	_init() {
		this.cards = Array.from(this.track.querySelectorAll('.menu-card'));

		// Card clicks
		this.cards.forEach((card, i) => {
			card.addEventListener('click', () => {
				if (this._dragged) {
					this._dragged = false;
					return;
				}
				if (i !== this._activeIdx) {
					this._snapTo(i);
				} else {
					this.close();
					setTimeout(() => this.slider.goTo(i), 80);
				}
			});
		});

		// Title-list clicks (desktop side column) — always jump straight to
		// that slide, unlike a card click which re-centers first if it isn't
		// already the active one.
		this.titles.forEach((title, i) => {
			title.addEventListener('click', () => {
				this.close();
				setTimeout(() => this.slider.goTo(i), 80);
			});
		});

		this.burgers.forEach((b) =>
			b.addEventListener('click', () => {
				this.toggle();
				document.activeElement.blur();
			})
		);
		this.closeBtn?.addEventListener('click', () => this.close());
		this.homeBtn?.addEventListener('click', () => {
			this.close();
			setTimeout(() => this.slider.goTo(0), 80);
		});
		this.overlay.addEventListener('click', (e) => {
			if (e.target === this.overlay) this.close();
		});
		document.addEventListener('keydown', (e) => {
			if (!this.isOpen) return;
			if (e.key === 'Escape') {
				this.close();
				return;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				this._snapTo(Math.min(this._activeIdx + 1, this.cards.length - 1));
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				this._snapTo(Math.max(this._activeIdx - 1, 0));
			}
			if (e.key === 'Enter') {
				this.close();
				setTimeout(() => this.slider.goTo(this._activeIdx), 80);
			}
		});

		// Touch
		this.stage.addEventListener(
			'touchstart',
			(e) => this._dragStart(e.touches[0].clientY),
			{ passive: true }
		);
		this.stage.addEventListener(
			'touchmove',
			(e) => {
				e.preventDefault();
				this._dragMove(e.touches[0].clientY);
			},
			{ passive: false }
		);
		this.stage.addEventListener('touchend', () => this._dragEnd());

		// Mouse
		this.stage.addEventListener('mousedown', (e) => this._dragStart(e.clientY));
		window.addEventListener('mousemove', (e) => {
			if (this._dragging) this._dragMove(e.clientY);
		});
		window.addEventListener('mouseup', () => {
			if (this._dragging) this._dragEnd();
		});

		// Wheel
		this.overlay.addEventListener(
			'wheel',
			(e) => {
				e.preventDefault();
				this._snapTo(
					Math.max(
						0,
						Math.min(this.cards.length - 1, this._activeIdx + (e.deltaY > 0 ? 1 : -1))
					)
				);
			},
			{ passive: false }
		);

		let resizeTimer = null;
		window.addEventListener('resize', () => {
			let lastTransform = performance.now();
			this._layout();
			if (resizeTimer) clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				const now = performance.now();
				resizeTimer = null;
				if (now - lastTransform < 10) return;
				this._layout();
				this._applyTransforms();
				lastTransform = now;
			}, 10);
		});
	}

	// ── Layout: position track at stage centre, cards at -cardH/2 ──
	_layout() {
		if (!this.stage || !this.cards[0]) return;
		const stageH = this.stage.offsetHeight;
		const cardW = this.track.offsetWidth;
		const cardH = cardW * (9 / 16);
		this._currentGap = window.innerWidth <= 600 ? CARD_GAP : CARD_GAP * 1.5;
		// Track origin = stage vertical centre
		this.track.style.top = stageH / 2 + 'px';
		// Each card: top = -cardH/2 so its centre aligns with track origin
		// This means offset=0 card is centred in the stage
		const topPx = Math.round(-cardH / 2) + 'px';
		this.cards.forEach((card) => {
			card.style.top = topPx;
		});
		// Store for use in transforms
		this._cardH = cardH;
	}

	// ── Open / Close ────────────────────────────────────────────
	toggle() {
		this.isOpen ? this.close() : this.open();
	}

	open() {
		if (this.isOpen) return;
		this.isOpen = true;
		this.overlay.classList.add('is-open');
		this.overlay.setAttribute('aria-hidden', 'false');
		this.burgers.forEach((b) => {
			b.classList.add('is-open');
			b.setAttribute('aria-expanded', 'true');
		});
		// Wait one frame for menu to be visible before measuring
		requestAnimationFrame(() => {
			this._layout();
			this._pos = this.slider.index;
			this._activeIdx = this.slider.index;
			this._applyTransforms();
			this._updateActive();
		});
	}

	close() {
		if (!this.isOpen) return;
		this.isOpen = false;
		document.activeElement.blur();
		this.overlay.classList.remove('is-open');
		this.overlay.setAttribute('aria-hidden', 'true');
		this.burgers.forEach((b) => {
			b.classList.remove('is-open');
			b.setAttribute('aria-expanded', 'false');
		});
	}

	onSlideChange(index) {
		this._activeIdx = index;
		this._pos = index;
		if (this.isOpen) {
			this._applyTransforms();
			this._updateActive();
		}
	}

	// ── Drag ────────────────────────────────────────────────────
	_dragStart(y) {
		this._dragging = true;
		this._dragged = false;
		this._dragY = y;
		this._dragPos = this._pos;
		this._velocity = 0;
		this._lastMoveTime = performance.now();
		this.cards.forEach((c) => c.classList.remove('is-snapping'));
		clearTimeout(this._snapTimer);
		cancelAnimationFrame(this._rafId);
	}

	_dragMove(y) {
		const now = performance.now();
		const dy = y - this._dragY;
		const delta = -dy / (this._currentGap + this._cardH);
		let pos = this._dragPos + delta;
		// Rubber band at edges
		const max = this.cards.length - 1;
		if (pos < 0) pos = -Math.pow(-pos, 0.6) * 0.5;
		if (pos > max) pos = max + Math.pow(pos - max, 0.6) * 0.5;

		// Smoothed velocity, in position-units per ms, for inertia on release
		const dt = now - this._lastMoveTime;
		if (dt > 0) {
			const instVel = Math.max(
				-MAX_VELOCITY,
				Math.min(MAX_VELOCITY, (pos - this._pos) / dt)
			);
			this._velocity = this._velocity * 0.7 + instVel * 0.3;
		}
		this._lastMoveTime = now;

		this._pos = pos;
		if (Math.abs(dy) > 5) this._dragged = true;
		cancelAnimationFrame(this._rafId);
		this._rafId = requestAnimationFrame(() => this._applyTransforms());
	}

	_dragEnd() {
		this._dragging = false;
		if (Math.abs(this._velocity) > FLING_MIN_VELOCITY) {
			this._startInertia(this._velocity);
		} else {
			const max = this.cards.length - 1;
			const target = Math.max(0, Math.min(max, Math.round(this._pos)));
			this._startSettle(target, this._velocity);
		}
	}

	// ── Inertia ─────────────────────────────────────────────────
	// Coasts the fractional position forward using the release velocity,
	// decaying it exponentially (frame-rate independent) until it drops
	// below threshold, then hands off to the settle spring.
	_startInertia(velocity) {
		clearTimeout(this._snapTimer);
		cancelAnimationFrame(this._rafId);
		this.cards.forEach((c) => c.classList.remove('is-snapping'));

		let vel = velocity;
		let lastTime = performance.now();
		const max = this.cards.length - 1;

		const step = (now) => {
			const dt = Math.min(now - lastTime, 48); // clamp for tab-switch/jank
			lastTime = now;
			vel *= Math.exp(-FRICTION * dt);

			let pos = this._pos + vel * dt;
			if (pos < 0 || pos > max) {
				// Same rubber-band curve as drag, plus extra damping once past the ends
				vel *= 0.82;
				const overshoot = pos < 0 ? -pos : pos - max;
				pos =
					pos < 0 ?
						-Math.pow(overshoot, 0.6) * 0.5
					:	max + Math.pow(overshoot, 0.6) * 0.5;
			}
			this._pos = pos;
			this._applyTransforms();

			if (Math.abs(vel) < FLING_MIN_VELOCITY) {
				const target = Math.max(0, Math.min(max, Math.round(this._pos)));
				this._startSettle(target, vel);
				return;
			}
			this._rafId = requestAnimationFrame(step);
		};
		this._rafId = requestAnimationFrame(step);
	}

	// ── Settle ──────────────────────────────────────────────────
	// Critically-damped spring from the current fractional position/velocity
	// to the target card. Continues the incoming velocity (no discontinuity)
	// and, being critically damped, never overshoots — it just decelerates
	// straight into the target, which reads as a crisp, positive stop.
	_startSettle(target, velocityPosPerMs) {
		clearTimeout(this._snapTimer);
		cancelAnimationFrame(this._rafId);
		this.cards.forEach((c) => c.classList.remove('is-snapping'));
		this._activeIdx = target;

		let pos = this._pos;
		let vel = velocityPosPerMs * 1000; // pos/ms -> pos/s
		let lastTime = performance.now();

		const step = (now) => {
			const dt = Math.min((now - lastTime) / 1000, 0.032);
			lastTime = now;
			const steps = Math.max(1, Math.round(dt / SETTLE_SUB_DT));
			const sub = dt / steps;
			for (let i = 0; i < steps; i++) {
				const accel = -SETTLE_STIFFNESS * (pos - target) - SETTLE_DAMPING * vel;
				vel += accel * sub;
				pos += vel * sub;
			}
			this._pos = pos;
			this._applyTransforms();

			if (Math.abs(pos - target) < SETTLE_STOP_POS && Math.abs(vel) < SETTLE_STOP_VEL) {
				this._pos = target;
				this._applyTransforms();
				this._updateActive();
				return;
			}
			this._rafId = requestAnimationFrame(step);
		};
		this._updateActive();
		this._rafId = requestAnimationFrame(step);
	}

	// ── Snap ────────────────────────────────────────────────────
	_snapTo(index) {
		cancelAnimationFrame(this._rafId);
		this._activeIdx = index;
		this._pos = index;
		this.cards.forEach((c) => c.classList.add('is-snapping'));
		this._applyTransforms();
		this._updateActive();
		clearTimeout(this._snapTimer);
		this._snapTimer = setTimeout(() => {
			this.cards.forEach((c) => c.classList.remove('is-snapping'));
		}, SNAP_MS + 50);
	}

	// ── Core transform ──────────────────────────────────────────
	// No preserve-3d context (mask-image breaks it).
	// Instead we inline perspective() in each card's transform.
	_applyTransforms() {
		const pos = this._pos;

		this.cards.forEach((card, i) => {
			const offset = i - pos;
			const absOff = Math.abs(offset);
			const isVisible = absOff >= VISIBLE_RANGE;

			if (isVisible) {
				card.style.opacity = '0';
				card.style.filter = 'none';
				card.style.pointerEvents = 'none';
				card.style.zIndex = '0';
			} else {
				card.style.pointerEvents = 'auto';
			}
			const scale = 1 - absOff * SCALE_STEP;

			// Scale-aware translateY: instead of a fixed gap per step, we account
			// for the fact that scaled-down cards take up less vertical space.
			// For each integer step between active and this card, the gap between
			// two adjacent cards = (outerCard.scaledHeight/2 + innerCard.scaledHeight/2 + _currentGap).
			// We sum these cumulatively so visual gaps stay even across all cards.
			const sign = offset >= 0 ? 1 : -1;
			const absOffInt = Math.abs(offset);
			let translateY = 0;
			let prevTop = 0; // tracks cumulative Y of the previous step
			for (let step = 1; step <= absOffInt; step++) {
				const prevHalf = this._cardH * (1 - (step - 1) * SCALE_STEP) * 0.5;
				const thisHalf = this._cardH * (1 - step * SCALE_STEP) * 0.5;
				prevTop += prevHalf + thisHalf + this._currentGap;
			}
			// Handle fractional offset (drag position between two integer steps)
			const frac = absOffInt % 1;
			if (frac > 0) {
				const intStep = Math.floor(absOffInt);
				const prevHalf = this._cardH * (1 - intStep * SCALE_STEP) * 0.5;
				const nextHalf = this._cardH * (1 - (intStep + 1) * SCALE_STEP) * 0.5;
				const stepSize = prevHalf + nextHalf + this._currentGap;
				translateY = sign * (prevTop + frac * stepSize);
			} else {
				translateY = sign * prevTop;
			}

			const rotateX = -offset * TILT_X;
			const brightness = Math.max(MIN_BRIGHTNESS, 1 - absOff * BRIGHTNESS_STEP);
			const zIndex = Math.round(100 - absOff * 10);

			card.style.zIndex = zIndex;
			card.style.opacity = '1';
			card.style.filter = absOff < 0.05 ? 'none' : `brightness(${brightness.toFixed(3)})`;
			// perspective() inline gives 3D tilt without needing preserve-3d
			card.style.transform = [
				`perspective(900px)`,
				`translateY(${translateY.toFixed(1)}px)`,
				`rotateX(${rotateX.toFixed(1)}deg)`,
				`scale(${scale.toFixed(3)})`,
			].join(' ');
		});

		this._updateCentered();
	}

	// Label swap (small -> big) tracks whichever card is nearest dead-center
	// *right now*, independent of _activeIdx — which only updates once a
	// drag/fling settles. This keeps the label legible mid-drag instead of
	// only once the carousel stops.
	_updateCentered() {
		const max = this.cards.length - 1;
		const idx = Math.max(0, Math.min(max, Math.round(this._pos)));
		if (idx === this._centeredIdx) return;
		this.cards[this._centeredIdx]?.classList.remove('is-centered');
		this.titles[this._centeredIdx]?.classList.remove('is-active');
		this.cards[idx]?.classList.add('is-centered');
		this.titles[idx]?.classList.add('is-active');
		this._centeredIdx = idx;
	}

	_updateActive = () =>
		this.cards.forEach((card, i) =>
			card.classList.toggle('is-active', i === this._activeIdx)
		);
}

export default Menu;
