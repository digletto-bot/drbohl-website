/**
 * DR.BOHL — MENU.JS
 * Stacked overlap menu — cards vary in width/opacity by proximity to center.
 * Active card is widest + yellow glow. Snap-to-center on scroll stop.
 */

"use strict";

class Menu {
  constructor(slider) {
    this.slider   = slider;
    this.overlay  = document.getElementById("full-screen-menu");
    this.burger   = document.querySelector(".menu-button");
    this.closeBtn = document.getElementById("menu-close");
    this.list     = document.getElementById("menu-list");
    this.isOpen   = false;
    this._snapTimer  = null;
    this._rafPending = false;
    this._init();
  }

  _init() {
    this.burger  ?.addEventListener("click", () => this.toggle());
    this.closeBtn?.addEventListener("click", () => this.close());
    this.overlay  .addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) this.close();
    });

    // Card clicks — navigate to slide
    this.list?.querySelectorAll(".menu-card").forEach((card, i) => {
      card.addEventListener("click", () => {
        this.close();
        setTimeout(() => this.slider.goTo(i), 80);
      });
    });

    // Scroll handler — rAF throttled
    this.list?.addEventListener("scroll", () => {
      if (!this._rafPending) {
        this._rafPending = true;
        requestAnimationFrame(() => {
          this._updateActiveFromScroll();
          this._rafPending = false;
        });
      }
      // Snap after scroll settles
      clearTimeout(this._snapTimer);
      this._snapTimer = setTimeout(() => this._snapToCenter(), 100);
    }, { passive: true });
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add("is-open");
    this.overlay.setAttribute("aria-hidden", "false");
    this.burger?.classList.add("is-open");
    this.burger?.setAttribute("aria-expanded", "true");
    this._updateActive(this.slider.index);
    // After transition, scroll active card into center
    setTimeout(() => {
      this._scrollToCard(this.slider.index, "auto");
    }, 60);
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
    this._updateActive(index);
  }

  _updateActive(index) {
    this.list?.querySelectorAll(".menu-card").forEach((card, i) => {
      const isActive = i === index;
      card.classList.toggle("is-active", isActive);
      // Also mark the parent <li> for margin adjustment
      card.closest("li")?.classList.toggle("has-active-card", isActive);
    });
  }

  _updateActiveFromScroll() {
    if (!this.list) return;
    const cards    = Array.from(this.list.querySelectorAll(".menu-card"));
    const listRect = this.list.getBoundingClientRect();
    const centerY  = listRect.top + listRect.height / 2;

    let closest     = 0;
    let closestDist = Infinity;

    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;
      const dist = Math.abs(cardCenterY - centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });

    cards.forEach((card, i) => {
      const isActive = i === closest;
      card.classList.toggle("is-active", isActive);
      card.closest("li")?.classList.toggle("has-active-card", isActive);
    });
  }

  _snapToCenter() {
    if (!this.list) return;
    const cards    = Array.from(this.list.querySelectorAll(".menu-card"));
    const listRect = this.list.getBoundingClientRect();
    const centerY  = listRect.top + listRect.height / 2;

    let closest     = cards[0];
    let closestDist = Infinity;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;
      const dist = Math.abs(cardCenterY - centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = card;
      }
    });

    // Scroll so this card's center aligns with list center
    const cardRect     = closest.getBoundingClientRect();
    const cardCenter   = this.list.scrollTop + (cardRect.top - listRect.top) + cardRect.height / 2;
    const targetScroll = cardCenter - this.list.offsetHeight / 2;

    this.list.scrollTo({ top: targetScroll, behavior: "smooth" });
  }

  _scrollToCard(index, behavior = "smooth") {
    if (!this.list) return;
    const cards = this.list.querySelectorAll(".menu-card");
    const card  = cards[index];
    if (!card) return;

    // Use getBoundingClientRect for accurate position
    const listRect  = this.list.getBoundingClientRect();
    const cardRect  = card.getBoundingClientRect();
    const cardCenter = this.list.scrollTop + (cardRect.top - listRect.top) + cardRect.height / 2;
    const target    = cardCenter - this.list.offsetHeight / 2;

    this.list.scrollTo({ top: target, behavior });
  }
}

export default Menu;
