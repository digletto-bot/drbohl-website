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
 * Maps the sheet's header row to column indices, so rows are read by
 * NAME rather than by position. Reading positionally means inserting a
 * column anywhere but the end silently shifts every field after it.
 * Matching is loose (lowercased, first word only) because the real
 * headers carry inline documentation, e.g.
 * "state (0 = normal | 1 = restkarten | 2 = ausverkauft)".
 * @param {string} headerRow
 * @returns {Record<string, number>}
 */
function mapColumns(headerRow) {
	const cols = {};
	parseCSVRow(headerRow).forEach((name, i) => {
		const key = name.toLowerCase().trim().split(/[\s(]/)[0];
		if (key && !(key in cols)) cols[key] = i;
	});
	return cols;
}

/**
 * Fetches and parses tour dates from Google Sheets CSV.
 * @returns {Promise<Array<object>>}
 */
async function fetchTourDates() {
	const res = await fetch(SHEET_URL);
	const text = await res.text();

	const lines = text.trim().split('\n');
	const cols = mapColumns(lines[0]);
	const rows = lines.slice(1);
	if (!rows.length) throw new Error('No tour dates found');

	return rows.map((row) => {
		const cells = parseCSVRow(row);
		const at = (key) => (cols[key] !== undefined ? (cells[cols[key]] ?? '') : '');
		const city = at('city');
		const country = normaliseCountry(at('country'));
		return {
			date: at('date'),
			venue: at('venue'),
			city,
			url: at('url'),
			status: at('state'),
			// The note column has historically been used to mark the
			// country ("Deutschland"). The country now lives in its own
			// column and is surfaced only through the filter, so strip
			// any country value out of the note rather than rendering it
			// twice. Genuine notes are unaffected.
			note: stripCountryFromNote(at('note')),
			country,
			region: regionFor(city),
		};
	});
}

/**
 * City → Bundesland lookup, resolved once per row at render time.
 * Filtering afterwards is pure DOM (rows carry data-country,
 * data-region and data-city), so switching a filter never refetches
 * or re-renders.
 *
 * IMPORTANT: this map is necessarily incomplete — it only knows the
 * cities listed here. An unmapped city resolves to '' and is treated
 * as "region unknown": it still appears under its country and under
 * "Alle", it simply gets no region chip. A missing entry must never be
 * able to hide a real tour date.
 *
 * Keys are lowercased and umlaut-folded (see regionKey) so
 * "Köln" / "KÖLN" / "koeln" all match the same entry.
 */
const CITY_REGIONS = {
	// ── Österreich ──
	wien: 'Wien',
	graz: 'Steiermark',
	leoben: 'Steiermark',
	linz: 'Oberösterreich',
	wels: 'Oberösterreich',
	steyr: 'Oberösterreich',
	salzburg: 'Salzburg',
	innsbruck: 'Tirol',
	kitzbuehel: 'Tirol',
	kufstein: 'Tirol',
	dornbirn: 'Vorarlberg',
	bregenz: 'Vorarlberg',
	feldkirch: 'Vorarlberg',
	klagenfurt: 'Kärnten',
	villach: 'Kärnten',
	'wiener neustadt': 'Niederösterreich',
	'st. poelten': 'Niederösterreich',
	'sankt poelten': 'Niederösterreich',
	krems: 'Niederösterreich',
	baden: 'Niederösterreich',
	amstetten: 'Niederösterreich',
	eisenstadt: 'Burgenland',
	oberwart: 'Burgenland',

	// ── Deutschland ──
	berlin: 'Berlin',
	hamburg: 'Hamburg',
	bremen: 'Bremen',
	muenchen: 'Bayern',
	nuernberg: 'Bayern',
	augsburg: 'Bayern',
	regensburg: 'Bayern',
	wuerzburg: 'Bayern',
	stuttgart: 'Baden-Württemberg',
	karlsruhe: 'Baden-Württemberg',
	mannheim: 'Baden-Württemberg',
	freiburg: 'Baden-Württemberg',
	heidelberg: 'Baden-Württemberg',
	koeln: 'Nordrhein-Westfalen',
	duesseldorf: 'Nordrhein-Westfalen',
	dortmund: 'Nordrhein-Westfalen',
	essen: 'Nordrhein-Westfalen',
	bochum: 'Nordrhein-Westfalen',
	bonn: 'Nordrhein-Westfalen',
	muenster: 'Nordrhein-Westfalen',
	bielefeld: 'Nordrhein-Westfalen',
	wuppertal: 'Nordrhein-Westfalen',
	aachen: 'Nordrhein-Westfalen',
	frankfurt: 'Hessen',
	wiesbaden: 'Hessen',
	kassel: 'Hessen',
	darmstadt: 'Hessen',
	mainz: 'Rheinland-Pfalz',
	koblenz: 'Rheinland-Pfalz',
	trier: 'Rheinland-Pfalz',
	ludwigshafen: 'Rheinland-Pfalz',
	saarbruecken: 'Saarland',
	dresden: 'Sachsen',
	leipzig: 'Sachsen',
	chemnitz: 'Sachsen',
	magdeburg: 'Sachsen-Anhalt',
	halle: 'Sachsen-Anhalt',
	erfurt: 'Thüringen',
	jena: 'Thüringen',
	weimar: 'Thüringen',
	potsdam: 'Brandenburg',
	cottbus: 'Brandenburg',
	hannover: 'Niedersachsen',
	braunschweig: 'Niedersachsen',
	osnabrueck: 'Niedersachsen',
	oldenburg: 'Niedersachsen',
	goettingen: 'Niedersachsen',
	kiel: 'Schleswig-Holstein',
	luebeck: 'Schleswig-Holstein',
	flensburg: 'Schleswig-Holstein',
	rostock: 'Mecklenburg-Vorpommern',
	schwerin: 'Mecklenburg-Vorpommern',
};

/**
 * Normalises a city name for map lookup: lowercase, umlauts folded,
 * punctuation stripped. Spaces are kept so multi-word cities match.
 * @param {string} city
 * @returns {string}
 */
function regionKey(city) {
	return (city || '')
		.toLowerCase()
		.trim()
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.replace(/[^a-z0-9. ]/g, '')
		.replace(/\s+/g, ' ');
}

/**
 * @param {string} city
 * @returns {string} Bundesland, or '' when the city isn't mapped.
 */
function regionFor(city) {
	return CITY_REGIONS[regionKey(city)] || '';
}

/**
 * Accepts either ISO-ish codes or the German country names, since
 * whoever maintains the sheet may reasonably type either.
 * @param {string} raw
 * @returns {'AT'|'DE'|''}
 */
function normaliseCountry(raw) {
	const v = (raw || '').trim().toLowerCase();
	if (!v) return '';
	if (v === 'at' || v.startsWith('öster') || v.startsWith('oster') || v === 'austria') return 'AT';
	if (v === 'de' || v.startsWith('deutsch') || v === 'germany') return 'DE';
	return '';
}

/**
 * @param {string} note
 * @returns {string} '' when the note is only a country name.
 */
function stripCountryFromNote(note) {
	return normaliseCountry(note) ? '' : (note || '').trim();
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
			.map(({ date, venue, city, url, status, note, country, region }) => {
				const { day, month, year } = parseSheetDate(date);

				let btnClass, btnContent;
				switch (status) {
					case '1':
						btnClass = 'td-btn rest';
						btnContent = 'Restverkauf';
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
        <div class="td-row" data-country="${country}" data-region="${region}" data-city="${city}">
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

		// Wire the filter only after rows exist — it builds its options
		// by reading the rendered rows, so it must not run earlier.
		initTourFilter(container);
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

/* ══════════════════════════════════════════════════════════
   FILTER — three cascading multi-select fold-outs
   Land → Bundesland → Stadt.

   Each control holds a SET of values; an empty set means "Alle".
   Tapping an option toggles it (panel stays open so several can be
   picked); tapping "Alle" clears the set. Selecting in a parent
   narrows which options the children offer, and any child selection
   that no longer exists under the new parent set is pruned.

   Filtering is pure DOM — every row carries data-country,
   data-region and data-city — so it never refetches or re-renders.
   NOTE: hiding relies on the global `[hidden] { display: none
   !important }` in base.css; without it `.td-row { display: grid }`
   overrides the attribute and nothing visibly filters.
   ══════════════════════════════════════════════════════════ */

const COUNTRY_LABELS = { AT: 'Österreich', DE: 'Deutschland' };
const ALL = '__all__';

class TourSelect {
	/**
	 * @param {HTMLElement} root - the .td-select wrapper
	 * @param {() => void} onChange - called after any selection change
	 * @param {(value: string) => string} [labelFor] - display label per value
	 */
	constructor(root, onChange, labelFor = (v) => v) {
		this.root = root;
		this.button = root.querySelector('.td-select__button');
		this.label = root.querySelector('.td-select__value');
		this.panel = root.querySelector('.td-select__panel');
		this.onChange = onChange;
		this.labelFor = labelFor;
		/** @type {Set<string>} empty = all */
		this.values = new Set();
		this.options = [];
		this.allLabel = root.dataset.allLabel || 'Alle';
		this.panel.setAttribute('aria-multiselectable', 'true');

		this.button.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggle();
		});

		this.panel.addEventListener('click', (e) => {
			e.stopPropagation();
			const opt = e.target.closest('.td-option');
			if (!opt) return;
			const v = opt.dataset.value;
			if (v === ALL) {
				this.values.clear();
			} else if (this.values.has(v)) {
				this.values.delete(v);
			} else {
				this.values.add(v);
			}
			// Every option picked is the same as none picked.
			if (this.values.size && this.values.size === this.options.length) this.values.clear();
			this.sync();
			this.onChange();
		});

		this.root.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.isOpen()) {
				e.stopPropagation();
				this.close();
				this.button.focus();
			}
		});
	}

	isOpen() {
		return this.root.classList.contains('is-open');
	}
	toggle() {
		this.isOpen() ? this.close() : this.open();
	}
	open() {
		TourSelect.closeAll(this);
		this.root.classList.add('is-open');
		this.button.setAttribute('aria-expanded', 'true');
	}
	close() {
		this.root.classList.remove('is-open');
		this.button.setAttribute('aria-expanded', 'false');
	}

	/** Row test: empty set passes everything. */
	accepts(value) {
		return !this.values.size || this.values.has(value);
	}

	/** Reflects this.values onto the option buttons and the label. */
	sync() {
		const none = !this.values.size;
		this.panel.querySelectorAll('.td-option').forEach((o) => {
			const on = o.dataset.value === ALL ? none : this.values.has(o.dataset.value);
			o.classList.toggle('is-active', on);
			o.setAttribute('aria-selected', String(on));
		});
		const picked = [...this.values];
		this.label.textContent = none
			? this.allLabel
			: picked.length === 1
				? this.labelFor(picked[0])
				: `${this.labelFor(picked[0])} +${picked.length - 1}`;
		this.root.classList.toggle('is-filtered', !none);
	}

	/**
	 * Rebuilds the options; drops any selected value no longer offered.
	 * @param {string[]} options
	 */
	setOptions(options) {
		this.options = options;
		this.panel.innerHTML =
			option(ALL, this.allLabel) + options.map((o) => option(o, this.labelFor(o))).join('');
		this.values.forEach((v) => {
			if (!options.includes(v)) this.values.delete(v);
		});
		this.sync();
		// A control offering only "all" is not a choice worth showing.
		this.root.hidden = options.length < 1;
	}
}

