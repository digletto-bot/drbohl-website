/**
 * DR.BOHL — TOUR DATES
 * Tour dates are fetched from a Google Sheet with the following headers:
 * date | venue | city | url
 *
 * Date format from Google Sheets CSV export: M/D/YYYY (e.g. "8/15/2026")
 */

const SHEET_ID  = "1FlTrb6sJF1E4SqeKiYqBpwigV_2vvrUOejRe1unINQk";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

/**
 * Parses a M/D/YYYY date string from Google Sheets into display parts.
 * @param {string} dateStr - e.g. "8/15/2026"
 * @returns {{ day: string, month: string, year: string }}
 */
function parseSheetDate(dateStr) {
  const [month, day, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date

  return {
    day:   new Intl.DateTimeFormat("de-DE", { day:   "numeric" }).format(date), // "15"
    month: new Intl.DateTimeFormat("de-DE", { month: "short"   }).format(date), // "Aug."
    year:  new Intl.DateTimeFormat("de-DE", { year:  "numeric" }).format(date), // "2026"
  };
}

/**
 * Fetches and parses tour dates from Google Sheets CSV.
 * @returns {Promise<Array>}
 */
async function fetchTourDates() {
  const res  = await fetch(SHEET_URL);
  const text = await res.text();

  // Skip header row
  const rows = text.trim().split("\n").slice(1);
  if (!rows.length) throw new Error("No tour dates found");

  return rows.map(parseCSVRow);
}

/**
 * Renders tour date rows into a container element.
 * @param {HTMLElement} container
 */
export async function renderTourDates(container) {
  if (!container) return;

  try {
    const tourDates = await fetchTourDates();

    container.innerHTML = tourDates
      .map(([dateStr, venue, city, url]) => {
        const { day, month, year } = parseSheetDate(dateStr);

        const isSoldOut = url === "sold-out";
        const btnEl = isSoldOut
          ? `<span class="td-btn sold-out">Ausverkauft</span>`
          : `<a href="${url}" class="td-btn" target="_blank" rel="noopener" aria-label="Tickets für ${venue}">Tickets</a>`;

        return `
        <div class="td-row">
          <div class="td-date">
            <span class="td-day">${day}</span>
            <span class="td-mon">${month} ${year}</span>
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
 * Robust CSV row parser — handles commas inside quoted fields.
 * @param {string} row
 * @returns {string[]}
 */
function parseCSVRow(row) {
  const result = [];
  let current  = "";
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
