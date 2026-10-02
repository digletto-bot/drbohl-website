/**
 * DR.BOHL — SHOWTIME CARDS
 * Cards with several links have a CTA button (aria-controls → panel) that
 * expands the card to list every option. Cards with one link use a plain
 * anchor and need no script.
 */

export function initShowCards() {
	document.addEventListener('click', (e) => {
		const btn = e.target.closest('.show-card__cta[aria-controls]');
		if (!btn) return;
		const card = btn.closest('.show-card');
		const open = !card.classList.contains('is-open');
		card.classList.toggle('is-open', open);
		btn.setAttribute('aria-expanded', String(open));
	});
}