TourSelect.instances = [];
TourSelect.closeAll = function (except) {
	TourSelect.instances.forEach((s) => {
		if (s !== except) s.close();
	});
};

function option(value, label) {
	return `<button type="button" class="td-option" role="option" aria-selected="false" data-value="${escapeAttr(value)}"><span class="td-option__check" aria-hidden="true"></span>${label}</button>`;
}

function escapeAttr(v) {
	return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

let outsideClickBound = false;

/**
 * Wires up the filter for an already-rendered list.
 * @param {HTMLElement} container - the .td-list element
 */
export function initTourFilter(container) {
	const filter = document.getElementById('tour-filter');
	if (!container || !filter) return;

	const rows = Array.from(container.querySelectorAll('.td-row'));
	if (!rows.length) return;

	const data = rows.map((row) => ({
		row,
		country: row.dataset.country || '',
		region: row.dataset.region || '',
		city: row.dataset.city || '',
	}));

	const countryEl = filter.querySelector('[data-select="country"]');
	const regionEl = filter.querySelector('[data-select="region"]');
	const cityEl = filter.querySelector('[data-select="city"]');
	if (!countryEl || !regionEl || !cityEl) return;

	const countrySel = new TourSelect(
		countryEl,
		() => {
			refreshDependent();
			apply();
		},
		(v) => COUNTRY_LABELS[v] || v,
	);
	const regionSel = new TourSelect(regionEl, () => {
		refreshCities();
		apply();
	});
	const citySel = new TourSelect(cityEl, apply);
	TourSelect.instances = [countrySel, regionSel, citySel];

	if (!outsideClickBound) {
		outsideClickBound = true;
		document.addEventListener('click', (e) => {
			if (!e.target.closest('.td-select')) TourSelect.closeAll(null);
		});
	}

	const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));

	const countries = uniq(data.map((d) => d.country));
	countrySel.setOptions(countries);
	countryEl.hidden = countries.length < 2;

	const inCountry = (d) => countrySel.accepts(d.country);
	const inRegion = (d) => regionSel.accepts(d.region);

	function refreshDependent() {
		regionSel.setOptions(uniq(data.filter(inCountry).map((d) => d.region)));
		refreshCities();
	}
	function refreshCities() {
		citySel.setOptions(uniq(data.filter((d) => inCountry(d) && inRegion(d)).map((d) => d.city)));
	}

	function apply() {
		let visible = 0;
		data.forEach((d) => {
			const show = inCountry(d) && inRegion(d) && citySel.accepts(d.city);
			d.row.hidden = !show;
			if (show) visible++;
		});

		let empty = container.querySelector('.td-empty');
		if (!visible) {
			if (!empty) {
				empty = document.createElement('div');
				empty.className = 'td-empty';
				empty.textContent = 'Für diese Auswahl gibt es aktuell keine Termine.';
				container.appendChild(empty);
			}
			empty.hidden = false;
		} else if (empty) {
			empty.hidden = true;
		}
	}

	refreshDependent();
	apply();
	filter.hidden = false;
}
