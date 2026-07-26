/**
 * DR.BOHL — MENU.JS
 * 3D card carousel — cards are absolutely positioned in a perspective
 * stage. Each card gets a precise 3D transform based on its offset
 * from the active (center) index:
 *
 *   offset 0  → active:   scale(1), translateY(0), rotateX(0), full opacity
 *   offset ±1 → adjacent: scale down, translateY ±gap, rotateX tilt, dimmed
 *   offset ±2 → further:  more tilt, more translateY, more dimmed
 *   offset ≥3 → hidden
 *
 * Drag/swipe changes a fractional offset which is interpolated between
 * card positions for smooth continuous motion.
 */

"use strict";

// ── 3D transform parameters ────────────────────────────────────────
const CARD_GAP     = 90;    // px between card centres (vertical)
const TILT_X       = 18;    // deg rotateX per card offset
const SCALE_STEP   = 0.08;  // scale reduction per card offset
const OPACITY_STEP = 0.22;  // opacity reduction per card offset
const MIN_OPACITY  = 0.28;  // floor opacity for far cards
const VISIBLE_RANGE = 3;    // cards visible above/below active
const SNAP_DURATION = 400;  // ms for snap animation
// ──────────────────────────────────────────────────────────────────

class Menu {
  constructor(slider) {
    this.slider    = slider;
    this.overlay   = document.getElementById("full-screen-menu");
    this.burger    = document.querySelector(".menu-button");
    this.closeBtn  = document.getElementById("menu-close");
    this.stage     = document.getElementById("menu-stage");
    this.track     = document.getElementById("menu-track");
    this.cards     = [];
    this.isOpen    = false;

    // Current position (fractional index — allows smooth dragging between cards)
    this._position  = 0;       // float, matches active index when snapped
    this._activeIdx = 0;

    // Drag state
    this._dragStartY   = 0;
    this._dragStartPos = 0;
    this._isDragging   = false;
    this._rafId        = null;
    this._snapTimer    = null;
    this._isSnapping   = false;

    this._init();
  }

