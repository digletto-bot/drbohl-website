/**
 * DR.BOHL — ANIMATIONS.JS
 * fitText: scales every headline line to fill full available width on ONE line.
 */

'use strict';

const SIDE_PAD = 24;

/**
 * fitText — every .title-card__headline-line gets scaled to exactly fill
 * (card width − 2×padding) on a single line, regardless of data attributes.
 * All lines use data-fit="true" behaviour — max size, no wrapping.
 */
export function fitText() {
  const track  = document.getElementById('slider-track');
  const availW = (track ? track.offsetWidth : window.innerWidth) - SIDE_PAD * 2;

  document.querySelectorAll('.title-card__headline-line').forEach(el => {
    // Seed at large size, measure, then scale to fit exactly
    el.style.fontSize = '120px';
    const ratio = availW / el.scrollWidth;
    // Apply, but never exceed 120px (already the seed)
    el.style.fontSize = Math.min(Math.floor(120 * ratio), 120) + 'px';
  });
}

export function updateProgressNav(index) {
  document.querySelectorAll('.progress-nav__item').forEach((item, i) => {
    item.classList.toggle('is-active', i === index);
    item.setAttribute('aria-current', i === index ? 'true' : 'false');
  });
}

export function updateSlideCounter(index, total) {
  const el = document.getElementById('slide-counter');
  if (el) el.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
}

export function dismissSwipeHint() {
  const h = document.querySelector('.swipe-hint');
  if (h) { h.style.animation = 'none'; h.style.opacity = '0'; h.style.transition = 'opacity .3s ease'; }
}
