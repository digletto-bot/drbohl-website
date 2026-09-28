/**
 * Fetches like / view / share counts for the Instagram reels embedded in
 * index.html and writes them to assets/data/reel-stats.json, which
 * js/reelEmbeds.js renders as the icon row above each embed.
 *
 * Sources, in order:
 *   1. Instagram Graph API — the official route, and the ONLY one that can
 *      return views and shares. Needs the account owner's credentials:
 *        IG_ACCESS_TOKEN  long-lived token for the Instagram professional
 *                         account (permissions: instagram_basic,
 *                         instagram_manage_insights)
 *        IG_USER_ID       that account's Instagram user id
 *      (Untested — written against the Graph API docs, no token was
 *      available while building it.)
 *   2. Public reel page (og:description) — what a link preview sees. Gives
 *      likes only, rounded ("89K"). Views and shares are not public.
 *
 * Rules:
 *   - A value is only overwritten by a successfully fetched, non-null one, so
 *     numbers typed into the JSON by hand (e.g. views/shares copied from
 *     Instagram Insights) survive until the API supplies them.
 *   - Never fails the build: any error leaves the existing JSON untouched.
 *
 * Run:  node scripts/fetch-reel-stats.mjs
 */
import fs from 'node:fs/promises';

const HTML = 'index.html';
const OUT = 'assets/data/reel-stats.json';
const UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uagent.php)';
const GRAPH = 'https://graph.facebook.com/v21.0';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function reelIds() {
	const html = await fs.readFile(HTML, 'utf8');
	const ids = [...html.matchAll(/data-instgrm-permalink="https:\/\/www\.instagram\.com\/reel\/([^/?"]+)/g)].map(
		(m) => m[1],
	);
	return [...new Set(ids)];
}

/** "89K" → 89000, "1.2M" → 1200000, "1,234" → 1234 */
function parseCount(raw) {
	const m = /^([\d.,]+)\s*([KM])?$/i.exec(raw.trim());
	if (!m) return null;
	const suffix = (m[2] || '').toUpperCase();
	if (!suffix) return Number(m[1].replace(/[.,]/g, ''));
	return Math.round(Number(m[1].replace(',', '.')) * (suffix === 'K' ? 1e3 : 1e6));
}

async function fromPublicPage(id) {
	const res = await fetch(`https://www.instagram.com/reel/${id}/`, {
		headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const html = await res.text();
	const desc = /property="og:description" content="([^"]*)"/.exec(html)?.[1] ?? '';
	const likes = /^([\d.,]+\s*[KM]?)\s+likes?\b/i.exec(desc);
	return { likes: likes ? parseCount(likes[1]) : null };
}

async function graphJson(url) {
	const json = await (await fetch(url)).json();
	if (json.error) throw new Error(json.error.message);
	return json;
}

async function fromGraphApi(ids) {
	const token = process.env.IG_ACCESS_TOKEN;
	const user = process.env.IG_USER_ID;
	const media = {};
	let url = `${GRAPH}/${user}/media?fields=id,permalink,like_count&limit=100&access_token=${token}`;
	for (let page = 0; url && page < 20; page++) {
		const json = await graphJson(url);
		for (const m of json.data ?? []) {
			const code = /\/(?:reel|p)\/([^/?]+)/.exec(m.permalink ?? '')?.[1];
			if (code) media[code] = m;
		}
		if (ids.every((id) => media[id])) break;
		url = json.paging?.next;
	}
	const out = {};
	for (const id of ids) {
		const m = media[id];
		if (!m) continue;
		out[id] = { likes: m.like_count ?? null };
		// One metric per request: a single unsupported metric would otherwise
		// fail the whole call.
		for (const metric of ['views', 'shares']) {
			try {
				const json = await graphJson(`${GRAPH}/${m.id}/insights?metric=${metric}&access_token=${token}`);
				const d = json.data?.[0];
				out[id][metric] = d?.values?.[0]?.value ?? d?.total_value?.value ?? null;
			} catch (e) {
				console.warn(`  ${id}: ${metric} unavailable (${e.message})`);
			}
		}
	}
	return out;
}

async function main() {
	const ids = await reelIds();
	let previous = { reels: {} };
	try {
		previous = JSON.parse(await fs.readFile(OUT, 'utf8'));
	} catch {}

	const fresh = {};
	if (process.env.IG_ACCESS_TOKEN && process.env.IG_USER_ID) {
		try {
			Object.assign(fresh, await fromGraphApi(ids));
			console.log(`Graph API: ${Object.keys(fresh).length}/${ids.length} reels`);
		} catch (e) {
			console.warn(`Graph API failed (${e.message}); falling back to public pages`);
		}
	}
	for (const id of ids) {
		if (fresh[id]?.likes != null) continue;
		try {
			fresh[id] = { ...fresh[id], ...(await fromPublicPage(id)) };
		} catch (e) {
			console.warn(`  ${id}: public page failed (${e.message})`);
		}
		await sleep(400);
	}

	const reels = {};
	for (const id of ids) {
		const old = previous.reels?.[id] ?? {};
		const now = fresh[id] ?? {};
		reels[id] = {
			views: now.views ?? old.views ?? null,
			likes: now.likes ?? old.likes ?? null,
			shares: now.shares ?? old.shares ?? null,
		};
	}
	const json = { updated: new Date().toISOString().slice(0, 10), reels };
	await fs.mkdir('assets/data', { recursive: true });
	await fs.writeFile(OUT, JSON.stringify(json, null, '\t') + '\n');
	console.log(`Wrote ${OUT} (${ids.length} reels)`);
}

main().catch((e) => console.warn(`Reel stats skipped: ${e.message}`));