  _init() {
    // Collect cards from the track
    this.cards = Array.from(this.track.querySelectorAll(".menu-card"));

    // Card click — navigate to slide
    this.cards.forEach((card, i) => {
      card.addEventListener("click", (e) => {
        // If we dragged, don't fire click
        if (this._dragged) { this._dragged = false; return; }
        if (i !== this._activeIdx) {
          // Clicking a non-active card snaps to it
          this._snapTo(i);
        } else {
          this.close();
          setTimeout(() => this.slider.goTo(i), 80);
        }
      });
    });

    // Burger / close
    this.burger  ?.addEventListener("click", () => this.toggle());
    this.closeBtn?.addEventListener("click", () => this.close());
    this.overlay  .addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) this.close();
    });

    // Arrow keys while menu is open
    document.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.key === "ArrowDown") { e.preventDefault(); this._snapTo(Math.min(this._activeIdx + 1, this.cards.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); this._snapTo(Math.max(this._activeIdx - 1, 0)); }
      if (e.key === "Enter")     { this.close(); setTimeout(() => this.slider.goTo(this._activeIdx), 80); }
    });

    // Touch drag
    this.stage.addEventListener("touchstart", (e) => this._onDragStart(e.touches[0].clientY), { passive: true });
    this.stage.addEventListener("touchmove",  (e) => { e.preventDefault(); this._onDragMove(e.touches[0].clientY); }, { passive: false });
    this.stage.addEventListener("touchend",   ()  => this._onDragEnd());

    // Mouse drag
    this.stage.addEventListener("mousedown",  (e) => this._onDragStart(e.clientY));
    window    .addEventListener("mousemove",  (e) => { if (this._isDragging) this._onDragMove(e.clientY); });
    window    .addEventListener("mouseup",    ()  => { if (this._isDragging) this._onDragEnd(); });

    // Wheel support
    this.stage.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      this._snapTo(Math.max(0, Math.min(this.cards.length - 1, this._activeIdx + delta)));
    }, { passive: false });

    // Initial layout
    this._setCardHeight();
    window.addEventListener("resize", () => this._setCardHeight());
  }

  // ── Set track height to match one card height ──
  _setCardHeight() {
    if (!this.cards[0]) return;
    const h = this.cards[0].offsetWidth * (9 / 16);
    this.track.style.height = h + "px";
  }

  // ── Open / Close ──────────────────────────────
  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add("is-open");
    this.overlay.setAttribute("aria-hidden", "false");
    this.burger?.classList.add("is-open");
    this.burger?.setAttribute("aria-expanded", "true");
    // Jump to active slide without animation
    this._position  = this.slider.index;
    this._activeIdx = this.slider.index;
    this._applyTransforms(false);
    this._updateActiveClass();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove("is-open");
    this.overlay.setAttribute("aria-hidden", "true");
    this.burger?.classList.remove("is-open");
    this.burger?.setAttribute("aria-expanded", "false");
  }

  onSlideChange(index) {
    this._activeIdx = index;
    this._position  = index;
    if (this.isOpen) {
      this._applyTransforms(false);
      this._updateActiveClass();
    }
  }

  // ── Drag handlers ─────────────────────────────
  _onDragStart(y) {
    this._isDragging   = true;
    this._dragged      = false;
    this._dragStartY   = y;
    this._dragStartPos = this._position;
    this._isSnapping   = false;
    cancelAnimationFrame(this._rafId);
    // Remove snap transition class during drag
    this.cards.forEach(c => c.classList.remove("is-snapping"));
  }

  _onDragMove(y) {
    if (!this._isDragging) return;
    const dy      = y - this._dragStartY;
    const indexDelta = -dy / CARD_GAP;        // drag up = increase index
    this._position = this._dragStartPos + indexDelta;
    // Clamp with rubber-band feel at edges
    const min = 0, max = this.cards.length - 1;
    if (this._position < min) this._position = min - Math.sqrt(min - this._position) * 0.4;
    if (this._position > max) this._position = max + Math.sqrt(this._position - max) * 0.4;

    if (Math.abs(dy) > 4) this._dragged = true;

    cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(() => this._applyTransforms(false));
  }

  _onDragEnd() {
    if (!this._isDragging) return;
    this._isDragging = false;
    // Snap to nearest integer index
    const nearest = Math.max(0, Math.min(this.cards.length - 1, Math.round(this._position)));
    this._snapTo(nearest);
  }

  // ── Snap to index with animation ──────────────
  _snapTo(index) {
    this._activeIdx = index;
    this._position  = index;
    this._isSnapping = true;
    // Add transition class for the snap
    this.cards.forEach(c => c.classList.add("is-snapping"));
    this._applyTransforms(true);
    this._updateActiveClass();
    // Remove transition class after animation
    clearTimeout(this._snapTimer);
    this._snapTimer = setTimeout(() => {
      this.cards.forEach(c => c.classList.remove("is-snapping"));
      this._isSnapping = false;
    }, SNAP_DURATION + 50);
  }

  // ── Core: compute and apply 3D transform to each card ──
  _applyTransforms(animated) {
    const pos = this._position;

    this.cards.forEach((card, i) => {
      const offset = i - pos;            // float distance from active position
      const absOff = Math.abs(offset);

      // Hide cards too far away
      if (absOff >= VISIBLE_RANGE) {
        card.style.opacity   = "0";
        card.style.pointerEvents = "none";
        card.style.zIndex    = "0";
        return;
      }

      card.style.pointerEvents = "auto";

      // ── Y translation — cards fan above and below center ──
      const translateY = offset * CARD_GAP;

      // ── 3D X rotation — cards tilt away from viewer ──
      // Positive offset (below) tilts top-away: negative rotateX
      // Negative offset (above) tilts bottom-away: positive rotateX
      const rotateX = -offset * TILT_X;

      // ── Scale — cards shrink with distance ──
      const scale = Math.max(0.55, 1 - absOff * SCALE_STEP);

      // ── Opacity ──
      const opacity = Math.max(MIN_OPACITY, 1 - absOff * OPACITY_STEP);

      // ── Z — active card comes forward, others recede ──
      const translateZ = Math.max(-120, -absOff * 40);

      // ── Z-index for stacking order ──
      const zIndex = Math.round(100 - absOff * 10);

      card.style.zIndex   = zIndex;
      card.style.opacity  = opacity.toFixed(3);
      card.style.transform = [
        `translateY(${translateY.toFixed(2)}px)`,
        `translateZ(${translateZ.toFixed(2)}px)`,
        `rotateX(${rotateX.toFixed(2)}deg)`,
        `scale(${scale.toFixed(3)})`,
      ].join(" ");
    });
  }

  // ── Update which card has is-active class ──
  _updateActiveClass() {
    this.cards.forEach((card, i) => {
      card.classList.toggle("is-active", i === this._activeIdx);
    });
  }
}

export default Menu;
