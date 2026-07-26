/**
 * DR.BOHL — MAIN.JS
 * App entry point. Wires Slider, Menu, fitText, Tour Dates, and UI helpers.
 */

"use strict";

import Slider from "./slider.js";
import Menu from "./menu.js";
import { renderTourDates } from "./tourDates.js";
import {
  fitText,
  updateProgressNav,
  updateSlideCounter,
  dismissSwipeHint,
} from "./animations.js";

document.addEventListener("DOMContentLoaded", () => {
  /* ── Slider ── */
  const slider = new Slider({
    onSlideChange: (index) => {
      updateProgressNav(index);
      updateSlideCounter(index, slider.totalSlides);
      menu.onSlideChange(index);
      dismissSwipeHint();
    },
  });

  updateProgressNav(slider.index);
  updateSlideCounter(slider.index, slider.totalSlides);

  /* ── Menu ── */
  const menu = new Menu(slider);
  menu.onSlideChange(slider.index);

  /* ── Progress nav clicks ── */
  document.querySelectorAll(".progress-nav__item").forEach((item, i) => {
    item.addEventListener("click", () => slider.goTo(i));
  });

  /* ── Desktop arrows ── */
  document
    .getElementById("arrow-prev")
    ?.addEventListener("click", () => slider.prev());
  document
    .getElementById("arrow-next")
    ?.addEventListener("click", () => slider.next());

  /* ── Tour Dates ── */
  renderTourDates(document.getElementById("tour-list"));

  /* ── Tour overlay open/close ── */
  window.openTourDates = async () => {
    const overlay = document.getElementById("tour-overlay");
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    overlay.scrollTop = 0;
  };

  window.closeTourDates = () => {
    const overlay = document.getElementById("tour-overlay");
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  };

  /* ── Generic subpage ── */
  document
    .getElementById("subpage-back")
    ?.addEventListener("click", closeSubpage);

  /* ── fitText ── */
  document.fonts.ready.then(() => {
    fitText();
    setTimeout(fitText, 120);
  });
  window.addEventListener("resize", fitText);

  /* ── ESC closes everything ── */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    menu.close();
    closeSubpage();
    window.closeTourDates?.();
  });
});

/* ── Generic subpage (called from inline onclick) ── */
window.openSubpage = function (title, body) {
  const sp = document.getElementById("subpage-overlay");
  document.getElementById("subpage-title").textContent = title;
  document.getElementById("subpage-body").textContent = body;
  sp.classList.add("is-open");
  sp.setAttribute("aria-hidden", "false");
  sp.scrollTop = 0;
};

window.closeSubpage = function () {
  const sp = document.getElementById("subpage-overlay");
  sp.classList.remove("is-open");
  sp.setAttribute("aria-hidden", "true");
};
