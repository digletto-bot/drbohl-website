/**
 * DR.BOHL — TOUR DATES
 * Add, edit or remove shows here.
 * Each entry: [day, month, year, venue, city, ticketUrl]
 * Set ticketUrl to "#" for placeholder, "sold-out" to show sold out state.
 */

export const TOUR_DATES = [
  ["15", "Aug", "2026", "Stadtsaal Wien",                    "Wien, AT",              "#"],
  ["22", "Aug", "2026", "Orpheum Graz",                      "Graz, AT",              "#"],
  ["05", "Sep", "2026", "Posthof Linz",                      "Linz, AT",              "#"],
  ["12", "Sep", "2026", "Kulisse Wien",                      "Wien, AT",              "#"],
  ["19", "Sep", "2026", "Dornbirner Kulturhaus",             "Dornbirn, AT",          "#"],
  ["26", "Sep", "2026", "Stadttheater Wiener Neustadt",      "Wiener Neustadt, AT",   "#"],
  ["03", "Okt", "2026", "Bürgerhaus Stollwerck",             "Köln, DE",              "#"],
  ["10", "Okt", "2026", "Laeiszhalle Hamburg",               "Hamburg, DE",           "#"],
];

/**
 * Renders tour date rows into a container element.
 * @param {HTMLElement} container
 */
export function renderTourDates(container) {
  if (!container) return;

  container.innerHTML = TOUR_DATES.map(([day, mon, yr, venue, city, url]) => {
    const isSoldOut = url === 'sold-out';
    const btnClass  = isSoldOut ? 'td-btn sold-out' : 'td-btn';
    const btnText   = isSoldOut ? 'Ausverkauft' : 'Tickets';
    const btnEl     = isSoldOut
      ? `<span class="${btnClass}">${btnText}</span>`
      : `<a href="${url}" class="${btnClass}" target="_blank" rel="noopener" aria-label="Tickets für ${venue}">${btnText}</a>`;

    return `
    <div class="td-row">
      <div class="td-date">
        <span class="td-day">${day}</span>
        <span class="td-mon">${mon} ${yr}</span>
      </div>
      <div class="td-info">
        <div class="td-venue">${venue}</div>
        <div class="td-city">${city}</div>
      </div>
      ${btnEl}
    </div>`;
  }).join('');
}
