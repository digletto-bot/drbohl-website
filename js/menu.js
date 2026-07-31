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

"use strict";

const CARD_GAP = 16; // px of visible gap between card edges (scale-aware)
const TILT_X = 10; // deg rotateX per card offset
const SCALE_STEP = 0.09; // scale reduction per offset step
const BRIGHTNESS_STEP = 0.4; // brightness reduction per offset step
const MIN_BRIGHTNESS = 0.2; // floor brightness
const VISIBLE_RANGE = 3; // cards shown above/below active
const SNAP_MS = 380; // snap animation duration

class Menu {
  constructor(slider) {
    this.slider = slider;
    this.overlay = document.getElementById("full-screen-menu");
    this.burgers = document.querySelectorAll(".menu-button");
    this.closeBtn = document.getElementById("menu-close");
    this.stage = document.getElementById("menu-stage");
    this.track = document.getElementById("menu-track");
    this.cards = [];
    this.isOpen = false;

    this._pos = 0; // fractional active position
    this._activeIdx = 0;
    this._dragging = false;
    this._dragged = false;
    this._dragY = 0;
    this._dragPos = 0;
    this._snapTimer = null;
    this._rafId = null;

    this._init();
  }

  _init() {
    this.cards = Array.from(this.track.querySelectorAll(".menu-card"));

    // Card clicks
    this.cards.forEach((card, i) => {
      card.addEventListener("click", () => {
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

    this.burgers.forEach((b) =>
      b.addEventListener("click", () => {
        this.toggle();
        document.activeElement.blur();
      }),
    );
    this.closeBtn?.addEventListener("click", () => this.close());
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.key === "Escape") {
        this.close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._snapTo(Math.min(this._activeIdx + 1, this.cards.length - 1));
        console.log(this._activeIdx);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this._snapTo(Math.max(this._activeIdx - 1, 0));
      }
      if (e.key === "Enter") {
        this.close();
        console.log(this._activeIdx);
        setTimeout(() => this.slider.goTo(this._activeIdx), 80);
      }
    });

    // Touch
    this.stage.addEventListener(
      "touchstart",
      (e) => this._dragStart(e.touches[0].clientY),
      { passive: true },
    );
    this.stage.addEventListener(
      "touchmove",
      (e) => {
        if (this._dragging) e.preventDefault();
        this._dragMove(e.touches[0].clientY);
      },
      { passive: false },
    );
    this.stage.addEventListener("touchend", () => this._dragEnd());

    // Mouse
    this.stage.addEventListener("mousedown", (e) => this._dragStart(e.clientY));
    window.addEventListener("mousemove", (e) => {
      if (this._dragging) this._dragMove(e.clientY);
    });
    window.addEventListener("mouseup", () => {
      if (this._dragging) this._dragEnd();
    });

    // Wheel
    this.overlay.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this._snapTo(
          Math.max(
            0,
            Math.min(
              this.cards.length - 1,
              this._activeIdx + (e.deltaY > 0 ? 1 : -1),
            ),
          ),
        );
      },
      { passive: false },
    );

