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

  /* ── Contact form ── */
  document
    .getElementById("contact-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      closeContactForm();
    });

  /* ── About page ── */
  buildAboutContent();
  initAboutScroll();
  initAboutWordReveal();

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
    window.closeContactForm?.();
    window.closeAboutPage?.();
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

/* ── Contact form (called from inline onclick) ── */
window.openContactForm = function () {
  const sp = document.getElementById("contact-overlay");
  sp.classList.add("is-open");
  sp.setAttribute("aria-hidden", "false");
  sp.scrollTop = 0;
};

window.closeContactForm = function () {
  const sp = document.getElementById("contact-overlay");
  sp.classList.remove("is-open");
  sp.setAttribute("aria-hidden", "true");
};

/* ── About page (called from inline onclick) ── */
window.openAboutPage = function () {
  const sp = document.getElementById("about-overlay");
  sp.classList.add("is-open");
  sp.setAttribute("aria-hidden", "false");
  const scroll = document.getElementById("about-scroll");
  if (scroll) scroll.scrollTop = 0;
};

window.closeAboutPage = function () {
  const sp = document.getElementById("about-overlay");
  sp.classList.remove("is-open");
  sp.setAttribute("aria-hidden", "true");
};

/* ── About page copy ── */
const ABOUT_LEAD = "Vom gelben Pfannenwender zum Whackofatz";
const ABOUT_PARAGRAPHS = [
  `Die Karriere von Dr.Bohl begann fernab großer Bühnen. Für ein Geburtstagsvideo erfand Paulus Bohl verschiedene Wiener Charaktere, während sein Bruder Benjamin die Interviews führte – mit einem gelben Pfannenwender als improvisiertem Mikrofon. Aus dem privaten Scherz entwickelte sich ein unverwechselbares Comedy-Format. Spätestens mit dem viralen Video „Studenten in den Sommerferien“ erreichten die Brüder ein größeres Publikum auf Facebook, Instagram, YouTube und später TikTok.`,
  `Im Jänner 2020 wagten Paulus und Benjamin den Schritt auf die Bühne. Vor Familie, Freunden und Wegbegleitern spielten sie ihr erstes Programm „Dr.Bohl – Live!“ im Keller ihrer ehemaligen Schule. Aus dem Experiment wurden ausverkaufte Vorstellungen. Noch im selben Jahr starteten sie den Podcast „Bohlmobil“, in dem ihre persönliche Dynamik und ihr spontaner Humor stärker in den Mittelpunkt rückten.`,
  `Mit „ANABOHLIKA“, das 2023 im Wiener Stadtsaal Premiere feierte, gelang der Sprung auf größere Kabarettbühnen. Die bekannten Figuren wurden weiterentwickelt, die Inszenierung aufwendiger und Dr.Bohl zunehmend zu einer eigenständigen Unterhaltungsmarke. Auftritte bei Ö3, ORF, FM4 und PULS 4 erweiterten die Reichweite über Social Media hinaus.`,
  `2025 präsentierte Paulus mit „SOLO“ sein drittes Kabarettprogramm und erstmals einen Abend ohne Benjamin als Bühnenpartner. Seine Teilnahme bei „Dancing Stars“, wo er den zweiten Platz erreichte, machte ihn schließlich einem breiten österreichischen Fernsehpublikum bekannt.`,
  `Mit Bohl Entertainment folgte der nächste konsequente Schritt: Aus Kurzvideos, Podcast und Kabarett entstand ein Unternehmen für Medien, Social Content, Markenkooperationen und eigene Entertainment-Formate. Dr.Bohl steht heute für den erfolgreichen Übergang von digitaler Kreativität zu professioneller Medienproduktion.`,
];

function buildAboutContent() {
  const body = document.getElementById("about-body");
  if (!body || body.dataset.filled) return;
  const maxSpreadMs = 480;

  function splitWords(text) {
    const words = text.split(/\s+/).filter(Boolean);
    const step = Math.min(24, maxSpreadMs / words.length);
    return words
      .map(
        (w, j) =>
          `<span class="word" style="transition-delay:${Math.round(j * step)}ms">${w}</span>`,
      )
      .join(" ");
  }

  let html = `<p class="about-overlay__lead">${splitWords(ABOUT_LEAD)}</p>`;
  ABOUT_PARAGRAPHS.forEach((para) => {
    html += `<p>${splitWords(para)}</p>`;
  });
  body.innerHTML = html;
  body.dataset.filled = "true";
}

/* ── About page: stagger-reveal each paragraph's words as it scrolls into view ── */
function initAboutWordReveal() {
  const body = document.getElementById("about-body");
  const scrollEl = document.getElementById("about-scroll");
  if (!body || !scrollEl || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target
          .querySelectorAll(".word")
          .forEach((w) => w.classList.add("is-in"));
        observer.unobserve(entry.target);
      });
    },
    { root: scrollEl, rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
  );

  body.querySelectorAll("p").forEach((p) => observer.observe(p));
}

/* ── About page scroll: paragraphs fade/scale into the sticky header's vignette ── */
function initAboutScroll() {
  const scrollEl = document.getElementById("about-scroll");
  const header = document.querySelector(".about-overlay__header");
  const body = document.getElementById("about-body");
  if (!scrollEl || !header || !body) return;

  const fadeZone = 60;
  let ticking = false;

  function update() {
    const headerBottom = header.getBoundingClientRect().bottom;
    const threshold = headerBottom + fadeZone;
    body.querySelectorAll("p").forEach((p) => {
      const bottom = p.getBoundingClientRect().bottom;
      let t;
      if (bottom >= threshold) t = 1;
      else if (bottom <= headerBottom) t = 0;
      else t = (bottom - headerBottom) / fadeZone;
      p.style.opacity = t;
      p.style.transform = `scale(${0.92 + t * 0.08})`;
    });
    ticking = false;
  }

  scrollEl.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );
  update();
}
