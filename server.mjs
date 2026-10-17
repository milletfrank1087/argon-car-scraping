import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import {
  LAW_VERSION,
  VEHICLE_CATEGORIES,
  COUNTRY_CONFIG,
  FACTORY_OPTIONS_CATALOG,
  calculateGreekImport,
} from './greek-import-calc.mjs';
import {
  cleanVin,
  decodeVin,
  buildFreeVinHistoryDossier,
  runDeepVehicleResearch,
  inspectListingPage,
  parseOlxAdvertDetail,
  parseSautoItemDetail,
  lookupDutchRdwByKenteken,
  scanHtmlForVinAndSpecs,
} from './vin-decoder.mjs';

let latestAggregatedListings = [];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const CZK_PER_EUR = 25.25;
const PLN_PER_EUR = 4.28;
const RON_PER_EUR = 4.97;

let browser = null;
let context = null;
let initPromise = null;

const warmPages = {
  cargr: null,
  theparking: null,
  autoscout24: null,
  mobilede: null,
  autouncle: null,
  sautocz: null,
  willhaben: null,
  subito: null,
  otomoto: null,
  autovit: null,
  standvirtual: null,
  marktplaats: null,
  tweedehands: null,
  autobazar: null,
  coches: null,
};

const caches = {
  as24BuildId: null,
  mobileMakes: null,
  mobileModelsByMake: new Map(),
};

/**
 * Normalizes numeric integer from strings like "69.000 χλμ", "91,465 km", "€ 52,990"
 */
function parseDigits(str) {
  if (str == null) return null;
  if (typeof str === 'number') return str;
  const cleaned = String(str)
    .replace(/¹|²|³/g, '')
    .replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : null;
}

/**
 * Extracts 4-digit year (1950-2030) from registration strings like "09/2018", "EZ 06/2024", "2019"
 */
function parseYear(str, fallback = null) {
  if (!str) return fallback;
  const m = String(str).match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  return m ? Number(m[1]) : fallback;
}

/**
 * Computes days on market from ISO "YYYY-MM-DD" or European "DD/MM/YYYY" date strings
 */
function computeDaysOnMarket(dateStr) {
  if (!dateStr) return null;
  let ms = NaN;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/');
    ms = Date.parse(`${y}-${m}-${d}T00:00:00Z`);
  } else {
    ms = Date.parse(String(dateStr).replace(' ', 'T'));
  }
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.round((Date.now() - ms) / (1000 * 60 * 60 * 24)));
}

/**
 * Splits a free-text car query like "ford mustang", "bmw i8", or "mercedes amg gt"
 * into normalized { raw, makeSlug, modelSlug, fullSlug, modelTokens }
 */
function parseMakeModelQuery(query) {
  const parts = String(query)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  let makeSlug = parts[0] || 'bmw';
  let rest = parts.slice(1);

  if (makeSlug === 'mercedes' || makeSlug === 'mercedes-benz') {
    makeSlug = 'mercedes-benz';
  } else if (makeSlug === 'alfa' && rest[0] === 'romeo') {
    makeSlug = 'alfa-romeo';
    rest = rest.slice(1);
  } else if (makeSlug === 'land' && rest[0] === 'rover') {
    makeSlug = 'land-rover';
    rest = rest.slice(1);
  } else if (makeSlug === 'aston' && rest[0] === 'martin') {
    makeSlug = 'aston-martin';
    rest = rest.slice(1);
  } else if (makeSlug === 'vw') {
    makeSlug = 'volkswagen';
  }

  const modelSlug = rest.join('-') || '';
  return {
    raw: String(query).trim(),
    makeSlug,
    modelSlug,
    fullSlug: [makeSlug, modelSlug].filter(Boolean).join('-'),
    modelTokens: rest.filter((t) => t.length >= 2),
  };
}

/**
 * Guards free-text & slug searches against crossover sub-models (Mustang Mach-E),
 * spare parts / lease installments (< €3,500), and unrelated vehicles that only mention
 * the model name in the dealer description.
 */
function isRelevantVehicleListing(item, query) {
  if (!item || typeof item.priceEur !== 'number' || item.priceEur < 3500) {
    return false;
  }
  const haystack = `${item.title || ''} ${item.variant || ''}`.toLowerCase();
  // Reject dealer "Wanted / We Buy Your Car" (Inkoop / Verkopen?) ads that are not vehicles for sale
  if (
    /\b(uw\s+[\w\s-]{1,20}\s+verkopen\?|wij\s+kopen|auto\s+inkoop|inkoop\s+van|gezocht\s*:|wir\s+kaufen\s+ihren|skup\s+aut)\b/i.test(
      haystack
    )
  ) {
    return false;
  }
  if (!/mach/i.test(query) && /mach[\s-]*e\b/i.test(haystack)) {
    return false;
  }
  const { makeSlug, modelTokens } = parseMakeModelQuery(query);
  const makeCheckToken = makeSlug.split('-')[0];
  if (makeCheckToken && makeCheckToken.length >= 3 && !haystack.includes(makeCheckToken)) {
    // Allow if primary model token is very distinctive (e.g. i8, mustang)
    if (modelTokens.length === 0 || !haystack.includes(modelTokens[0])) {
      return false;
    }
  }
  if (modelTokens.length > 0) {
    const primaryToken = modelTokens[0];
    if (!haystack.includes(primaryToken)) {
      return false;
    }
  }
  return true;
}

/**
 * Enriches each listing with Greek Customs & Import Cost (ν. 5222/2025 + ν. 5313/2026)
 * and ranks the cohort by composite Value Score (0-100):
 * - Total Landed Price in Greece vs cohort range (40%)
 * - Mileage vs cohort range (30%, with placeholder-mileage detection on older cars)
 * - Model Year vs cohort range (20%)
 * - Provenance / Seller / Deal badges (up to 10%)
 */
/**
 * Batch-fetches detail HTML pages in parallel inside a portal's warm Playwright tab
 * to scan for 17-character VINs, license plates (including Dutch RDW Kenteken),
 * exact MM/YYYY registration dates, CO2 (g/km), and ΑΑΔΕ Α.1043/2025 factory options.
 */
class BoundedMap extends Map {
  constructor(maxEntries = 300) {
    super();
    this.maxEntries = maxEntries;
  }
  set(key, value) {
    if (this.has(key)) this.delete(key);
    super.set(key, value);
    if (this.size > this.maxEntries) {
      const oldestKey = this.keys().next().value;
      if (oldestKey !== undefined) this.delete(oldestKey);
    }
    return this;
  }
}

const adDetailCache = new BoundedMap(300);
const olxDetailCache = new BoundedMap(300);
const sautoDetailCache = new BoundedMap(300);

function applyScannedDetailToItem(item, scanned) {
  if (!scanned) return;
  if (scanned.vin && !item.vin) {
    item.vin = scanned.vin;
    item.decodedVin = scanned.decodedVin;
    item._needsImportRecalc = true;
  }
  if (scanned.licensePlate && !item.licensePlate) {
    item.licensePlate = scanned.licensePlate;
  }
  if (scanned.registration && (!item.registration || /^\d{4}$/.test(String(item.registration)))) {
    item.registration = scanned.registration;
    item._needsImportRecalc = true;
  }
  if (scanned.registrationFullDate && !item.registrationFullDate) {
    item.registrationFullDate = scanned.registrationFullDate;
    item._needsImportRecalc = true;
  }
  if (scanned.co2 != null && item.co2 == null) {
    item.co2 = scanned.co2;
    item._needsImportRecalc = true;
  }
  if (scanned.cc && !item.cc) {
    item.cc = scanned.cc;
    item._needsImportRecalc = true;
  }
  if (scanned.seats && !item.seats) {
    item.seats = scanned.seats;
    item._needsImportRecalc = true;
  }
  if (scanned.rdwCatalogPriceEur && !item.rdwCatalogPriceEur) {
    item.rdwCatalogPriceEur = scanned.rdwCatalogPriceEur;
    item._needsImportRecalc = true;
  }
  if (scanned.detectedOptionIds?.length && !item.detectedOptionIds?.length) {
    item.detectedOptionIds = scanned.detectedOptionIds;
    item._needsImportRecalc = true;
  }
}

async function enrichPortalListingsWithDetails(page, listings, maxItems = 6) {
  if (!page || page.isClosed() || !Array.isArray(listings) || listings.length === 0) return;
  const targets = listings.slice(0, maxItems).filter((x) => x.url && /^https?:\/\//i.test(x.url));
  if (targets.length === 0) return;

  const uncachedTargets = [];
  for (const item of targets) {
    if (adDetailCache.has(item.url)) {
      applyScannedDetailToItem(item, adDetailCache.get(item.url));
    } else {
      uncachedTargets.push(item);
    }
  }
  if (uncachedTargets.length === 0) return;

  try {
    const htmlByUrl = await page.evaluate(async (urls) => {
      const out = {};
      await Promise.all(
        urls.map(async (u) => {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2200);
            const r = await fetch(u, { signal: ctrl.signal });
            clearTimeout(timer);
            if (r.ok) {
              out[u] = await r.text();
            }
          } catch {}
        })
      );
      return out;
    }, uncachedTargets.map((x) => x.url));

    await Promise.all(
      uncachedTargets.map(async (item) => {
        const html = htmlByUrl?.[item.url];
        if (!html) return;
        const scanned = await scanHtmlForVinAndSpecs(html);
        if (!scanned) return;
        if (scanned.licensePlate && (item.country === 'NL' || item.marketplace === 'marktplaats.nl')) {
          const rdw = await lookupDutchRdwByKenteken(scanned.licensePlate);
          if (rdw) {
            if (rdw.registration) scanned.registration = rdw.registration;
            if (rdw.registrationFullDate) scanned.registrationFullDate = rdw.registrationFullDate;
            if (rdw.cc) scanned.cc = rdw.cc;
            if (rdw.co2 != null && scanned.co2 == null) scanned.co2 = rdw.co2;
            if (rdw.seats) scanned.seats = rdw.seats;
            if (rdw.rdwCatalogPriceEur) scanned.rdwCatalogPriceEur = rdw.rdwCatalogPriceEur;
          }
        }
        adDetailCache.set(item.url, scanned);
        applyScannedDetailToItem(item, scanned);
      })
    );
  } catch {
    // Non-fatal if detail enrichment times out
  }
}

export function scoreAndRankListings(listings, query = '') {
  const currentYear = new Date().getFullYear();
  for (const item of listings) {
    if (!item.greekImport || item._needsImportRecalc) {
      item.greekImport = calculateGreekImport(item, query);
      item.landedGreeceEur = item.greekImport?.totalLandedGreeceEur ?? item.priceEur;
      item._needsImportRecalc = false;
    }
  }

  const valid = listings.filter(
    (x) => typeof x.priceEur === 'number' && x.priceEur > 1000 && !x.crashed
  );
  if (valid.length === 0) return listings;

  const effectiveKm = (x) => {
    if (x.mileageKm == null) return 110000;
    if ((x.year ?? currentYear) <= currentYear - 3 && x.mileageKm > 0 && x.mileageKm <= 500) {
      return x.mileageKm * 1000;
    }
    return x.mileageKm;
  };

  const landedPrices = valid.map((x) => x.landedGreeceEur ?? x.priceEur);
  const kms = valid.map((x) => effectiveKm(x));
  const years = valid.map((x) => x.year ?? 2016);

  const minPrice = Math.min(...landedPrices);
  const maxPrice = Math.max(...landedPrices);
  const minKm = Math.min(...kms);
  const maxKm = Math.max(...kms);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const norm = (val, min, max, invert = false) => {
    if (max === min) return 0.5;
    const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
    return invert ? 1 - ratio : ratio;
  };

  for (const item of listings) {
    if (typeof item.priceEur !== 'number' || item.priceEur <= 1000 || item.crashed) {
      item.valueScore = 0;
      continue;
    }
    const effKm = effectiveKm(item);
    if (effKm !== (item.mileageKm ?? 110000)) {
      item.placeholderMileageWarning = `Listed as ${item.mileageKm} km on a ${item.year} car (scored as ${effKm.toLocaleString()} km)`;
    }
    const landed = item.landedGreeceEur ?? item.priceEur;
    const priceScore = norm(landed, minPrice, maxPrice, true) * 40;
    const kmScore = norm(effKm, minKm, maxKm, true) * 30;
    const yearScore = norm(item.year ?? minYear, minYear, maxYear, false) * 20;

    let bonus = 0;
    if (item.negotiable) bonus += 2.5;
    if (item.inspectedBadge || item.accidentFree) bonus += 3.5;
    if (item.sellerType === 'Private' || item.sellerType === 'Guest') bonus += 2;
    if (item.dealRating && /super|sehr gut|gut|fair/i.test(item.dealRating)) bonus += 2;

    item.valueScore = Math.round((priceScore + kmScore + yearScore + bonus) * 10) / 10;
  }

  return [...listings].sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0));
}

