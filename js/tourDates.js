/**
 * DR.BOHL — TOUR DATES
 * Tour dates are fetched from a Google Sheet with the following headers:
 * date | venue | city | url | state | note
 *
 * Date format from Google Sheets CSV export: M/D/YYYY (e.g. "8/15/2026")
 */

const SHEET_ID = '1FlTrb6sJF1E4SqeKiYqBpwigV_2vvrUOejRe1unINQk';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

/**
 * Fetches and parses tour dates from Google Sheets CSV.
 * @returns {Promise<Array>}
 */
async function fetchTourDates() {
	const res = await fetch(SHEET_URL);
	const text = await res.text();

	// Skip header row
	const rows = text.trim().split('\n').slice(1);
	if (!rows.length) throw new Error('No tour dates found');

	return rows.map(parseCSVRow);
}

const LOADING_HTML = `
  <div class="td-loading">
    <svg class="td-loading__spinner" viewBox="0 0 48 48" width="64" height="64" aria-hidden="true">
      <circle class="td-loading__spinner-track" cx="24" cy="24" r="20" fill="none" stroke-width="3"/>
      <circle class="td-loading__spinner-arc" cx="24" cy="24" r="20" fill="none" stroke-width="3"/>
    </svg>
  </div>`;

/**
 * Renders tour date rows into a container element. Shows a loading spinner
 * while the sheet is fetched, since this is only called on demand (when the
 * Tour Dates subpage is actually opened) rather than eagerly on page load.
 * @param {HTMLElement} container
 */
export async function renderTourDates(container) {
	if (!container) return;
	container.innerHTML = LOADING_HTML;
	try {
		const tourDates = await fetchTourDates();

		container.innerHTML = tourDates
			.map(([dateStr, venue, city, url, stateNr, note]) => {
				const { day, month, year } = parseSheetDate(dateStr);

				let btnClass, btnContent;
				switch (stateNr) {
					case '1':
						btnClass = 'td-btn rest';
						btnContent = 'Tickets';
						break;
					case '2':
						btnClass = 'td-btn sold-out';
						btnContent = 'Ausverkauft';
						break;
					default:
						btnClass = 'td-btn';
						btnContent = 'Tickets';
				}

				const btnEl = `<a href="${url}" class="${btnClass}" target="_blank" rel="noopener" aria-label="Tickets für ${venue}" draggable="false">${btnContent}</a>`;

				return `
        <div class="td-row">
          <div class="td-time">
            <span class="td-date">${day}.${month}.</span>
            <span class="td-year">${year}</span>
          </div>
          <div class="td-location">
            <div class="td-city">${city}</div>
            <div class="td-venue">${venue}</div>
          </div>
          <div class="td-note desktop-only">${note}</div>
          ${btnEl}
        </div>`;
			})
			.join('');
	} catch (error) {
		console.error(error);
		container.innerHTML = `
      <div style="padding:40px 24px;color:#a0a09a;font-family:var(--font-body);font-size:14px;letter-spacing:.04em">
        Termine konnten nicht geladen werden.<br>Bitte die Seite neu laden, oder später nochmal versuchen.
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
	let current = '';
	let inQuotes = false;

	for (const char of row) {
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim().replace(/^"|"$/g, '').trim());
			current = '';
		} else {
			current += char;
		}
	}
	result.push(current.trim().replace(/^"|"$/g, '').trim());
	return result;
}

/**
 * Parses a M/D/YYYY date string from Google Sheets into display parts.
 * @param {string} dateStr - e.g. "8/15/2026"
 * @returns {{ day: string, month: string, year: string }}
 */
function parseSheetDate(dateStr) {
	const [month, day, year] = dateStr.split('/').map(Number);
	const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date

	return {
		day: new Intl.DateTimeFormat('de-DE', { day: 'numeric' })
			.format(date)
			.padStart(2, '0'), // "15"
		month: new Intl.DateTimeFormat('de-DE', { month: 'numeric' })
			.format(date)
			.padStart(2, '0'), // "Aug."
		year: new Intl.DateTimeFormat('de-DE', { year: 'numeric' }).format(date), // "2026"
	};
}
