/**
 * DR.BOHL — TOUR DATES
 * Tour dates are fetched from Google Sheet with the following headers:
 * day | month | year | venue | city | ticket url
 */

const SHEET_ID = "1FlTrb6sJF1E4SqeKiYqBpwigV_2vvrUOejRe1unINQk";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

async function fetchTourDates() {
  const data = await fetch(SHEET_URL);
  const text = await data.text();

  // Parse CSV — skip header row
  const rows = text.trim().split("\n").slice(1);
  const res = rows.map(parseCSVRow);

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
    console.error(error);
    container.innerHTML = `
      <div style="padding:40px 24px;color:#a0a09a;font-family:var(--fb);font-size:14px;letter-spacing:.04em">
        Termine konnten nicht geladen werden.<br>Bitte später nochmal versuchen.
      </div>`;
  }
}

/**
 * Custom parser to convert from CSV while retaining commas
 * @param {string} row
 * @returns {string}
 */
function parseCSVRow(row) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (const char of row) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, "").trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, "").trim());
  return result;
}
