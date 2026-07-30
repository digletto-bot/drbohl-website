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
  /* ── Sliders: outer (title cards) + inner (subpage cards), kept in sync ── */
  const slider = new Slider({
    onSlideChange: (index) => {
      updateProgressNav(index);
      updateSlideCounter(index, slider.totalSlides);
      menu.onSlideChange(index);
      dismissSwipeHint();
      subpageSlider.goTo(index);
    },
  });

  const subpageSlider = new Slider({
    trackId: "subpage-slider-track",
    cardSelector: ".subpage-card",
    bindKeyboard: false,
    onSlideChange: (index) => {
      slider.goTo(index);
    },
  });

  updateProgressNav(slider.index);
  updateSlideCounter(slider.index, slider.totalSlides);

  /* ── Menu ── */
  const menu = new Menu(slider);
  menu.onSlideChange(slider.index);

  /* ── Progress nav clicks (title-card navbar + subpage-overlay navbar) ── */
  document.querySelectorAll(".progress-nav").forEach((nav) => {
    nav.querySelectorAll(".progress-nav__item").forEach((item, i) => {
      item.addEventListener("click", () => slider.goTo(i));
    });
  });

  /* ── Desktop arrows ── */
  document
    .getElementById("arrow-prev")
    ?.addEventListener("click", () => slider.prev());
  document
    .getElementById("arrow-next")
    ?.addEventListener("click", () => slider.next());

  /* ── Tour Dates (subpage card 0) ── */
  renderTourDates(document.getElementById("tour-list"));

  /* ── Contact form (subpage card 8) ── */
  document.getElementById("contact-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    closeSubpage();
  });

  /* ── About view (nested inside subpage card 8) ── */
  buildAboutContent();
  initAboutScroll();
  initAboutWordReveal();

  window.goToTickets = () => subpageSlider.goTo(0);

  function setViewToggle(activeView) {
    document.querySelectorAll(".view-toggle__item").forEach((btn) => {
      const isActive = btn.dataset.view === activeView;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  window.showContactView = () => {
    document.getElementById("contact-view")?.classList.add("is-active");
    document.getElementById("about-view")?.classList.remove("is-active");
    setViewToggle("contact");
  };
  window.showAboutView = () => {
    document.getElementById("about-view")?.classList.add("is-active");
    document.getElementById("contact-view")?.classList.remove("is-active");
    setViewToggle("about");
    const card = document.getElementById("subpage-card-contact");
    if (card) card.scrollTop = 0;
    // Was measured while display:none (zero geometry); re-measure now it's visible.
    requestAnimationFrame(updateAboutFade);
  };
  window.openContactForm = () => {
    showContactView();
    openSubpage();
  };
  window.openAboutPage = () => {
    showAboutView();
    openSubpage();
  };

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
  });
});

/* ── Subpage overlay (single unified container; called from inline onclick) ── */
window.openSubpage = function () {
  const sp = document.getElementById("subpage-overlay");
  sp.classList.add("is-open");
  sp.setAttribute("aria-hidden", "false");
  document.querySelector(".subpage-card.is-current")?.scrollTo(0, 0);
};

window.closeSubpage = function () {
  const sp = document.getElementById("subpage-overlay");
  document.activeElement.blur();
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

/* ── About view: stagger-reveal each paragraph's words as it scrolls into view ── */
function initAboutWordReveal() {
  const body = document.getElementById("about-body");
  const scrollEl = document.getElementById("subpage-card-contact");
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

/* ── About view scroll: paragraphs fade/scale into the sticky header's vignette ── */
let updateAboutFade = () => {};

function initAboutScroll() {
  const scrollEl = document.getElementById("subpage-card-contact");
  const header = document.querySelector(".about-overlay__header");
  const body = document.getElementById("about-body");
  if (!scrollEl || !header || !body) return;

  const fadeZone = 36;
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
  updateAboutFade = update;

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

/* ── Bohl Entertainment brochure: scroll-reveal (subpage card 7) ── */
function initBrochureReveal() {
  const card = document.querySelector('.subpage-card[data-index="7"]');
  if (!card) return;
  const els = card.querySelectorAll(".be-reveal");
  if (!els.length) return;

  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { root: card, threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );

  els.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    io.observe(el);
  });
}
initBrochureReveal();