    window.addEventListener("resize", () => this._layout());
  }

  // ── Layout: position track at stage centre, cards at -cardH/2 ──
  _layout() {
    if (!this.stage || !this.cards[0]) return;
    const stageH = this.stage.offsetHeight;
    const cardW = this.track.offsetWidth;
    const cardH = cardW * (9 / 16);
    // Track origin = stage vertical centre
    this.track.style.top = stageH / 2 + "px";
    // Each card: top = -cardH/2 so its centre aligns with track origin
    // This means offset=0 card is centred in the stage
    const topPx = Math.round(-cardH / 2) + "px";
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
    this.overlay.classList.add("is-open");
    this.overlay.setAttribute("aria-hidden", "false");
    this.burgers.forEach((b) => {
      b.classList.add("is-open");
      b.setAttribute("aria-expanded", "true");
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
    this.overlay.classList.remove("is-open");
    this.overlay.setAttribute("aria-hidden", "true");
    this.burgers.forEach((b) => {
      b.classList.remove("is-open");
      b.setAttribute("aria-expanded", "false");
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
    this.cards.forEach((c) => c.classList.remove("is-snapping"));
    cancelAnimationFrame(this._rafId);
  }

  _dragMove(y) {
    const dy = y - this._dragY;
    const delta = -dy / (CARD_GAP + this._cardH);
    let pos = this._dragPos + delta;
    // Rubber band at edges
    const max = this.cards.length - 1;
    if (pos < 0) pos = -Math.pow(-pos, 0.6) * 0.5;
    if (pos > max) pos = max + Math.pow(pos - max, 0.6) * 0.5;
    this._pos = pos;
    if (Math.abs(dy) > 5) this._dragged = true;
    cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(() => this._applyTransforms());
  }

  _dragEnd() {
    this._dragging = false;
    this._snapTo(
      Math.max(0, Math.min(this.cards.length - 1, Math.round(this._pos))),
    );
  }

  // ── Snap ────────────────────────────────────────────────────
  _snapTo(index) {
    this._activeIdx = index;
    this._pos = index;
    this.cards.forEach((c) => c.classList.add("is-snapping"));
    this._applyTransforms();
    this._updateActive();
    clearTimeout(this._snapTimer);
    this._snapTimer = setTimeout(() => {
      this.cards.forEach((c) => c.classList.remove("is-snapping"));
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
        card.style.opacity = "0";
        card.style.filter = "none";
        card.style.pointerEvents = "none";
        card.style.zIndex = "0";
      } else {
        card.style.pointerEvents = "auto";
      }
      const scale = 1 - absOff * SCALE_STEP;

      // Scale-aware translateY: instead of a fixed gap per step, we account
      // for the fact that scaled-down cards take up less vertical space.
      // For each integer step between active and this card, the gap between
      // two adjacent cards = (outerCard.scaledHeight/2 + innerCard.scaledHeight/2 + CARD_GAP).
      // We sum these cumulatively so visual gaps stay even across all cards.
      const sign = offset >= 0 ? 1 : -1;
      const absOffInt = Math.abs(offset);
      let translateY = 0;
      let prevTop = 0; // tracks cumulative Y of the previous step
      for (let step = 1; step <= absOffInt; step++) {
        const prevHalf = this._cardH * (1 - (step - 1) * SCALE_STEP) * 0.5;
        const thisHalf = this._cardH * (1 - step * SCALE_STEP) * 0.5;
        prevTop += prevHalf + thisHalf + CARD_GAP;
      }
      // Handle fractional offset (drag position between two integer steps)
      const frac = absOffInt % 1;
      if (frac > 0) {
        const intStep = Math.floor(absOffInt);
        const prevHalf = this._cardH * (1 - intStep * SCALE_STEP) * 0.5;
        const nextHalf = this._cardH * (1 - (intStep + 1) * SCALE_STEP) * 0.5;
        const stepSize = prevHalf + nextHalf + CARD_GAP;
        translateY = sign * (prevTop + frac * stepSize);
      } else {
        translateY = sign * prevTop;
      }

      const rotateX = -offset * TILT_X;
      const brightness = Math.max(MIN_BRIGHTNESS, 1 - absOff * BRIGHTNESS_STEP);
      const zIndex = Math.round(100 - absOff * 10);

      card.style.zIndex = zIndex;
      card.style.opacity = "1";
      card.style.filter =
        absOff < 0.05 ? "none" : `brightness(${brightness.toFixed(3)})`;
      // perspective() inline gives 3D tilt without needing preserve-3d
      card.style.transform = [
        `perspective(900px)`,
        `translateY(${translateY.toFixed(1)}px)`,
        `rotateX(${rotateX.toFixed(1)}deg)`,
        `scale(${scale.toFixed(3)})`,
      ].join(" ");
    });
  }

  _updateActive = () =>
    this.cards.forEach((card, i) =>
      card.classList.toggle("is-active", i === this._activeIdx),
    );

  _updateActiveFromScroll() {
    if (!this.list) return;
    const centerY = this.list.scrollTop + this.list.offsetHeight / 2;
    const cards = Array.from(this.list.querySelectorAll(".menu-card"));
    let closest = 0;
    let closestDist = Infinity;

    cards.forEach((card, i) => {
      const cardCenter = card.offsetTop + card.offsetHeight / 2;
      const dist = Math.abs(cardCenter - centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });

    cards.forEach((card, i) =>
      card.classList.toggle("is-active", i === closest),
    );
  }

  // _snapToCenter() {
  //   if (!this.list) return;
  //   const centerY = this.list.scrollTop + this.list.offsetHeight / 2;
  //   const cards = Array.from(this.list.querySelectorAll(".menu-card"));
  //   let closest = cards[0];
  //   let closestDist = Infinity;

  //   cards.forEach((card) => {
  //     const cardCenter = card.offsetTop + card.offsetHeight / 2;
  //     const dist = Math.abs(cardCenter - centerY);
  //     if (dist < closestDist) {
  //       closestDist = dist;
  //       closest = card;
  //     }
  //   });

  //   const targetScroll =
  //     closest.offsetTop + closest.offsetHeight / 2 - this.list.offsetHeight / 2;
  //   this.list.scrollTo({ top: targetScroll, behavior: "smooth" });
  // }

  // _scrollToCard(index, behavior = "smooth") {
  //   if (!this.list) return;
  //   const cards = this.list.querySelectorAll(".menu-card");
  //   const card = cards[index];
  //   if (!card) return;
  //   const targetScroll =
  //     card.offsetTop + card.offsetHeight / 2 - this.list.offsetHeight / 2;
  //   this.list.scrollTo({ top: targetScroll, behavior });
  // }
}

export default Menu;
