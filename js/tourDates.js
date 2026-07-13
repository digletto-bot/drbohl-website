/**
 * DR.BOHL — TOUR DATES
 * Add, edit or remove shows here.
 * Each entry: [day, month, year, venue, city, ticketUrl]
 * Set ticketUrl to "#" for placeholder, "sold-out" to show sold out state.
 */

const SHEET_ID = "1FlTrb6sJF1E4SqeKiYqBpwigV_2vvrUOejRe1unINQk";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

export async function fetchTourDates() {
  const data = await fetch(SHEET_URL);
  const text = await data.text();

  // Parse CSV — skip header row
  const rows = text.trim().split("\n").slice(1);
  const res = rows.map((row) => {
    // Google wraps values in quotes — strip them
    const [day, month, year, venue, city, url] = row
      .split(",")
      .map((v) => v.replace(/^"|"$/g, "").trim());
    return [day, month, year, venue, city, url];
  });

  if (!res.length) throw "No tour dates found";
  return res;
}

/**
 * Renders tour date rows into a container element.
 * @param {HTMLElement} container
 */
export async function renderTourDates(container) {
  console.log("fetching tour dates");
  if (!container) return;

  try {
    const tourDates = await fetchTourDates();
    container.innerHTML = tourDates
      .map(([day, mon, yr, venue, city, url]) => {
        const isSoldOut = url === "sold-out";
        const btnClass = isSoldOut ? "td-btn sold-out" : "td-btn";
        const btnText = isSoldOut ? "Ausverkauft" : "Tickets";
        const btnEl = isSoldOut
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
      })
      .join("");
  } catch (error) {
    // TODO: Implement error handling
    console.error(error);
  }
}
