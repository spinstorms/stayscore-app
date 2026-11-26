#!/usr/bin/env node
/**
 * Saves a copy of the StayOdds data into assets/data/ so the app opens instantly, even offline,
 * on first launch. The app then refreshes from the live data in the background.
 *
 * Runs automatically on every EAS build (the "eas-build-post-install" script in package.json)
 * and in GitHub Actions. If the network fails, the existing files are kept, so a build never breaks.
 *
 *   node scripts/snapshot-data.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'data');
mkdirSync(outDir, { recursive: true });

const brand = readFileSync(join(root, 'lib', 'brand.ts'), 'utf8');
const pick = (k) => brand.match(new RegExp(`${k}:\\s*'([^']+)'`))?.[1];
const SB_URL = pick('supabaseUrl');
const SB_KEY = pick('supabasePublishableKey');
const LIVE = pick('liveApiBaseUrl');
const INSIGHTS = 'https://stayodds.com/insights/';

async function sbSelect(table) {
  const all = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?select=*&limit=1000&offset=${offset}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
    const page = await res.json();
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}
const json = async (url, fallback) => {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    return r.ok ? await r.json() : fallback;
  } catch {
    return fallback;
  }
};
const save = (name, data) => {
  const file = join(outDir, name);
  writeFileSync(file, JSON.stringify(data));
  console.log(`snapshot: wrote ${name} (${(JSON.stringify(data).length / 1e6).toFixed(2)} MB)`);
};

async function main() {
  // Hotel directory (required tables first; optional ones fall back to empty, like the app does)
  try {
    const props = await sbSelect('properties');
    const opt = (t) => sbSelect(t).catch(() => []);
    const [facts, fhReviews, licensedScores, awards, editorial, ytReviews, bookingLinks] = await Promise.all([
      opt('property_facts'),
      opt('first_hand_reviews'),
      opt('licensed_guest_scores'),
      opt('official_awards'),
      opt('editorial_ratings'),
      opt('youtube_reviews'),
      opt('booking_links'),
    ]);
    const [videosRes, affRes] = await Promise.all([
      json(`${LIVE}/data/videos.json`, { videos: [], shorts: [] }),
      json(`${LIVE}/data/affiliates.json`, { curated: [], fromVideos: [] }),
    ]);
    if (props.length) {
      save('snapshot.json', {
        snapshotAt: new Date().toISOString(),
        props, facts, fhReviews, licensedScores, awards, editorial, ytReviews, bookingLinks, videosRes, affRes,
      });
    }
  } catch (e) {
    console.warn(`snapshot: directory not refreshed (${e.message}); keeping the existing copy`);
  }

  const ranks = await json(`${LIVE}/data/guest-ranks.json`, null);
  if (ranks?.ranks) save('guest-ranks.json', ranks);
  else console.warn('snapshot: guest ranks not refreshed; keeping the existing copy');

  try {
    const html = await (await fetch(INSIGHTS)).text();
    const m = html.match(/const D\s*=\s*(\{[\s\S]*?\});\s*\n/);
    if (!m) throw new Error('data not found in page');
    const d = JSON.parse(m[1]);
    const up = html.match(/StayOdds insights\s*·\s*updated\s*([^<]+)</);
    if (up) d.updated = up[1].trim();
    const nh = html.match(/What\s+([\d,]+)\s+luxury hotels look like/);
    if (nh) d.nHotels = nh[1];
    save('insights.json', d);
  } catch (e) {
    console.warn(`snapshot: insights not refreshed (${e.message}); keeping the existing copy`);
  }
}

main().catch((e) => {
  console.warn(`snapshot: skipped (${e.message})`);
});