let idleBrowserTimer = null;
const CLOUD_IDLE_SLEEP_MS = 5 * 60 * 1000;

function touchBrowserIdleTimer() {
  const isCloudLinux = process.platform === 'linux' && !process.env.DISPLAY;
  if (!isCloudLinux) return;
  if (idleBrowserTimer) clearTimeout(idleBrowserTimer);
  idleBrowserTimer = setTimeout(async () => {
    if (browser) {
      try {
        await browser.close();
      } catch {}
      browser = null;
      context = null;
      for (const k of Object.keys(warmPages)) warmPages[k] = null;
      console.log('[WarmSessions] Closed idle Chromium instance to free cloud container RAM.');
    }
  }, CLOUD_IDLE_SLEEP_MS);
  if (idleBrowserTimer.unref) idleBrowserTimer.unref();
}

/**
 * Boots a single low-memory Chrome instance using a 4-Tab Shared Worker Pool:
 * - 1 shared about:blank worker tab serves 12 European portals via --disable-web-security (zero navigation, zero SPA DOM)
 * - 3 stripped origin tabs serve cookie-gated portals (cargr, theparking, mobilede)
 */
export async function ensureWarmSessions(forceRestart = false) {
  touchBrowserIdleTimer();
  const allReady = Object.values(warmPages).every((p) => p && !p.isClosed());

  if (allReady && !forceRestart) {
    return warmPages;
  }
  if (initPromise && !forceRestart) {
    return initPromise;
  }

  initPromise = (async () => {
    const t0 = Date.now();
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    const canRunHeaded = process.platform !== 'linux' || Boolean(process.env.DISPLAY);
    const isCloudLinux = process.platform === 'linux' && !process.env.DISPLAY;
    const launchConfigs = [
      ...(canRunHeaded
        ? [
            { channel: 'chrome', headless: false },
            { channel: 'msedge', headless: false },
            { channel: undefined, headless: false },
          ]
        : []),
      { channel: 'chrome', headless: true },
      { channel: undefined, headless: true },
    ];

    // Ultra-Low-Memory Cloud Flags:
    // - --disable-web-security allows 12 of 15 portals to run cross-origin fetch() from a single about:blank tab
    // - --renderer-process-limit=2 caps total renderer OS processes across all 4 tabs to at most 2
    const memoryOptimizedArgs = [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--renderer-process-limit=2',
      '--disable-site-isolation-trials',
      '--disable-features=IsolateOrigins,site-per-process,TranslateUI,BlinkGenPropertyTrees',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-first-run',
    ];

    for (const cfg of launchConfigs) {
      try {
        browser = await chromium.launch({
          headless: cfg.headless,
          ...(cfg.channel ? { channel: cfg.channel } : {}),
          args: [
            ...memoryOptimizedArgs,
            ...(cfg.headless
              ? ['--headless=new', '--window-size=1280,720']
              : ['--window-position=-2400,-2400', '--window-size=1366,768']),
          ],
        });
        break;
      } catch {}
    }

    if (!browser) {
      throw new Error('Failed to launch Chromium. Run: npx playwright install chromium');
    }

    context = await browser.newContext({
      locale: 'en-US',
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      serviceWorkers: 'block',
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Block heavy binary assets (images, video/audio, fonts, stylesheets, websockets) and third-party trackers
    const BLOCKED_RESOURCE_TYPES = new Set([
      'image',
      'media',
      'font',
      'stylesheet',
      'websocket',
      'eventsource',
      'manifest',
    ]);
    const BLOCKED_TRACKER_RE = /(?:doubleclick\.net|googlesyndication\.com|google-analytics\.com|googletagmanager\.com|connect\.facebook\.net|criteo\.com|hotjar\.com|taboola\.com|outbrain\.com|adsystem\.com|adnxs\.com)/i;
    await context.route('**/*', (route) => {
      const req = route.request();
      if (BLOCKED_RESOURCE_TYPES.has(req.resourceType()) || BLOCKED_TRACKER_RE.test(req.url())) {
        return route.abort();
      }
      return route.continue();
    });

    const wrapPageEvaluateTimeout = (page, label) => {
      const origEvaluate = page.evaluate.bind(page);
      page.evaluate = (fn, arg) =>
        Promise.race([
          origEvaluate(fn, arg),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Tab ${label} evaluate timeout`)), 9500)
          ),
        ]);
      return page;
    };

    // 1. Create a SINGLE shared about:blank worker tab for all 12 CORS-free European portals!
    const sharedWorkerPage = wrapPageEvaluateTimeout(await context.newPage(), 'shared-worker');
    await sharedWorkerPage.goto('about:blank');

    const sharedPortals = [
      'autoscout24',
      'autouncle',
      'sautocz',
      'willhaben',
      'subito',
      'otomoto',
      'autovit',
      'standvirtual',
      'marktplaats',
      'tweedehands',
      'autobazar',
      'coches',
    ];
    for (const key of sharedPortals) {
      warmPages[key] = sharedWorkerPage;
    }

    // 2. Open only 3 origin-specific tabs for cookie-gated portals and strip their DOM immediately
    let extractedMobMakes = [];
    const warmOriginTask = async (key, url) => {
      const s0 = Date.now();
      const page = wrapPageEvaluateTimeout(await context.newPage(), key);
      warmPages[key] = page;
      try {
        const resp = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: isCloudLinux ? 9000 : 15000,
        });

        if (key === 'mobilede') {
          const mobInit = await page
            .evaluate(() => {
              const q = String.fromCharCode(34);
              const bs = String.fromCharCode(92);
              const scripts = [...document.querySelectorAll('script')].map((s) => s.textContent).join('');
              const idx = scripts.indexOf('Abarth');
              let makes = [];
              if (idx !== -1) {
                try {
                  const start = scripts.lastIndexOf('[', idx);
                  const end = scripts.indexOf(']', idx) + 1;
                  const raw = scripts.slice(start, end).split(bs + q).join(q);
                  makes = JSON.parse(raw);
                } catch {}
              }
              return { makes };
            })
            .catch(() => ({ makes: [] }));
          extractedMobMakes = mobInit?.makes || [];
        }

        // Shed 90%+ of tab DOM & SPA timer memory once origin/cookies are established
        await page
          .evaluate(() => {
            try {
              window.stop();
              const maxId = setTimeout(() => {}, 0);
              for (let i = 1; i <= maxId; i++) {
                clearTimeout(i);
                clearInterval(i);
              }
              if (document.documentElement) {
                document.documentElement.innerHTML = '<html><head></head><body>ok</body></html>';
              }
            } catch {}
          })
          .catch(() => {});

        return { key, status: resp?.status() || 200, ms: Date.now() - s0 };
      } catch (e) {
        return { key, status: 'ERR', ms: Date.now() - s0, err: e.message };
      }
    };

    const originTargets = [
      ['cargr', 'https://www.car.gr/used-cars/bmw/i8.html?category=15001&make=13687&model=15601'],
      ['theparking', 'https://www.theparking.eu/used-cars/bmw-i8.html'],
      ['mobilede', 'https://suchen.mobile.de/fahrzeuge/search.html?dam=false&isSearchRequest=true&ms=3500%3B%3B&s=Car&vc=Car'],
    ];

    const results = await Promise.all(originTargets.map(([k, u]) => warmOriginTask(k, u)));

    caches.mobileMakes = new Map();
    for (const m of extractedMobMakes) {
      caches.mobileMakes.set(m.n.toLowerCase(), String(m.i));
    }
    const defaultMakes = {
      bmw: '3500',
      ford: '9000',
      porsche: '20100',
      audi: '1900',
      'mercedes-benz': '17200',
      mercedes: '17200',
      volkswagen: '25200',
      vw: '25200',
      ferrari: '8600',
      lamborghini: '14600',
      toyota: '24100',
      tesla: '135',
    };
    for (const [k, v] of Object.entries(defaultMakes)) {
      if (!caches.mobileMakes.has(k)) caches.mobileMakes.set(k, v);
    }

    console.log(
      `[WarmSessions] All 15 EU marketplaces ready in ${Date.now() - t0}ms:`,
      results.map((r) => `${r.key}=${r.status}(${r.ms}ms)`).join(', ')
    );
    return warmPages;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * 1. CAR.GR Warm Search (~400-500ms — Greece Domestic Benchmark)
 */
export async function searchCarGr(
  query,
  { sort = '', perPage = 24, minYear = '', maxPrice = '', maxKm = '' } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();

  const rawResult = await warmPages.cargr.evaluate(
    async ({ q, sortParam, limit, minY, maxP, maxM }) => {
      const s1 = performance.now();
      const r1 = await fetch('https://www.car.gr/api/searchbar/actions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!r1.ok) return { errorStatus: r1.status, step: 'searchbar/actions' };
      const j1 = await r1.json();
      const primary = j1?.data?.[0]?.actions?.[0];
      const step1Ms = Math.round(performance.now() - s1);

      if (!primary?.url?.includes('?')) {
        return { notFound: true, step1Ms };
      }

      const [, rawQuery] = primary.url.split('?');
      const sp = new URLSearchParams(rawQuery);
      sp.set('per-page', String(limit));
      sp.set('only-results', '1');
      if (sortParam) sp.set('sort', sortParam);
      if (minY) sp.set('registration-from', `>=${minY}`);
      if (maxP) sp.set('price-to', `<=${maxP}`);
      if (maxM) sp.set('mileage-to', `<=${maxM}`);

      const s2 = performance.now();
      const r2 = await fetch(`https://www.car.gr/api/clsfds/search/?${sp.toString()}`, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'request-domain': 'www.car.gr',
          site: 'car',
          timezone: 'Europe/Athens',
        },
        referrer: `https://www.car.gr${primary.url}`,
      });
      if (!r2.ok) return { errorStatus: r2.status, step: 'clsfds/search' };
      const j2 = await r2.json();
      return {
        ok: true,
        step1Ms,
        step2Ms: Math.round(performance.now() - s2),
        resolvedTitle: primary.title,
        rows: j2?.data?.results?.rows || [],
      };
    },
    { q: query, sortParam: sort, limit: perPage, minY: minYear, maxP: maxPrice, maxM: maxKm }
  );

  if (rawResult?.errorStatus) {
    throw new Error(`car.gr HTTP ${rawResult.errorStatus} at ${rawResult.step}`);
  }

  const listings = (rawResult?.rows || [])
    .map((x) => {
      const hpStr = x.key_features?.find((f) => f.key === 'engine_power')?.value || null;
      const year = parseYear(x.registration, x.title_parts?.year);
      const mileageKm = parseDigits(x.mileage);
      return {
        marketplace: 'car.gr',
        country: 'GR',
        id: String(x.id),
        title: x.title,
        variant: x.title_parts?.variant || null,
        year,
        registration: x.registration,
        priceEur: x.raw_price,
        priceFormatted: x.price,
        negotiable: Boolean(x.price_debatable),
        mileageKm,
        mileageFormatted: x.mileage,
        powerHp: parseDigits(hpStr),
        fuelType: x.fueltype,
        gearbox: x.key_features?.find((f) => f.key === 'gearbox_type')?.value || null,
        sellerType: x.seller?.type === 'Guest' ? 'Private' : 'Dealer',
        sellerName: x.seller?.name || 'Private Seller',
        location: x.address_long,
        firstListedDate: x.created?.slice(0, 10) || null,
        daysOnMarket: computeDaysOnMarket(x.created),
        inspectedBadge: Boolean(x.has_certificate),
        accidentFree: !x.crashed,
        crashed: Boolean(x.crashed),
        thumbnail: x.thumb || null,
        url: `https://www.car.gr${x.seo_url}`,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'car.gr',
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 2. AUTOSCOUT24.COM Warm Search (~300-450ms via /_next/data/ JSON endpoint)
 */
export async function searchAutoScout24(
  query,
  { minYear = '', maxPrice = '', maxKm = '', onStage1 = null } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const { makeSlug, modelSlug } = parseMakeModelQuery(query);

  const rawResult = await warmPages.autoscout24.evaluate(
    async ({ buildId, make, model, minY, maxP, maxM }) => {
      const sp = new URLSearchParams({
        sort: 'standard',
        desc: '0',
        ustate: 'N,U',
        atype: 'C',
      });
      if (minY) sp.set('fregfrom', String(minY));
      if (maxP) sp.set('priceto', String(maxP));
      if (maxM) sp.set('kmto', String(maxM));

      if (buildId) {
        const jsonUrl = `https://www.autoscout24.com/_next/data/${buildId}/lst/${make}/${model}.json?${sp.toString()}&make=${make}&model=${model}`;
        const r = await fetch(jsonUrl, { headers: { Accept: 'application/json' } });
        if (r.ok) {
          const j = await r.json();
          if (j?.pageProps?.listings) {
            return {
              mode: 'next-data-json',
              totalResults: j.pageProps.numberOfResults,
              listings: j.pageProps.listings,
            };
          }
        }
      }

      const htmlUrl = `https://www.autoscout24.com/lst/${make}/${model}?${sp.toString()}`;
      const rHtml = await fetch(htmlUrl);
      if (!rHtml.ok) return { errorStatus: rHtml.status };
      const html = await rHtml.text();
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      const nd = m ? JSON.parse(m[1]) : {};
      return {
        mode: 'html-next-data',
        totalResults: nd?.props?.pageProps?.numberOfResults || 0,
        listings: nd?.props?.pageProps?.listings || [],
      };
    },
    {
      buildId: caches.as24BuildId,
      make: makeSlug,
      model: modelSlug,
      minY: minYear,
      maxP: maxPrice,
      maxM: maxKm,
    }
  );

  if (rawResult?.errorStatus) {
    throw new Error(`autoscout24.com HTTP ${rawResult.errorStatus}`);
  }

  const listings = (rawResult?.listings || [])
    .map((x) => {
      const regDetail =
        x.vehicleDetails?.find((d) => d.iconName === 'calendar')?.data || null;
      const powerDetail =
        x.vehicleDetails?.find((d) => d.iconName === 'speedometer')?.data || null;
      const hpMatch = powerDetail ? powerDetail.match(/\((\d+)\s*hp\)/i) : null;
      const mileageStr =
        x.vehicle?.mileageInKm ||
        x.vehicleDetails?.find((d) => d.iconName === 'mileage_odometer')?.data ||
        null;

      return {
        marketplace: 'autoscout24.com',
        country: x.location?.countryCode || 'EU',
        id: x.id,
        title: `${x.vehicle?.make || ''} ${x.vehicle?.model || ''} ${x.vehicle?.modelVersionInput || x.vehicle?.variant || ''}`.trim(),
        variant: x.vehicle?.modelVersionInput || x.vehicle?.variant || null,
        year: parseYear(regDetail),
        registration: regDetail,
        priceEur: x.price?.priceRaw ?? parseDigits(x.price?.priceFormatted),
        priceFormatted: x.price?.priceFormatted || null,
        negotiable: false,
        mileageKm: parseDigits(mileageStr),
        mileageFormatted: mileageStr,
        powerHp: hpMatch ? Number(hpMatch[1]) : null,
        fuelType: x.vehicle?.fuel || null,
        gearbox: x.vehicle?.transmission || null,
        sellerType: x.seller?.type === 'Dealer' ? 'Dealer' : 'Private',
        sellerName: x.seller?.companyName || x.seller?.contactName || x.seller?.type || 'Seller',
        location: `${x.location?.countryCode || ''} ${x.location?.zip || ''} ${x.location?.city || ''}`.trim(),
        dealRating: x.superDeal?.isEligible ? 'SuperDeal' : null,
        leadsDemand: x.statistics?.leadsRange || null,
        inspectedBadge: false,
        accidentFree: true,
        crashed: false,
        thumbnail: x.images?.[0] || null,
        url: `https://www.autoscout24.com${x.url}`,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (typeof onStage1 === 'function') {
    const preRanked = scoreAndRankListings(listings, query);
    onStage1({
      marketplace: 'autoscout24.com',
      stage: 1,
      enrichingDetails: true,
      tookMs: Date.now() - t0,
      count: listings.length,
      top3: preRanked.slice(0, 3),
      listings: preRanked,
    });
  }

  await enrichPortalListingsWithDetails(warmPages.autoscout24, listings, 6);
  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'autoscout24.com',
    mode: rawResult.mode,
    totalAvailableOnSite: rawResult.totalResults,
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 3. THEPARKING.EU Warm Search (~450ms pan-European meta-search)
 */
export async function searchTheParking(
  query,
  { minYear = '', maxPrice = '', maxKm = '' } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const { fullSlug } = parseMakeModelQuery(query);

  const rawResult = await warmPages.theparking.evaluate(async (slug) => {
    const url = `https://www.theparking.eu/used-cars/${slug}.html`;
    const r = await fetch(url);
    if (!r.ok) return { errorStatus: r.status };
    const html = await r.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const rows = [...doc.querySelectorAll('li.li-result')].map((li) => {
      const brand = li.querySelector('span.brand')?.textContent?.trim() || '';
      const subTitle = li.querySelector('span.sub-title')?.textContent?.trim() || '';
      const nowraps = [
        ...new Set(
          [...li.querySelectorAll('span.nowrap')]
            .map((s) => s.textContent.trim())
            .filter(Boolean)
        ),
      ].join(' ');

      const priceText = li.querySelector('p.prix')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const sellerType = li.querySelector('div.seller')?.textContent?.trim() || 'Dealer';
      const desc = li.querySelector('div.desc')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const dateListed = li.querySelector('p.btn-publication')?.textContent?.trim() || null;
      const country = li.querySelector('span.upper')?.textContent?.trim() || 'EU';

      const upperDivs = [...li.querySelectorAll('div.upper')].map((d) => d.textContent.trim());
      const [fuel, kmStr, yearStr, gearbox, zip] = upperDivs.slice(0, 5);

      const detailHref =
        li.querySelector('a.external[href*="/used-cars-detail/"]')?.getAttribute('href') ||
        li.querySelector('a.external[href*="/tools/"]')?.getAttribute('href') ||
        '';
      const partnerDomain =
        li.querySelector('a.external[href*="/L/"]')?.textContent?.trim() || null;
      const imgEl = li.querySelector('picture img, .figure img');
      const thumbSrc = imgEl?.getAttribute('src') || null;

      return {
        brand,
        subTitle,
        nowraps,
        priceText,
        sellerType,
        desc,
        dateListed,
        country,
        fuel,
        kmStr,
        yearStr,
        gearbox,
        zip,
        detailHref,
        partnerDomain,
        thumbSrc,
      };
    });

    return { ok: true, rows };
  }, fullSlug);

  if (rawResult?.errorStatus) {
    throw new Error(`theparking.eu HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.rows || [])
    .map((x, idx) => {
      const priceMainMatch = x.priceText.match(/([\d.,]+)\s*€/);
      const priceEur = priceMainMatch ? parseDigits(priceMainMatch[1]) : null;
      const year = parseYear(x.yearStr);
      const mileageKm = parseDigits(x.kmStr);
      const idMatch = x.detailHref.match(/\/([A-Z0-9]{7,10})(?:\/|\.html)/);

      return {
        marketplace: 'theparking.eu',
        partnerSite: x.partnerDomain,
        country: x.country,
        id: idMatch ? idMatch[1] : `tp-${idx + 1}`,
        title: `${x.brand} ${x.subTitle} ${x.nowraps}`.replace(/\s+/g, ' ').trim(),
        variant: x.desc || x.nowraps || null,
        year,
        registration: x.yearStr || null,
        priceEur,
        priceFormatted: priceEur ? `€ ${priceEur.toLocaleString('en-US')}` : x.priceText,
        negotiable: false,
        mileageKm,
        mileageFormatted: x.kmStr || null,
        powerHp: null,
        fuelType: x.fuel || null,
        gearbox: x.gearbox || null,
        sellerType: /private/i.test(x.sellerType) ? 'Private' : 'Dealer',
        sellerName: x.partnerDomain ? `${x.sellerType} (${x.partnerDomain})` : x.sellerType,
        location: `${x.country} ${x.zip || ''}`.trim(),
        firstListedDate: x.dateListed,
        daysOnMarket: computeDaysOnMarket(x.dateListed),
        inspectedBadge: false,
        accidentFree: true,
        crashed: false,
        thumbnail:
          x.thumbSrc && x.thumbSrc.startsWith('http') ? x.thumbSrc : null,
        url: x.detailHref ? `https://www.theparking.eu${x.detailHref}` : 'https://www.theparking.eu',
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'theparking.eu',
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * Resolves (makeId, modelId, msParam) for mobile.de dynamically.
 */
async function resolveMobileDeMakeModel(query) {
  const { makeSlug, modelSlug } = parseMakeModelQuery(query);
  const makeId =
    caches.mobileMakes?.get(makeSlug) ||
    caches.mobileMakes?.get(makeSlug.replace('-', ' ')) ||
    '3500';

  if (!modelSlug) return { makeId, modelId: '', msParam: `${makeId};;;` };

  if (!caches.mobileModelsByMake.has(makeId)) {
    const models = await warmPages.mobilede.evaluate(async (mId) => {
      const r = await fetch(
        `https://suchen.mobile.de/fahrzeuge/search.html?dam=false&isSearchRequest=true&ms=${mId}%3B%3B&s=Car&vc=Car`
      );
      if (!r.ok) return [];
      const html = await r.text();
      const idx = html.indexOf('modelsCache');
      if (idx === -1) return [];
      const slice = html.slice(idx, idx + 45000);
      const re = /\\"value\\":\\"([^"\\]+)\\",\\"label\\":\\"([^"\\]+)\\"/g;
      const list = [];
      let m;
      while ((m = re.exec(slice)) !== null) {
        list.push({ value: m[1], label: m[2] });
      }
      return list;
    }, makeId);
    caches.mobileModelsByMake.set(makeId, models);
  }

  const models = caches.mobileModelsByMake.get(makeId) || [];
  const normTarget = modelSlug.replace(/[-_\s]+/g, '').toLowerCase();
  const exact =
    models.find((m) => m.label.replace(/[-_\s]+/g, '').toLowerCase() === normTarget) ||
    models.find((m) => m.label.toLowerCase().includes(modelSlug.replace(/-/g, ' ')));

  if (!exact) return { makeId, modelId: '', msParam: `${makeId};;;` };
  if (exact.value.startsWith('group-')) {
    const groupId = exact.value.replace(/^group-/, '');
    return { makeId, modelId: exact.value, msParam: `${makeId};;${groupId};` };
  }
  return { makeId, modelId: exact.value, msParam: `${makeId};${exact.value};;` };
}

/**
 * 4. MOBILE.DE Warm Search (~460-900ms via warm Akamai session + DOMParser — Germany)
 */
export async function searchMobileDe(
  query,
  { minYear = '', maxPrice = '', maxKm = '' } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const { msParam } = await resolveMobileDeMakeModel(query);

  const rawResult = await warmPages.mobilede.evaluate(
    async ({ msVal, minY, maxP, maxM }) => {
      const sp = new URLSearchParams({
        dam: 'false',
        isSearchRequest: 'true',
        ms: msVal,
        s: 'Car',
        vc: 'Car',
      });
      if (minY) sp.set('fr', `${minY}:`);
      if (maxP) sp.set('p', `:${maxP}`);
      if (maxM) sp.set('ml', `:${maxM}`);

      const url = `https://suchen.mobile.de/fahrzeuge/search.html?${sp.toString()}`;
      const r = await fetch(url);
      if (!r.ok) return { errorStatus: r.status };
      const html = await r.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const seenIds = new Set();
      const cards = [];

      for (const a of doc.querySelectorAll('a[href*="details.html"]')) {
        const href = a.getAttribute('href') || '';
        const idMatch = href.match(/[?&]id=(\d+)/);
        const id = idMatch ? idMatch[1] : null;
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        const art = a.closest('article') || a.parentElement;
        if (!art) continue;

        const mainTitleEl = art.querySelector('[data-testid="listing-title-card-view"]');
        const subTitleEl = mainTitleEl?.nextElementSibling;
        const title =
          mainTitleEl?.textContent?.trim() ||
          art
            .querySelector('h2')
            ?.textContent?.replace(/^Gesponsert\s*/i, '')
            .trim() ||
          '';
        const subtitle = subTitleEl?.textContent?.trim() || '';
        const priceText =
          art.querySelector('[data-testid="price-label"]')?.textContent?.trim() || '';
        const attrsText =
          art.querySelector('[data-testid="listing-details-attributes"]')?.textContent?.trim() ||
          '';
        const sellerSpans = [
          ...art.querySelectorAll('[data-testid="seller-info"] span'),
        ]
          .map((s) => s.textContent.trim())
          .filter(Boolean);

        const priceSectionSpans = [
          ...art.querySelectorAll(
            '[data-testid*="price-section"] div, [data-testid*="price-section"] span'
          ),
        ]
          .map((s) => s.textContent.trim())
          .filter((t) => /preis|bewertung/i.test(t));

        const imgEl = art.querySelector('img');
        const thumbSrc = imgEl?.getAttribute('src') || null;

        cards.push({
          id,
          title,
          subtitle,
          priceText,
          dealRating: priceSectionSpans[0] || null,
          attrsText,
          sellerName: sellerSpans[0] || 'Seller',
          location: sellerSpans[1] || 'Germany',
          sellerRating: sellerSpans[2] || null,
          thumbSrc,
          href: href.startsWith('http') ? href : `https://suchen.mobile.de${href}`,
        });
      }

      return { ok: true, msParam: msVal, cards };
    },
    { msVal: msParam, minY: minYear, maxP: maxPrice, maxM: maxKm }
  );

  if (rawResult?.errorStatus) {
    throw new Error(`mobile.de HTTP ${rawResult.errorStatus}`);
  }

  const listings = (rawResult?.cards || [])
    .map((x) => {
      const parts = x.attrsText.split('•').map((s) => s.trim());
      const accidentFree = parts.some((p) => /unfallfrei/i.test(p));
      const ezPart = parts.find((p) => /EZ\s*\d{2}\/\d{4}|Neuwagen/i.test(p)) || null;
      const kmPart = parts.find((p) => /\bkm\b/i.test(p)) || null;
      const powerPart = parts.find((p) => /\bPS\b|\bkW\b/i.test(p)) || null;
      const fuelPart = parts[parts.length - 1] || null;
      const psMatch = powerPart ? powerPart.match(/\((\d+)\s*PS\)/i) : null;

      return {
        marketplace: 'mobile.de',
        country: 'DE',
        id: x.id,
        title: `${x.title} ${x.subtitle}`.trim(),
        variant: x.subtitle || null,
        year: /neuwagen/i.test(ezPart || '') ? new Date().getFullYear() : parseYear(ezPart),
        registration: ezPart ? ezPart.replace(/^EZ\s*/i, '') : null,
        priceEur: parseDigits(x.priceText),
        priceFormatted: x.priceText,
        dealRating: x.dealRating,
        negotiable: false,
        mileageKm: /neuwagen/i.test(ezPart || '') ? 10 : parseDigits(kmPart),
        mileageFormatted: kmPart,
        powerHp: psMatch ? Number(psMatch[1]) : null,
        fuelType: fuelPart,
        gearbox: null,
        sellerType: /privat/i.test(x.sellerName) ? 'Private' : 'Dealer',
        sellerName: x.sellerName,
        location: x.location,
        inspectedBadge: accidentFree,
        accidentFree,
        crashed: false,
        thumbnail: x.thumbSrc && x.thumbSrc.startsWith('http') ? x.thumbSrc : null,
        url: x.href,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'mobile.de',
    resolvedMsParam: rawResult.msParam,
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 5. AUTOUNCLE.DE Warm Search (~500ms — 14-Country Fair-Value Evaluator with exact CO2 g/km)
 */
export async function searchAutoUncleDe(
  query,
  { minYear = '', maxPrice = '', maxKm = '' } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const { makeSlug, modelSlug } = parseMakeModelQuery(query);
  const makeCap = makeSlug.toUpperCase() === 'BMW' || makeSlug.toUpperCase() === 'VW'
    ? makeSlug.toUpperCase()
    : makeSlug.charAt(0).toUpperCase() + makeSlug.slice(1);

  const rawResult = await warmPages.autouncle.evaluate(
    async ({ make, model }) => {
      const pathPart = model ? `${make}/${model}` : make;
      const url = `https://www.autouncle.de/de/gebrauchtwagen/${pathPart}`;
      const r = await fetch(url);
      if (!r.ok) return { errorStatus: r.status };
      const html = await r.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const cards = [...doc.querySelectorAll('article')].map((art) => {
        const text = art.textContent || '';
        const a = art.querySelector('a[href*="/de/d/"]');
        const href = a?.getAttribute('href') || '';
        const img = art.querySelector('img[src*="car_images"]');
        return {
          href,
          titleAlt: img?.getAttribute('alt') || a?.textContent?.slice(0, 90) || '',
          thumb: img?.getAttribute('src') || null,
          text: text.replace(/\s+/g, ' ').trim(),
        };
      });
      return { cards };
    },
    { make: makeCap, model: modelSlug }
  );

  if (rawResult?.errorStatus) {
    throw new Error(`autouncle.de HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.cards || [])
    .map((c, idx) => {
      const t = c.text;
      const priceMatches = [...t.matchAll(/(\d{1,3}(?:\.\d{3})+)\s*€/g)].map((m) => parseDigits(m[1]));
      const priceEur = priceMatches[0] || null;
      const kmMatch = t.match(/(\d{1,3}(?:\.\d{3})*)\s*km\b/i);
      const mileageKm = kmMatch ? parseDigits(kmMatch[1]) : null;
      const year = parseYear(c.titleAlt) || parseYear(t);
      const psMatch = t.match(/(\d{2,4})\s*PS\b/);
      const co2Match = t.match(/(\d{1,3})\s*g\s*CO2\/km/i) || t.match(/CO₂[^:]*:\s*(\d{1,3})\s*g\/km/i);
      const dealMatch = t.match(/(Superpreis|Sehr guter Preis|Guter Preis|Fairer Preis|Etwas teuer)/i);
      const daysMatch = t.match(/Tage inseriert\s*(\d+)/i);
      const idMatch = c.href.match(/\/de\/d\/(\d+)/);

      return {
        marketplace: 'autouncle.de',
        country: 'DE',
        id: idMatch ? idMatch[1] : `au-${idx + 1}`,
        title: c.titleAlt.replace(/^Gebraucht\s*/i, '').trim() || 'Vehicle',
        variant: co2Match ? `${co2Match[1]} g/km CO₂` : null,
        year,
        registration: year ? String(year) : null,
        priceEur,
        priceFormatted: priceEur ? `€ ${priceEur.toLocaleString('en-US')}` : null,
        dealRating: dealMatch ? dealMatch[1] : null,
        negotiable: false,
        mileageKm,
        mileageFormatted: mileageKm ? `${mileageKm.toLocaleString('en-US')} km` : null,
        powerHp: psMatch ? Number(psMatch[1]) : null,
        co2: co2Match ? Number(co2Match[1]) : null,
        fuelType: /elektrisch\/benzin|plug-in|hybrid/i.test(t)
          ? 'Hybrid (Benzin/Elektro)'
          : /diesel/i.test(t)
            ? 'Diesel'
            : 'Benzin',
        gearbox: /automatik/i.test(t) ? 'Automatik' : null,
        sellerType: 'Dealer',
        sellerName: 'AutoUncle Verified Listing',
        location: 'Germany (AutoUncle)',
        daysOnMarket: daysMatch ? Number(daysMatch[1]) : null,
        inspectedBadge: Boolean(dealMatch && /super|sehr gut/i.test(dealMatch[1])),
        accidentFree: true,
        crashed: false,
        thumbnail: c.thumb,
        url: c.href ? `https://www.autouncle.de${c.href}` : 'https://www.autouncle.de',
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'autouncle.de',
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 6. SAUTO.CZ Warm Search (~100-220ms via direct REST JSON API — Czechia)
 */
export async function searchSautoCz(
  query,
  { minYear = '', maxPrice = '', maxKm = '', onStage1 = null } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const { makeSlug, modelSlug, raw } = parseMakeModelQuery(query);

  const rawResult = await warmPages.sautocz.evaluate(
    async ({ make, model, rawQ }) => {
      const seoUrl = `https://www.sauto.cz/api/v1/items/search?limit=30&offset=0&category_id=838&manufacturer_model_seo=${encodeURIComponent(`${make}:${model}`)}`;
      let r = await fetch(seoUrl, { headers: { Accept: 'application/json' } });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j.results) && j.results.length > 0) {
          return { results: j.results, total: j.pagination?.total || j.results.length };
        }
      }
      const phraseUrl = `https://www.sauto.cz/api/v1/items/search?limit=30&offset=0&category_id=838&phrase=${encodeURIComponent(rawQ)}`;
      r = await fetch(phraseUrl, { headers: { Accept: 'application/json' } });
      if (!r.ok) return { errorStatus: r.status };
      const j2 = await r.json();
      return { results: j2.results || [], total: j2.pagination?.total || 0 };
    },
    { make: makeSlug, model: modelSlug, rawQ: raw }
  );

  if (rawResult?.errorStatus) {
    throw new Error(`sauto.cz HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.results || [])
    .map((x) => {
      const priceCzk = typeof x.price === 'number' ? x.price : parseDigits(x.price);
      const priceEur = priceCzk ? Math.round(priceCzk / CZK_PER_EUR) : null;
      const dateStr = x.in_operation_date || x.manufacturing_date || null;
      const year = parseYear(dateStr);
      const makeSeo = x.manufacturer_cb?.seo_name || makeSlug;
      const modelSeo = x.model_cb?.seo_name || modelSlug || 'auto';
      const imgRaw = x.images?.[0]?.url || null;

      const brandName = x.manufacturer_cb?.name || '';
      const rawName = x.name || '';
      const fullTitle = rawName.toLowerCase().startsWith(brandName.toLowerCase())
        ? rawName
        : `${brandName} ${rawName}`.trim();

      return {
        marketplace: 'sauto.cz',
        country: 'CZ',
        id: String(x.id),
        title: fullTitle,
        variant: x.additional_model_name || null,
        year,
        registration: dateStr ? dateStr.slice(0, 7) : null,
        priceEur,
        priceFormatted: priceEur
          ? `€ ${priceEur.toLocaleString('en-US')} (${priceCzk.toLocaleString('en-US')} CZK)`
          : null,
        negotiable: Boolean(x.price_by_agreement),
        mileageKm: typeof x.tachometer === 'number' ? x.tachometer : parseDigits(x.tachometer),
        mileageFormatted: x.tachometer ? `${x.tachometer.toLocaleString('en-US')} km` : null,
        powerHp: null,
        fuelType: x.fuel_cb?.name || null,
        gearbox: x.gearbox_cb?.name || null,
        sellerType: x.premise ? 'Dealer' : 'Private',
        sellerName: x.premise?.name || 'Private Seller',
        location: x.locality?.district || x.locality?.region || 'Czechia',
        firstListedDate: x.create_date?.slice(0, 10) || null,
        daysOnMarket: computeDaysOnMarket(x.create_date),
        inspectedBadge: Boolean(x.is_cebia_smart_code_url_verified),
        accidentFree: true,
        crashed: false,
        thumbnail: imgRaw
          ? `${imgRaw.startsWith('//') ? 'https:' : ''}${imgRaw}?fl=res,400,300,3|jpg,80,,1`
          : null,
        url: `https://www.sauto.cz/osobni/detail/${makeSeo}/${modelSeo}/${x.id}`,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  // Batch-fetch Sauto.cz `/api/v1/items/{id}` JSON details in parallel inside the warm tab (with in-memory cache)
  const sautoTargets = listings.slice(0, 15).filter((x) => x.id);
  const uncachedSautoIds = [];
  for (const item of sautoTargets) {
    if (sautoDetailCache.has(item.id)) {
      const detail = sautoDetailCache.get(item.id);
      if (detail.vin) {
        item.vin = detail.vin;
        item.decodedVin = detail.decodedVin;
      } else if (detail.vinMaskedBySeller) {
        item.vinMaskedBySeller = detail.vinMaskedBySeller;
      }
      if (detail.registration) item.registration = detail.registration;
      if (detail.registrationFullDate) item.registrationFullDate = detail.registrationFullDate;
      if (detail.cc && !item.cc) item.cc = detail.cc;
      if (detail.vatDeductible) item.vatDeductible = true;
      if (detail.detectedOptionIds?.length) item.detectedOptionIds = detail.detectedOptionIds;
    } else {
      uncachedSautoIds.push(item.id);
    }
  }
  if (uncachedSautoIds.length > 0 && typeof onStage1 === 'function') {
    const preRanked = scoreAndRankListings(listings, query);
    onStage1({
      marketplace: 'sauto.cz',
      stage: 1,
      enrichingDetails: true,
      tookMs: Date.now() - t0,
      count: listings.length,
      top3: preRanked.slice(0, 3),
      listings: preRanked,
    });
  }
  if (uncachedSautoIds.length > 0) {
    try {
      const itemsById = await warmPages.sautocz.evaluate(async (ids) => {
        const out = {};
        await Promise.all(
          ids.map(async (id) => {
            try {
              const ctrl = new AbortController();
              const timer = setTimeout(() => ctrl.abort(), 2200);
              const r = await fetch(`https://www.sauto.cz/api/v1/items/${id}`, {
                headers: { Accept: 'application/json' },
                signal: ctrl.signal,
              });
              clearTimeout(timer);
              if (r.ok) out[id] = await r.json();
            } catch {}
          })
        );
        return out;
      }, uncachedSautoIds);

      await Promise.all(
        sautoTargets.map(async (item) => {
          const rawDet = itemsById?.[item.id];
          if (!rawDet) return;
          const detail = await parseSautoItemDetail(rawDet);
          if (!detail) return;
          sautoDetailCache.set(item.id, detail);
          if (detail.vin) {
            item.vin = detail.vin;
            item.decodedVin = detail.decodedVin;
            item._needsImportRecalc = true;
          } else if (detail.vinMaskedBySeller) {
            item.vinMaskedBySeller = detail.vinMaskedBySeller;
          }
          if (detail.registration) {
            item.registration = detail.registration;
            item._needsImportRecalc = true;
          }
          if (detail.registrationFullDate) {
            item.registrationFullDate = detail.registrationFullDate;
            item._needsImportRecalc = true;
          }
          if (detail.cc && !item.cc) {
            item.cc = detail.cc;
            item._needsImportRecalc = true;
          }
          if (detail.vatDeductible) item.vatDeductible = true;
          if (detail.detectedOptionIds?.length) {
            item.detectedOptionIds = detail.detectedOptionIds;
            item._needsImportRecalc = true;
          }
        })
      );
    } catch {}
  }

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'sauto.cz',
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 7. WILLHABEN.AT Warm Search (~300-600ms via __NEXT_DATA__ JSON — Austria)
 */
export async function searchWillhabenAt(
  query,
  { minYear = '', maxPrice = '', maxKm = '' } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();

  const rawResult = await warmPages.willhaben.evaluate(async (q) => {
    const url = `https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse?keyword=${encodeURIComponent(q)}&rows=30`;
    const r = await fetch(url);
    if (!r.ok) return { errorStatus: r.status };
    const html = await r.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    const nd = m ? JSON.parse(m[1]) : {};
    const list =
      nd?.props?.pageProps?.searchResult?.advertSummaryList?.advertSummary || [];
    return { list };
  }, query);

  if (rawResult?.errorStatus) {
    throw new Error(`willhaben.at HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.list || [])
    .map((item) => {
      const attrs = {};
      for (const a of item.attributes?.attribute || []) {
        attrs[a.name] = a.values?.[0] ?? null;
      }
      const priceEur = Math.round(Number(attrs['PRICE'] || attrs['PRICE/AMOUNT'] || 0)) || null;
      const mileageKm = parseDigits(attrs['MILEAGE']);
      const year = parseYear(attrs['YEAR_MODEL']);
      const kw = Number(attrs['ENGINE/EFFECT'] || 0);
      const powerHp = kw > 0 ? Math.round(kw * 1.35962) : null;
      const seoUrl = attrs['SEO_URL'] || '';
      const imgObj = item.advertImageList?.advertImage?.[0];

      return {
        marketplace: 'willhaben.at',
        country: 'AT',
        id: String(item.id),
        title: item.description || attrs['HEADING'] || `${attrs['CAR_MODEL/MAKE'] || ''} ${attrs['CAR_MODEL/MODEL'] || ''}`.trim(),
        variant: attrs['CAR_MODEL/MODEL_SPECIFICATION'] || attrs['CAR_TYPE'] || null,
        year,
        registration: year ? String(year) : null,
        priceEur,
        priceFormatted: attrs['PRICE_FOR_DISPLAY'] || (priceEur ? `€ ${priceEur.toLocaleString('en-US')}` : null),
        negotiable: false,
        mileageKm,
        mileageFormatted: mileageKm ? `${mileageKm.toLocaleString('en-US')} km` : null,
        powerHp,
        fuelType: attrs['ENGINE/FUEL_RESOLVED'] || null,
        gearbox: attrs['TRANSMISSION_RESOLVED'] || null,
        sellerType: attrs['ISPRIVATE'] === '1' ? 'Private' : 'Dealer',
        sellerName: item.advertiserInfo?.label || (attrs['ISPRIVATE'] === '1' ? 'Private Seller' : 'Austrian Dealer'),
        location: [attrs['LOCATION'], attrs['STATE']].filter(Boolean).join(', ') || 'Austria',
        firstListedDate: attrs['PUBLISHED_String']?.slice(0, 10) || null,
        daysOnMarket: computeDaysOnMarket(attrs['PUBLISHED_String']),
        inspectedBadge: attrs['WARRANTY_RESOLVED'] === 'Ja',
        accidentFree: true,
        crashed: false,
        thumbnail: imgObj?.mainImageUrl || imgObj?.thumbnailImageUrl || null,
        url: seoUrl
          ? `https://www.willhaben.at/iad/${seoUrl.replace(/^\/+/, '')}`
          : `https://www.willhaben.at/iad/object?adId=${item.id}`,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'willhaben.at',
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 8. SUBITO.IT Warm Search (~600-850ms via __NEXT_DATA__ JSON — Italy)
 */
export async function searchSubitoIt(
  query,
  { minYear = '', maxPrice = '', maxKm = '' } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();

  const rawResult = await warmPages.subito.evaluate(async (q) => {
    const url = `https://www.subito.it/annunci-italia/vendita/auto/?q=${encodeURIComponent(q)}`;
    const r = await fetch(url);
    if (!r.ok) return { errorStatus: r.status };
    const html = await r.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    const nd = m ? JSON.parse(m[1]) : {};
    const list = nd?.props?.pageProps?.initialState?.items?.originalList || [];
    return { list };
  }, query);

  if (rawResult?.errorStatus) {
    throw new Error(`subito.it HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.list || [])
    .map((item) => {
      const f = item.features || {};
      const priceEur = parseDigits(f['/price']?.values?.[0]?.key);
      const mileageKm =
        parseDigits(f['/mileage_scalar']?.values?.[0]?.key) ??
        parseDigits(f['/mileage']?.values?.[0]?.value);
      const regDate = f['/register_date']?.values?.[0]?.value || null;
      const year = parseYear(f['/year']?.values?.[0]?.key || regDate);
      const powerStr = f['/power']?.values?.[0]?.value || '';
      const cvMatch = powerStr.match(/(\d+)\s*Cv/i);
      const urnParts = String(item.urn || '').split(':');
      const id = urnParts[urnParts.length - 1] || item.subject;
      const baseImg = item.images?.[0]?.cdnBaseUrl || null;

      return {
        marketplace: 'subito.it',
        country: 'IT',
        id: String(id),
        title: item.subject || 'Vehicle',
        variant: f['/car_type']?.values?.[0]?.value || null,
        year,
        registration: regDate,
        priceEur,
        priceFormatted: priceEur ? `€ ${priceEur.toLocaleString('en-US')}` : null,
        negotiable: false,
        mileageKm,
        mileageFormatted: mileageKm ? `${mileageKm.toLocaleString('en-US')} km` : null,
        powerHp: cvMatch ? Number(cvMatch[1]) : null,
        fuelType: f['/fuel']?.values?.[0]?.value || null,
        gearbox: f['/gearbox']?.values?.[0]?.value || null,
        sellerType: item.advertiser?.company ? 'Dealer' : 'Private',
        sellerName:
          item.advertiser?.shopName ||
          item.advertiser?.name ||
          (item.advertiser?.company ? 'Italian Dealer' : 'Private Seller'),
        location:
          [item.geo?.town?.value, item.geo?.city?.shortName, item.geo?.region?.value]
            .filter(Boolean)
            .join(', ') || 'Italy',
        firstListedDate: item.date?.slice(0, 10) || null,
        daysOnMarket: computeDaysOnMarket(item.date),
        inspectedBadge: false,
        accidentFree: true,
        crashed: false,
        thumbnail: baseImg ? `${baseImg}?rule=large-fixed-card-1x-auto` : null,
        url: item.urls?.default || 'https://www.subito.it',
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'subito.it',
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * Shared OLX Group Motors helper (powers otomoto.pl, autovit.ro, and standvirtual.com)
 */
async function searchOlxMotorsPortal({
  pageKey,
  marketplace,
  countryCode,
  countryName,
  baseUrl,
  categoryPath,
  fxRateToEur,
  query,
  minYear = '',
  maxPrice = '',
  maxKm = '',
  onStage1 = null,
}) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const { makeSlug, modelSlug } = parseMakeModelQuery(query);

  const rawResult = await warmPages[pageKey].evaluate(
    async ({ base, cat, make, model }) => {
      const pathSlug = model ? `${make}/${model}` : make;
      const url = `${base}/${cat}/${pathSlug}`;
      const r = await fetch(url);
      if (!r.ok) return { errorStatus: r.status };
      const html = await r.text();
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      const nd = m ? JSON.parse(m[1]) : {};
      const urql = nd?.props?.pageProps?.urqlState || {};
      let edges = [];
      for (const v of Object.values(urql)) {
        if (!v?.data) continue;
        const parsed = typeof v.data === 'string' ? JSON.parse(v.data) : v.data;
        if (parsed?.advertSearch?.edges) {
          edges = parsed.advertSearch.edges;
          break;
        }
      }
      return { edges };
    },
    { base: baseUrl, cat: categoryPath, make: makeSlug, model: modelSlug }
  );

  if (rawResult?.errorStatus) {
    throw new Error(`${marketplace} HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.edges || [])
    .map((edge) => {
      const node = edge?.node || {};
      const pMap = {};
      for (const p of node.parameters || []) {
        pMap[p.key] = p.displayValue || p.value;
      }
      const rawAmount = Number(node.price?.amount?.units || node.price?.amount?.value || 0);
      const currency = node.price?.amount?.currencyCode || 'EUR';
      const priceEur =
        rawAmount > 0
          ? currency === 'EUR'
            ? Math.round(rawAmount)
            : Math.round(rawAmount / fxRateToEur)
          : null;

      return {
        marketplace,
        country: countryCode,
        id: String(node.id),
        title: node.title || 'Vehicle',
        variant: node.shortDescription || pMap.version || null,
        year: parseYear(pMap.year),
        registration: pMap.year || null,
        priceEur,
        priceFormatted:
          priceEur && currency !== 'EUR'
            ? `€ ${priceEur.toLocaleString('en-US')} (${rawAmount.toLocaleString('en-US')} ${currency})`
            : priceEur
              ? `€ ${priceEur.toLocaleString('en-US')}`
              : null,
        negotiable: false,
        mileageKm: parseDigits(pMap.mileage),
        mileageFormatted: pMap.mileage || null,
        powerHp: parseDigits(pMap.engine_power),
        cc: parseDigits(pMap.engine_capacity),
        fuelType: pMap.fuel_type || null,
        gearbox: pMap.gearbox || null,
        sellerType: node.sellerLink?.id ? 'Dealer' : 'Private',
        sellerName: node.sellerLink?.name || (node.sellerLink?.id ? `${countryName} Dealer` : 'Private Seller'),
        location:
          [node.location?.city?.name, node.location?.region?.name]
            .filter(Boolean)
            .join(', ') || countryName,
        firstListedDate: node.createdAt?.slice(0, 10) || null,
        daysOnMarket: computeDaysOnMarket(node.createdAt),
        inspectedBadge: Boolean(node.cepikVerified),
        accidentFree: true,
        crashed: false,
        thumbnail: node.thumbnail?.x1 || node.thumbnail?.x2 || null,
        url: node.url || baseUrl,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  // Batch-fetch __NEXT_DATA__.props.pageProps.advert for matched OLX listings in parallel
  // over the warm HTTP/2 session and decrypt AES-256-GCM `vin`, `date_registration`, and `registration`.
  const olxTargets = listings.slice(0, 16).filter((x) => x.url);
  const uncachedOlxUrls = [];
  const applyOlxDetail = (item, detail) => {
    if (!detail) return;
    if (detail.vin) {
      item.vin = detail.vin;
      item.decodedVin = detail.decodedVin;
      item._needsImportRecalc = true;
    }
    if (detail.registration) {
      item.registration = detail.registration;
      item._needsImportRecalc = true;
    }
    if (detail.registrationFullDate) {
      item.registrationFullDate = detail.registrationFullDate;
      item._needsImportRecalc = true;
    }
    if (detail.licensePlate) item.licensePlate = detail.licensePlate;
    if (detail.co2 != null) {
      item.co2 = detail.co2;
      item._needsImportRecalc = true;
    }
    if (detail.cc && !item.cc) {
      item.cc = detail.cc;
      item._needsImportRecalc = true;
    }
    if (detail.seats) {
      item.seats = detail.seats;
      item._needsImportRecalc = true;
    }
    if (detail.marginScheme) item.marginScheme = true;
    if (detail.vatDeductible) item.vatDeductible = true;
    if (detail.detectedOptionIds?.length) {
      item.detectedOptionIds = detail.detectedOptionIds;
      item._needsImportRecalc = true;
    }
  };
  for (const item of olxTargets) {
    if (olxDetailCache.has(item.url)) {
      applyOlxDetail(item, olxDetailCache.get(item.url));
    } else {
      uncachedOlxUrls.push(item.url);
    }
  }
  if (uncachedOlxUrls.length > 0 && typeof onStage1 === 'function') {
    const preRanked = scoreAndRankListings(listings, query);
    onStage1({
      marketplace,
      stage: 1,
      enrichingDetails: true,
      tookMs: Date.now() - t0,
      count: listings.length,
      top3: preRanked.slice(0, 3),
      listings: preRanked,
    });
  }
  if (uncachedOlxUrls.length > 0) {
    try {
      const advertsByUrl = await warmPages[pageKey].evaluate(async (urls) => {
        const out = {};
        await Promise.all(
          urls.map(async (u) => {
            try {
              const ctrl = new AbortController();
              const timer = setTimeout(() => ctrl.abort(), 2500);
              const res = await fetch(u, { signal: ctrl.signal });
              clearTimeout(timer);
              if (!res.ok) return;
              const html = await res.text();
              const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
              if (!m) return;
              const nd = JSON.parse(m[1]);
              const adv = nd?.props?.pageProps?.advert;
              if (adv) {
                out[u] = {
                  id: adv.id,
                  parametersDict: adv.parametersDict,
                  equipment: adv.equipment,
                  description: adv.description,
                };
              }
            } catch {}
          })
        );
        return out;
      }, uncachedOlxUrls);

      await Promise.all(
        olxTargets.map(async (item) => {
          const adv = advertsByUrl?.[item.url];
          if (!adv) return;
          const detail = await parseOlxAdvertDetail(adv);
          if (!detail) return;
          olxDetailCache.set(item.url, detail);
          applyOlxDetail(item, detail);
        })
      );
    } catch {
      // Non-fatal if detail enrichment times out
    }
  }

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace,
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 9. OTOMOTO.PL Warm Search (Poland #1)
 */
export async function searchOtomotoPl(query, options = {}) {
  return searchOlxMotorsPortal({
    pageKey: 'otomoto',
    marketplace: 'otomoto.pl',
    countryCode: 'PL',
    countryName: 'Poland',
    baseUrl: 'https://www.otomoto.pl',
    categoryPath: 'osobowe',
    fxRateToEur: PLN_PER_EUR,
    query,
    ...options,
  });
}

/**
 * 10. AUTOVIT.RO Warm Search (Romania #1)
 */
export async function searchAutovitRo(query, options = {}) {
  return searchOlxMotorsPortal({
    pageKey: 'autovit',
    marketplace: 'autovit.ro',
    countryCode: 'RO',
    countryName: 'Romania',
    baseUrl: 'https://www.autovit.ro',
    categoryPath: 'autoturisme',
    fxRateToEur: RON_PER_EUR,
    query,
    ...options,
  });
}

/**
 * 11. STANDVIRTUAL.COM Warm Search (Portugal #1)
 */
export async function searchStandvirtualPt(query, options = {}) {
  return searchOlxMotorsPortal({
    pageKey: 'standvirtual',
    marketplace: 'standvirtual.com',
    countryCode: 'PT',
    countryName: 'Portugal',
    baseUrl: 'https://www.standvirtual.com',
    categoryPath: 'carros',
    fxRateToEur: 1,
    query,
    ...options,
  });
}

/**
 * Shared Adevinta Benelux helper (powers marktplaats.nl and 2dehands.be)
 */
async function searchAdevintaBenelux({
  pageKey,
  marketplace,
  countryCode,
  countryName,
  baseUrl,
  query,
  minYear = '',
  maxPrice = '',
  maxKm = '',
  onStage1 = null,
}) {
  const t0 = Date.now();
  await ensureWarmSessions();

  const rawResult = await warmPages[pageKey].evaluate(
    async ({ base, q }) => {
      const slugQ = q.trim().replace(/\s+/g, '+');
      const url = `${base}/l/auto-s/q/${slugQ}/`;
      const r = await fetch(url);
      if (!r.ok) return { errorStatus: r.status };
      const html = await r.text();
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      const nd = m ? JSON.parse(m[1]) : {};
      const list = nd?.props?.pageProps?.searchRequestAndResponse?.listings || [];
      return { list };
    },
    { base: baseUrl, q: query }
  );

  if (rawResult?.errorStatus) {
    throw new Error(`${marketplace} HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.list || [])
    .map((x) => {
      const aMap = {};
      for (const a of x.attributes || []) {
        aMap[a.key] = a.value;
      }
      const cents = Number(x.priceInfo?.priceCents || 0);
      const priceEur = cents > 0 ? Math.round(cents / 100) : null;
      const mileageKm = parseDigits(aMap.mileage);
      const year = parseYear(aMap.constructionYear) || parseYear(x.title);
      const imgRaw = x.imageUrls?.[0] || x.pictures?.[0]?.mediumUrl || null;

      return {
        marketplace,
        country: countryCode,
        id: String(x.itemId),
        title: x.title || 'Vehicle',
        variant: aMap.body || null,
        year,
        registration: year ? String(year) : null,
        priceEur,
        priceFormatted: priceEur ? `€ ${priceEur.toLocaleString('en-US')}` : null,
        negotiable: x.priceInfo?.priceType === 'MIN_BID',
        mileageKm,
        mileageFormatted: mileageKm ? `${mileageKm.toLocaleString('en-US')} km` : null,
        powerHp: null,
        fuelType: aMap.fuel || null,
        gearbox: aMap.transmission || null,
        sellerType: x.sellerInformation?.showWebsiteUrl ? 'Dealer' : 'Private',
        sellerName: x.sellerInformation?.sellerName || countryName,
        location: x.location?.cityName ? `${x.location.cityName}, ${countryName}` : countryName,
        inspectedBadge: Boolean(x.napAvailable),
        accidentFree: true,
        crashed: false,
        thumbnail: imgRaw ? (imgRaw.startsWith('//') ? `https:${imgRaw}` : imgRaw) : null,
        url: x.vipUrl ? `${baseUrl}${x.vipUrl}` : baseUrl,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  if (typeof onStage1 === 'function') {
    const preRanked = scoreAndRankListings(listings, query);
    onStage1({
      marketplace,
      stage: 1,
      enrichingDetails: true,
      tookMs: Date.now() - t0,
      count: listings.length,
      top3: preRanked.slice(0, 3),
      listings: preRanked,
    });
  }

  await enrichPortalListingsWithDetails(warmPages[pageKey], listings, 8);
  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace,
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 12. MARKTPLAATS.NL Warm Search (Netherlands #1)
 */
export async function searchMarktplaatsNl(query, options = {}) {
  return searchAdevintaBenelux({
    pageKey: 'marktplaats',
    marketplace: 'marktplaats.nl',
    countryCode: 'NL',
    countryName: 'Netherlands',
    baseUrl: 'https://www.marktplaats.nl',
    query,
    ...options,
  });
}

/**
 * 13. 2DEHANDS.BE Warm Search (Belgium #1)
 */
export async function search2dehandsBe(query, options = {}) {
  return searchAdevintaBenelux({
    pageKey: 'tweedehands',
    marketplace: '2dehands.be',
    countryCode: 'BE',
    countryName: 'Belgium',
    baseUrl: 'https://www.2dehands.be',
    query,
    ...options,
  });
}

/**
 * 14. AUTOBAZAR.EU Warm Search (Slovakia #1)
 */
export async function searchAutobazarEu(
  query,
  { minYear = '', maxPrice = '', maxKm = '' } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const { makeSlug, modelSlug } = parseMakeModelQuery(query);

  const rawResult = await warmPages.autobazar.evaluate(
    async ({ make, model }) => {
      const pathSlug = model ? `${make}/${model}/` : `${make}/`;
      const url = `https://www.autobazar.eu/vysledky/osobne-vozidla/${pathSlug}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3800);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return { errorStatus: r.status };
      const html = await r.text();
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      const nd = m ? JSON.parse(m[1]) : {};
      const data = nd?.props?.pageProps?.searchRecords?.data || [];
      return { data };
    },
    { make: makeSlug, model: modelSlug }
  );

  if (rawResult?.errorStatus) {
    throw new Error(`autobazar.eu HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.data || [])
    .map((x) => {
      const priceEur = Math.round(Number(x.finalPrice || x.priceCurrent || 0)) || null;
      const year = parseYear(x.yearValue);
      const kw = Number(x.enginePower || 0);
      const powerHp = kw > 0 ? Math.round(kw * 1.35962) : null;
      const isCz = /česk/i.test(x.location?.parentNames?.join(' ') || '');

      return {
        marketplace: 'autobazar.eu',
        country: isCz ? 'CZ' : 'SK',
        id: String(x.id),
        title: x.title || `${x.brandValue || ''} ${x.carModelValue || ''}`.trim(),
        variant: x.bodyworkValue || null,
        year,
        registration: year && x.monthValue ? `${String(x.monthValue).padStart(2, '0')}/${year}` : (year ? String(year) : null),
        priceEur,
        priceFormatted: priceEur ? `€ ${priceEur.toLocaleString('en-US')}` : null,
        negotiable: false,
        mileageKm: typeof x.mileage === 'number' ? x.mileage : parseDigits(x.mileage),
        mileageFormatted: x.mileage ? `${Number(x.mileage).toLocaleString('en-US')} km` : null,
        powerHp,
        cc: typeof x.engineCapacity === 'number' ? x.engineCapacity : null,
        fuelType: x.fuelValue || null,
        gearbox: x.gearboxValue || null,
        sellerType: x.user?.displayName ? 'Dealer' : 'Private',
        sellerName: x.user?.displayName || 'Slovak Seller',
        location: x.user?.city || x.location?.name || 'Slovakia',
        firstListedDate: x.clientUpdatedAt?.slice(0, 10) || null,
        vin: cleanVin(x.vin) || null,
        inspectedBadge: Boolean(x.vin),
        accidentFree: true,
        crashed: false,
        thumbnail: x.image?.previewUrls?.record_preview || x.image?.previewUrls?.orig || null,
        url: `https://www.autobazar.eu/detail/${x.sefName || 'auto'}/${x.id}/`,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  await Promise.all(
    listings.map(async (item) => {
      if (item.vin && !item.decodedVin) {
        item.decodedVin = await decodeVin(item.vin, item.year, { fastLocal: true });
      }
    })
  );

  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'autobazar.eu',
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * 15. COCHES.COM Warm Search (Spain)
 */
export async function searchCochesCom(
  query,
  { minYear = '', maxPrice = '', maxKm = '', onStage1 = null } = {}
) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const { fullSlug } = parseMakeModelQuery(query);

  const rawResult = await warmPages.coches.evaluate(async (slug) => {
    const url = `https://www.coches.com/coches-segunda-mano/${slug}.htm`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3800);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return { errorStatus: r.status };
    const html = await r.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    const nd = m ? JSON.parse(m[1]) : {};
    const list = nd?.props?.pageProps?.classifieds?.classifiedList || [];
    const detailUrlsById = {};
    const linkRe = /href="(https:\/\/www\.coches\.com\/coches-segunda-mano\/ocasion-[^"]*\?id=([^"&]+))"/g;
    let lm;
    while ((lm = linkRe.exec(html)) !== null) {
      detailUrlsById[lm[2]] = lm[1];
    }
    return { list, detailUrlsById };
  }, fullSlug);

  if (rawResult?.errorStatus) {
    throw new Error(`coches.com HTTP ${rawResult.errorStatus}`);
  }

  let listings = (rawResult?.list || [])
    .map((x) => {
      const priceEur = Number(x.priceOffer?.amount || x.price?.amount || 0) || null;
      const mileageKm = Number(x.mileage?.amount ?? 0) || null;
      const year = parseYear(x.registration?.year);
      const month = x.registration?.month ? String(x.registration.month).padStart(2, '0') : '06';
      const visId = String(x.visibleId || x.id);

      return {
        marketplace: 'coches.com',
        country: 'ES',
        id: visId,
        title: `${x.make?.name || ''} ${x.model?.name || ''} ${x.version?.name || ''}`.replace(/\s+/g, ' ').trim(),
        variant: x.body?.name || null,
        year,
        registration: year ? `${month}/${year}` : null,
        vin: cleanVin(x.registration?.vin) || null,
        licensePlate: x.registration?.plate || null,
        priceEur,
        priceFormatted: priceEur ? `€ ${priceEur.toLocaleString('en-US')}` : null,
        negotiable: false,
        mileageKm,
        mileageFormatted: mileageKm ? `${mileageKm.toLocaleString('en-US')} km` : null,
        powerHp: x.engine?.powerCv || null,
        fuelType: x.fuel?.name || null,
        gearbox: x.transmission?.name || null,
        sellerType: x.dealer?.name ? 'Dealer' : 'Private',
        sellerName: x.dealer?.name || 'Spanish Seller',
        location: x.currentProvince?.name ? `${x.currentProvince.name}, Spain` : 'Spain',
        firstListedDate: x.createdAt?.slice(0, 10) || null,
        daysOnMarket: computeDaysOnMarket(x.createdAt),
        inspectedBadge: x.dealer?.type === 'AUTHORIZED',
        accidentFree: true,
        crashed: false,
        thumbnail: x.image || null,
        url: rawResult?.detailUrlsById?.[visId] || `https://www.coches.com/coches-segunda-mano/${fullSlug}.htm`,
      };
    })
    .filter((x) => isRelevantVehicleListing(x, query));

  if (minYear) listings = listings.filter((x) => !x.year || x.year >= Number(minYear));
  if (maxPrice) listings = listings.filter((x) => !x.priceEur || x.priceEur <= Number(maxPrice));
  if (maxKm) listings = listings.filter((x) => !x.mileageKm || x.mileageKm <= Number(maxKm));

  if (typeof onStage1 === 'function') {
    const preRanked = scoreAndRankListings(listings, query);
    onStage1({
      marketplace: 'coches.com',
      stage: 1,
      enrichingDetails: true,
      tookMs: Date.now() - t0,
      count: listings.length,
      top3: preRanked.slice(0, 3),
      listings: preRanked,
    });
  }

  await enrichPortalListingsWithDetails(warmPages.coches, listings, 6);
  const ranked = scoreAndRankListings(listings, query);
  return {
    marketplace: 'coches.com',
    tookMs: Date.now() - t0,
    count: listings.length,
    top3: ranked.slice(0, 3),
    listings: ranked,
  };
}

/**
 * Unified Search across one or ALL 15 European marketplaces concurrently,
 * computing Greek Customs & Landed Price (ν. 5222/2025 + ν. 5313/2026) on every listing.
 */
export function getActiveMarketplaceTasks(query, options = {}) {
  const source = (options.source || 'all').toLowerCase();
  const entries = [];

  const addSource = (matchKeys, marketName, fn) => {
    if (source === 'all' || matchKeys.includes(source)) {
      entries.push({
        marketplace: marketName,
        run: (extraOpts = {}) =>
          fn(query, { ...options, ...extraOpts }).catch((e) => ({
            marketplace: marketName,
            tookMs: 0,
            error: e.message,
            count: 0,
            top3: [],
            listings: [],
          })),
      });
    }
  };

  addSource(['cargr', 'car.gr'], 'car.gr', searchCarGr);
  addSource(['theparking', 'theparking.eu'], 'theparking.eu', searchTheParking);
  addSource(['autoscout24', 'autoscout24.com'], 'autoscout24.com', searchAutoScout24);
  addSource(['mobilede', 'mobile.de'], 'mobile.de', searchMobileDe);
  addSource(['autouncle', 'autouncle.de'], 'autouncle.de', searchAutoUncleDe);
  addSource(['sautocz', 'sauto.cz'], 'sauto.cz', searchSautoCz);
  addSource(['willhaben', 'willhaben.at'], 'willhaben.at', searchWillhabenAt);
  addSource(['subito', 'subito.it'], 'subito.it', searchSubitoIt);
  addSource(['otomoto', 'otomoto.pl'], 'otomoto.pl', searchOtomotoPl);
  addSource(['autovit', 'autovit.ro'], 'autovit.ro', searchAutovitRo);
  addSource(['standvirtual', 'standvirtual.com'], 'standvirtual.com', searchStandvirtualPt);
  addSource(['marktplaats', 'marktplaats.nl'], 'marktplaats.nl', searchMarktplaatsNl);
  addSource(['2dehands', '2dehands.be'], '2dehands.be', search2dehandsBe);
  addSource(['autobazar', 'autobazar.eu'], 'autobazar.eu', searchAutobazarEu);
  addSource(['coches', 'coches.com'], 'coches.com', searchCochesCom);

  return entries;
}

export function computeAggregatePayload(query, results, t0) {
  const combinedListings = results.flatMap((r) => r.listings || []);
  const overallRanked = scoreAndRankListings(combinedListings, query);
  latestAggregatedListings = overallRanked;

  const validPrices = overallRanked
    .map((x) => x.priceEur)
    .filter((p) => typeof p === 'number' && p > 1000)
    .sort((a, b) => a - b);

  const validLanded = overallRanked
    .map((x) => x.landedGreeceEur)
    .filter((p) => typeof p === 'number' && p > 1000)
    .sort((a, b) => a - b);

  const grDomesticPrices = overallRanked
    .filter((x) => x.country === 'GR' || x.marketplace === 'car.gr')
    .map((x) => x.priceEur)
    .filter((p) => typeof p === 'number' && p > 1000)
    .sort((a, b) => a - b);

  const grFloor = grDomesticPrices[0] ?? null;
  const grMedian = grDomesticPrices.length
    ? grDomesticPrices[Math.floor(grDomesticPrices.length / 2)]
    : null;

  for (const item of overallRanked) {
    const isGr = item.country === 'GR' || item.marketplace === 'car.gr' || item.greekImport?.isDomesticGreek;
    const landed = item.landedGreeceEur ?? item.priceEur;
    const cCode = (item.greekImport?.originCountry || item.country || 'DE').toUpperCase();
    const cCfg = COUNTRY_CONFIG[cCode] || COUNTRY_CONFIG.DE;
    const foreignVatRate = cCfg?.vat ?? 0.19;
    item.foreignVatRatePct = Math.round(foreignVatRate * 1000) / 10;

    if (!isGr && typeof item.priceEur === 'number' && item.priceEur > 1000) {
      if (item.vatDeductible) {
        const nettoAsk = Math.round(item.priceEur / (1 + foreignVatRate));
        const fixedTransitAndCustoms =
          (item.greekImport?.registrationTaxEur || 0) +
          (item.greekImport?.shippingEur || 1200) +
          (item.greekImport?.adminFeesEur || 600) +
          (item.greekImport?.roadTaxEur || 0);
        const grVat24 = Math.round((nettoAsk + (item.greekImport?.shippingEur || 1200)) * 0.24);
        item.nettoPurchaseEur = nettoAsk;
        item.b2bNettoCashLandedEur = nettoAsk + fixedTransitAndCustoms;
        item.b2bGrossWithGrVatLandedEur = nettoAsk + fixedTransitAndCustoms + grVat24;
        item.b2bSavingsVsGrFloorEur = grFloor ? Math.round(grFloor - item.b2bNettoCashLandedEur) : null;
      } else {
        item.nettoPurchaseEur = item.priceEur;
        item.b2bNettoCashLandedEur = landed;
        item.b2bGrossWithGrVatLandedEur = landed;
        item.b2bSavingsVsGrFloorEur = grFloor ? Math.round(grFloor - landed) : null;
      }
      item.savingsVsGrFloorEur = grFloor ? Math.round(grFloor - landed) : null;
      item.savingsVsGrMedianEur = grMedian ? Math.round(grMedian - landed) : null;
    } else {
      item.nettoPurchaseEur = item.priceEur;
      item.b2bNettoCashLandedEur = landed;
      item.b2bGrossWithGrVatLandedEur = landed;
      item.b2bSavingsVsGrFloorEur = null;
      item.savingsVsGrFloorEur = null;
      item.savingsVsGrMedianEur = null;
    }
  }

  return {
    query,
    lawVersion: LAW_VERSION,
    totalWallClockMs: Date.now() - t0,
    totalListingsReturned: overallRanked.length,
    stats: {
      lowestPriceEur: validPrices[0] ?? null,
      medianPriceEur: validPrices.length ? validPrices[Math.floor(validPrices.length / 2)] : null,
      lowestLandedGreeceEur: validLanded[0] ?? null,
      medianLandedGreeceEur: validLanded.length ? validLanded[Math.floor(validLanded.length / 2)] : null,
      lowestDomesticGrEur: grFloor,
      medianDomesticGrEur: grMedian,
    },
    marketplaces: Object.fromEntries(
      results.map((r) => {
        const list = r.listings || [];
        const vins = list.map((x) => x.vin).filter(Boolean);
        const maskedVins = list.map((x) => x.vinMaskedBySeller).filter(Boolean);
        const plates = list.map((x) => x.licensePlate).filter(Boolean);
        return [
          r.marketplace,
          {
            tookMs: r.tookMs,
            count: r.count,
            vinsExtracted: vins.length,
            maskedVinsCount: maskedVins.length,
            platesExtracted: plates.length,
            sampleVins: vins.slice(0, 3),
            samplePlates: plates.slice(0, 3),
            error: r.error || null,
            top3: r.top3,
          },
        ];
      })
    ),
    bestOverallAcrossEuropeTop5: overallRanked.slice(0, 5),
    listings: overallRanked,
  };
}

export async function searchAllMarketplaces(query, options = {}) {
  const t0 = Date.now();
  await ensureWarmSessions();
  const entries = getActiveMarketplaceTasks(query, options);
  const results = await Promise.all(entries.map((e) => e.run()));
  return computeAggregatePayload(query, results, t0);
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
const cliArgs = isMainModule ? process.argv.slice(2) : [];
const cliQuery = cliArgs.filter((a) => !a.startsWith('--')).join(' ').trim();

if (isMainModule && cliQuery) {
  (async () => {
    try {
      await ensureWarmSessions();
      const res = await searchAllMarketplaces(cliQuery);
      console.log(JSON.stringify(res, null, 2));
    } finally {
      if (browser) await browser.close();
    }
  })();
} else if (isMainModule) {
  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (reqUrl.pathname === '/' || reqUrl.pathname === '/index.html') {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        if (fs.existsSync(htmlPath)) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.writeHead(200);
          res.end(fs.readFileSync(htmlPath, 'utf8'));
          return;
        }
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      if (reqUrl.pathname === '/health' || reqUrl.pathname === '/healthz') {
        const mem = process.memoryUsage();
        res.writeHead(200);
        res.end(
          JSON.stringify({
            status: 'ok',
            build: 'v2-cloud-mobile',
            lawVersion: LAW_VERSION,
            nodeRssMb: Math.round(mem.rss / 1048576),
            nodeHeapUsedMb: Math.round(mem.heapUsed / 1048576),
            chromiumMemoryOptimization: {
              architecture: '4-tab-shared-worker-pool',
              physicalTabs: 4,
              virtualPortals: 15,
              rendererProcessLimit: 2,
              idleAutoSleepMinutes: 5,
              domStrippedAfterHandshake: true,
              evaluateTimeoutMs: 9500,
              blockedResources: [
                'image',
                'media',
                'font',
                'stylesheet',
                'websocket',
                'eventsource',
                'manifest',
                'trackers',
              ],
            },
            warmTabs: Object.fromEntries(
              Object.entries(warmPages).map(([k, p]) => [k, Boolean(p && !p.isClosed())])
            ),
          })
        );
        return;
      }

      if (reqUrl.pathname === '/api/decode-vin') {
        const vin = reqUrl.searchParams.get('vin') || '';
        const licensePlate = reqUrl.searchParams.get('plate') || '';
        const fallbackYear = reqUrl.searchParams.get('year') ? Number(reqUrl.searchParams.get('year')) : null;
        const dossier = await buildFreeVinHistoryDossier({
          vin,
          licensePlate,
          fallbackYear,
          activeListings: latestAggregatedListings,
        });
        res.writeHead(dossier.ok ? 200 : 400);
        res.end(JSON.stringify(dossier, null, 2));
        return;
      }

      if (reqUrl.pathname === '/api/inspect-listing') {
        const targetUrl = reqUrl.searchParams.get('url') || '';
        await ensureWarmSessions();
        const inspected = await inspectListingPage(targetUrl, context);
        res.writeHead(200);
        res.end(JSON.stringify(inspected, null, 2));
        return;
      }

      if (reqUrl.pathname === '/api/deep-research') {
        const vin = reqUrl.searchParams.get('vin') || '';
        const licensePlate = reqUrl.searchParams.get('plate') || '';
        const targetUrl = reqUrl.searchParams.get('url') || '';
        let itemObj = null;
        const rawItem = reqUrl.searchParams.get('item');
        if (rawItem) {
          try {
            itemObj = JSON.parse(rawItem);
          } catch {}
        }
        if (!itemObj) {
          itemObj = {
            title: reqUrl.searchParams.get('title') || '',
            country: reqUrl.searchParams.get('country') || '',
            year: reqUrl.searchParams.get('year') ? Number(reqUrl.searchParams.get('year')) : null,
            mileageKm: reqUrl.searchParams.get('mileageKm') ? Number(reqUrl.searchParams.get('mileageKm')) : null,
            priceEur: reqUrl.searchParams.get('priceEur') ? Number(reqUrl.searchParams.get('priceEur')) : null,
            marketplace: reqUrl.searchParams.get('sourceName') || '',
            url: targetUrl,
            vin,
            licensePlate,
          };
        }
        if (!context && (targetUrl || vin)) {
          ensureWarmSessions().catch(() => {});
        }
        const openRouterKey = reqUrl.searchParams.get('openRouterKey') || process.env.OPENROUTER_API_KEY || '';
        const openRouterModel = reqUrl.searchParams.get('openRouterModel') || 'deepseek/deepseek-v4.1-flash';
        const report = await runDeepVehicleResearch({
          vin,
          licensePlate,
          url: targetUrl,
          item: itemObj,
          activeListings: latestAggregatedListings,
          browserContext: context,
          openRouterKey,
          openRouterModel,
        });
        res.writeHead(200);
        res.end(JSON.stringify({ ...report, report }, null, 2));
        return;
      }

      if (reqUrl.pathname === '/api/calculate-import') {
        const params = Object.fromEntries(reqUrl.searchParams.entries());
        const decodedVin = params.vin
          ? await decodeVin(params.vin, Number(params.year || 2018), { fastLocal: true })
          : undefined;
        const resolvedTitle =
          params.title ||
          params.q ||
          (decodedVin?.make && decodedVin?.model
            ? `${decodedVin.make} ${decodedVin.model}`
            : 'Custom Vehicle');
        const mockItem = {
          title: resolvedTitle,
          vin: params.vin || undefined,
          decodedVin,
          category: params.category || undefined,
          priceEur: Number(params.priceEur || params.price || 45000),
          country: params.country || params.origin || 'DE',
          year: Number(params.year || decodedVin?.modelYear || 2018),
          registration: params.registration || '',
          mileageKm: Number(params.mileageKm || params.km || 60000),
          co2: params.co2 ? Number(params.co2) : decodedVin?.co2Gkm || undefined,
          cc: params.cc ? Number(params.cc) : decodedVin?.displacementCc || undefined,
          gvwKg: params.gvwKg ? Number(params.gvwKg) : undefined,
          seats: params.seats ? Number(params.seats) : undefined,
          fuelType: params.fuel || decodedVin?.fuelType || 'plugin_hybrid',
          variant: params.body || 'coupe',
        };
        const selectedOptionIds =
          params.options !== undefined
            ? params.options
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : null;
        const overrides = {
          category: params.category || undefined,
          country: params.country || undefined,
          year: params.year ? Number(params.year) : undefined,
          registration: params.registration || undefined,
          mileageKm: params.mileageKm ? Number(params.mileageKm) : undefined,
          co2: params.co2 !== undefined && params.co2 !== '' ? Number(params.co2) : undefined,
          cc: params.cc !== undefined && params.cc !== '' ? Number(params.cc) : undefined,
          gvwKg: params.gvwKg !== undefined && params.gvwKg !== '' ? Number(params.gvwKg) : undefined,
          seats: params.seats !== undefined && params.seats !== '' ? Number(params.seats) : undefined,
          vatRegime: params.vatRegime || undefined,
          fuel: params.fuel || undefined,
          body: params.body || undefined,
          listPriceEur: params.listPriceEur ? Number(params.listPriceEur) : undefined,
          extrasEur:
            params.extrasEur !== undefined && params.extrasEur !== ''
              ? Number(params.extrasEur)
              : undefined,
          selectedOptionIds,
          shippingEur:
            params.shippingEur !== undefined && params.shippingEur !== ''
              ? Number(params.shippingEur)
              : undefined,
          vin: params.vin || undefined,
          forceImport: true,
        };
        const calc = calculateGreekImport(mockItem, resolvedTitle, overrides);
        res.writeHead(200);
        res.end(
          JSON.stringify(
            {
              lawVersion: LAW_VERSION,
              categories: VEHICLE_CATEGORIES,
              countries: COUNTRY_CONFIG,
              factoryOptionsCatalog: FACTORY_OPTIONS_CATALOG,
              result: calc,
            },
            null,
            2
          )
        );
        return;
      }

      if (reqUrl.pathname === '/api/arbitrage-radar') {
        const rawModels =
          reqUrl.searchParams.get('models') ||
          'bmw i8,porsche 911,audi a3 40 tfsi e,ford mustang';
        const models = rawModels
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 6);

        const t0 = Date.now();
        await ensureWarmSessions();

        const modelSummaries = [];
        const allDeals = [];

        for (const modelQuery of models) {
          const payload = await searchAllMarketplaces(modelQuery, { source: 'all' });
          const grFloor = payload.stats?.lowestDomesticGrEur ?? null;
          const grMedian = payload.stats?.medianDomesticGrEur ?? null;
          const foreignListings = (payload.listings || []).filter(
            (x) => x.country !== 'GR' && x.marketplace !== 'car.gr' && !x.greekImport?.isDomesticGreek
          );
          const profitable = foreignListings.filter(
            (x) => typeof x.savingsVsGrFloorEur === 'number' && x.savingsVsGrFloorEur > 0
          );
          const vinVerified = foreignListings.filter((x) => x.vin || x.licensePlate);

          modelSummaries.push({
            modelQuery,
            totalListings: payload.totalListingsReturned,
            grDomesticFloorEur: grFloor,
            grDomesticMedianEur: grMedian,
            lowestLandedGreeceEur: payload.stats?.lowestLandedGreeceEur ?? null,
            maxArbitrageSavingsEur: profitable[0]
              ? Math.max(...profitable.map((x) => x.savingsVsGrFloorEur || 0))
              : 0,
            profitableDealsCount: profitable.length,
            vinOrPlateVerifiedCount: vinVerified.length,
          });

          for (const item of foreignListings) {
            if (typeof item.savingsVsGrFloorEur === 'number' && item.savingsVsGrFloorEur > -5000) {
              allDeals.push({
                ...item,
                radarModelQuery: modelQuery,
                grModelFloorEur: grFloor,
                grModelMedianEur: grMedian,
              });
            }
          }
        }

        allDeals.sort((a, b) => {
          const aScore = (a.savingsVsGrFloorEur || 0) + (a.vin ? 1800 : a.licensePlate ? 900 : 0);
          const bScore = (b.savingsVsGrFloorEur || 0) + (b.vin ? 1800 : b.licensePlate ? 900 : 0);
          return bScore - aScore;
        });

        res.writeHead(200);
        res.end(
          JSON.stringify(
            {
              ok: true,
              tookMs: Date.now() - t0,
              modelsScanned: models,
              modelSummaries,
              topArbitrageDeals: allDeals.slice(0, 30),
            },
            null,
            2
          )
        );
        return;
      }

      if (reqUrl.pathname === '/search-stream') {
        const q = reqUrl.searchParams.get('q') || 'bmw i8';
        const source = reqUrl.searchParams.get('source') || 'all';
        const minYear = reqUrl.searchParams.get('minYear') || '';
        const maxPrice = reqUrl.searchParams.get('maxPrice') || '';
        const maxKm = reqUrl.searchParams.get('maxKm') || '';

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
        });
        res.flushHeaders?.();

        let clientClosed = false;
        req.on('close', () => {
          clientClosed = true;
        });

        const sendEvent = (event, payload) => {
          if (clientClosed) return;
          res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
        };

        const t0 = Date.now();
        const entries = getActiveMarketplaceTasks(q, { source, minYear, maxPrice, maxKm });

        sendEvent('init', {
          query: q,
          totalPortals: entries.length,
          portals: entries.map((e) => e.marketplace),
        });

        await ensureWarmSessions();

        const resultsByMarket = new Map();
        const stage2DoneSet = new Set();

        await Promise.all(
          entries.map(async (entry) => {
            const r = await entry.run({
              onStage1: (stage1Res) => {
                if (stage2DoneSet.has(entry.marketplace)) return;
                resultsByMarket.set(entry.marketplace, stage1Res);
                const partial = computeAggregatePayload(q, Array.from(resultsByMarket.values()), t0);
                if (partial.marketplaces[entry.marketplace]) {
                  partial.marketplaces[entry.marketplace].enrichingDetails = true;
                }
                sendEvent('portal', {
                  marketplace: stage1Res.marketplace,
                  stage: 1,
                  enrichingDetails: true,
                  tookMs: stage1Res.tookMs,
                  count: stage1Res.count,
                  vinsExtracted: 0,
                  platesExtracted: 0,
                  error: null,
                  completedPortals: stage2DoneSet.size,
                  stage1LoadedPortals: resultsByMarket.size,
                  totalPortals: entries.length,
                  partialPayload: partial,
                });
              },
            });

            stage2DoneSet.add(r.marketplace);
            resultsByMarket.set(r.marketplace, r);
            const partial = computeAggregatePayload(q, Array.from(resultsByMarket.values()), t0);
            const list = r.listings || [];
            const vins = list.map((x) => x.vin).filter(Boolean);
            const plates = list.map((x) => x.licensePlate).filter(Boolean);
            sendEvent('portal', {
              marketplace: r.marketplace,
              stage: 2,
              enrichingDetails: false,
              tookMs: r.tookMs,
              count: r.count,
              vinsExtracted: vins.length,
              platesExtracted: plates.length,
              error: r.error || null,
              completedPortals: stage2DoneSet.size,
              stage1LoadedPortals: resultsByMarket.size,
              totalPortals: entries.length,
              partialPayload: partial,
            });
          })
        );

        const finalPayload = computeAggregatePayload(q, Array.from(resultsByMarket.values()), t0);
        sendEvent('complete', finalPayload);
        if (!clientClosed) res.end();
        return;
      }

      if (reqUrl.pathname === '/search') {
        const q = reqUrl.searchParams.get('q') || 'bmw i8';
        const source = reqUrl.searchParams.get('source') || 'all';
        const minYear = reqUrl.searchParams.get('minYear') || '';
        const maxPrice = reqUrl.searchParams.get('maxPrice') || '';
        const maxKm = reqUrl.searchParams.get('maxKm') || '';

        const data = await searchAllMarketplaces(q, { source, minYear, maxPrice, maxKm });
        res.writeHead(200);
        res.end(JSON.stringify(data, null, 2));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] 15-Marketplace EU Dashboard & Greek Customs Calculator live at http://0.0.0.0:${PORT}`);
    const isCloudLinux = process.platform === 'linux' && !process.env.DISPLAY;
    if (!isCloudLinux) {
      ensureWarmSessions().catch((err) => {
        console.error('[WarmSessions] Initial warm-up error:', err.message);
      });
    } else {
      console.log('[WarmSessions] Cloud Linux detected — 4-tab Chromium worker pool will initialize on demand.');
    }
  });
}
