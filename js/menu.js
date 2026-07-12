/**
 * DR.BOHL — MENU.JS
 * Netflix-style vertical scroll wheel menu with snap-to-center,
 * active card highlight, vignette, and text fade-in.
 */

'use strict';

class Menu {
  constructor(slider) {
    this.slider   = slider;
    this.overlay  = document.getElementById('full-screen-menu');
    this.burger   = document.querySelector('.menu-button');
    this.closeBtn = document.getElementById('menu-close');
    this.list     = document.getElementById('menu-list');
    this.isOpen   = false;
    this._snapTimer = null;
    this._init();
  }

  _init() {
    this.burger  ?.addEventListener('click', () => this.toggle());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay  .addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
    document       .addEventListener('keydown', e => { if (e.key === 'Escape' && this.isOpen) this.close(); });

    // Card clicks
    this.list?.querySelectorAll('.menu-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        this.close();
        setTimeout(() => this.slider.goTo(i), 80);
      });
    });

    // Scroll → snap-to-center + active highlight
    this.list?.addEventListener('scroll', () => {
      this._updateActiveFromScroll();
      clearTimeout(this._snapTimer);
      this._snapTimer = setTimeout(() => this._snapToCenter(), 80);
    }, { passive: true });
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add('is-open');
    this.overlay.setAttribute('aria-hidden', 'false');
    this.burger?.classList.add('is-open');
    this.burger?.setAttribute('aria-expanded', 'true');
    this._updateActive(this.slider.index);
    // Scroll to active card after open animation
    setTimeout(() => this._scrollToCard(this.slider.index, 'auto'), 60);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove('is-open');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.burger?.classList.remove('is-open');
    this.burger?.setAttribute('aria-expanded', 'false');
  }

  onSlideChange(index) { this._updateActive(index); }

  _updateActive(index) {
    this.list?.querySelectorAll('.menu-card').forEach((card, i) => {
      card.classList.toggle('is-active', i === index);
    });
  }

  _updateActiveFromScroll() {
    if (!this.list) return;
    const centerY    = this.list.scrollTop + this.list.offsetHeight / 2;
    const cards      = Array.from(this.list.querySelectorAll('.menu-card'));
    let   closest    = 0;
    let   closestDist = Infinity;

    cards.forEach((card, i) => {
      const cardCenter = card.offsetTop + card.offsetHeight / 2;
      const dist       = Math.abs(cardCenter - centerY);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });

    cards.forEach((card, i) => card.classList.toggle('is-active', i === closest));
  }

  _snapToCenter() {
    if (!this.list) return;
    const centerY = this.list.scrollTop + this.list.offsetHeight / 2;
    const cards   = Array.from(this.list.querySelectorAll('.menu-card'));
    let   closest = cards[0];
    let   closestDist = Infinity;

    cards.forEach(card => {
      const cardCenter = card.offsetTop + card.offsetHeight / 2;
      const dist       = Math.abs(cardCenter - centerY);
      if (dist < closestDist) { closestDist = dist; closest = card; }
    });

    const targetScroll = closest.offsetTop + closest.offsetHeight / 2 - this.list.offsetHeight / 2;
    this.list.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }

  _scrollToCard(index, behavior = 'smooth') {
    if (!this.list) return;
    const cards = this.list.querySelectorAll('.menu-card');
    const card  = cards[index];
    if (!card) return;
    const targetScroll = card.offsetTop + card.offsetHeight / 2 - this.list.offsetHeight / 2;
    this.list.scrollTo({ top: targetScroll, behavior });
  }
}

export default Menu;
