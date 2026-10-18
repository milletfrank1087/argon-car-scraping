/**
 * Greek Customs Statutory Shield & Multi-Trim / Build-Sheet Auditor (`greek-ltpf-auditor.mjs`)
 * ============================================================================================
 * Implements the 4 Bulletproof Statutory Layers for Greek Vehicle Import Valuation:
 *
 * 1. Dual-Regime Greek Retail `ΑΠΛΤ -> ΛΤΠΦ` Inverter (`invertGreekRetailByYear`):
 *    - Post-01/06/2016 (`ν. 4410/2016` & `ν. 5222/2025 Άρθρο 136`): 24% VAT + 6-bracket progressive `ΛΤΠΦ` scale.
 *    - Pre-01/06/2016 (`ν. 2682/1998`, `ν. 3833/2010`, `ν. 3986/2011`): 23% VAT + `CC × CO₂` flat registration tax scale.
 *
 * 2. Multi-Trim & Multi-Generation Historical Greek Importer `ΛΤΠΦ` Matrix (`resolveMultiTrimGreekLtpf`):
 *    - Replaces flat single-point inflation scaling with generation-specific (`2014–2017`, `2018–2020`,
 *      `2021–2023`, `2024–2026`) and trim-specific (`Base / Active / Life`, `Mid / Style / Business`,
 *      `Sport / R-Line / M-Sport / AMG-Line / S-Line / GR-Sport`, `Flagship / Premiere`) Greek `ΛΤΠΦ` tables.
 *
 * 3. Statutory Cliff & VIN 10th-Digit Model-Year (`Έτος Κατασκευής`) Forensic Auditor (`auditStatutoryCliffsAndVinMy`):
 *    - Cross-checks ISO 3779 VIN character 10 (`Manufacturing Model Year`) against `First Registration Date`
 *      (`ν. 5222/2025 Άρθρο 138 §1` late-registration rule & archival pricelist year lock).
 *    - Detects "1-Gram CoC #49.4 CO₂ Cliffs" across all NEDC (`100/120/140/160/180/200/250g`),
 *      WLTP (`130/156/182/208/234/260/325g`), and PHEV (`50g`) statutory step boundaries.
 *
 * 4. OEM VIN Build-Sheet & `carVertical` Equipment Parser (`parseOemBuildSheetToGreekExtras`):
 *    - Parses BMW/MINI `S-codes`, VAG/Porsche `PR-codes`, Mercedes-Benz `SA-codes`, and free-text
 *      equipment lists into an official **ΑΑΔΕ Α.1043/2025 (ΦΕΚ Β΄ 1257/2025) Annex I
 *      (`Δήλωση Εξοπλισμού και Αξίας`)** pre-tax valuation schedule.
 */

import { invertGreekRetailToLtpf, computeGreekRetailFromLtpf, GREEK_IMPORTER_LTPF_CATALOG, GREEK_IMPORTER_PORTALS } from './greek-ltpf-catalog.mjs';

// ============================================================================
// 1. DUAL-REGIME GREEK RETAIL (`ΑΠΛΤ -> ΛΤΠΦ`) INVERTER (PRE-2016 & POST-2016)
// ============================================================================

/**
 * Legacy Pre-01/06/2016 Greek Registration Tax (`Τέλος Ταξινόμησης`) Displacement Brackets
 * (`ν. 2682/1998` Άρθρο 120 as in force 2011–May 2016 for Euro 5 / Euro 6 passenger cars).
 */
const LEGACY_PRE_JUNE_2016_CC_BRACKETS = [
  { maxCc: 900, rate: 0.05 },
  { maxCc: 1400, rate: 0.12 },
  { maxCc: 1600, rate: 0.20 },
  { maxCc: 1800, rate: 0.30 },
  { maxCc: 2000, rate: 0.40 },
  { maxCc: Infinity, rate: 0.50 },
];

/**
 * Dual-regime mathematical inverter from published Greek New Retail Price (`ΑΠΛΤ`) to exact
 * Pre-Tax `ΛΤΠΦ`. Automatically selects the statutory tax law in force when the pricelist was published:
 * - On or after `2016-06-01`: `ν. 4410/2016` / `ν. 5222/2025 Άρθρο 136` (24% VAT + 6-bracket progressive `ΛΤΠΦ`).
 * - Before `2016-06-01` (2011–May 2016): `ν. 3833/2010` / `ν. 3986/2011` (23% VAT + `CC × NEDC CO₂` scale).
 */
export function invertGreekRetailByYear(
  greekRetailEur,
  { co2 = 135, cc = 1598, fuel = 'petrol', pricelistYear = 2025, pricelistMonth = 6, withWithdrawalBonus = false } = {}
) {
  const R = Number(greekRetailEur) || 0;
  if (R <= 500) return null;

  const yearNum = Number(pricelistYear) || 2025;
  const monthNum = Number(pricelistMonth) || 6;
  const isLegacyPreJune2016 = yearNum < 2016 || (yearNum === 2016 && monthNum < 6);

  if (!isLegacyPreJune2016) {
    const cycle = yearNum <= 2020 ? 'nedc' : 'wltp';
    const res = invertGreekRetailToLtpf(R, { co2, fuel, cycle, vatRate: 0.24 });
    return {
      ...res,
      regime: 'post_june_2016_progressive',
      regimeLabel: `ν. 4410/2016 & ν. 5222/2025 Άρθρο 136 (24% ΦΠΑ + 6-Κλιμακωτή Κλίμακα ΛΤΠΦ • ${cycle.toUpperCase()})`,
    };
  }

  // Legacy Pre-June 2016 Regime: 23% VAT + CC-based flat percentage × NEDC CO2 adjustment
  const f = String(fuel || 'petrol').toLowerCase();
  if (f === 'electric' || f === 'hydrogen') {
    const ltpf = Math.round(R / 1.23);
    return {
      ltpfEur: ltpf,
      vatEur: Math.round(ltpf * 0.23),
      registrationTaxEur: 0,
      retailPriceEur: R,
      regime: 'pre_june_2016_cc_scale',
      regimeLabel: 'Προ 06/2016 Καθεστώς (23% ΦΠΑ • Πλήρης Απαλλαγή Ηλεκτρικού BEV)',
    };
  }

  const ccBand = LEGACY_PRE_JUNE_2016_CC_BRACKETS.find((b) => cc <= b.maxCc) || LEGACY_PRE_JUNE_2016_CC_BRACKETS[5];
  let co2Factor = 1.0;
  if (co2 <= 100) co2Factor = 0.95;
  else if (co2 <= 120) co2Factor = 1.00;
  else if (co2 <= 140) co2Factor = 1.10;
  else if (co2 <= 160) co2Factor = 1.20;
  else if (co2 <= 180) co2Factor = 1.30;
  else if (co2 <= 200) co2Factor = 1.40;
  else if (co2 <= 250) co2Factor = 1.60;
  else co2Factor = 2.00;

  const isHybrid = f.includes('hybrid') || f === 'phev' || f === 'mhev' || f === 'hev';
  let effectiveTaxRate = ccBand.rate * co2Factor * (isHybrid ? 0.50 : 1.0);
  if (withWithdrawalBonus && cc <= 2000) {
    effectiveTaxRate *= 0.50; // Μέτρο Απόσυρσης (up to 50% reduction on registration tax for <=2000cc)
  }

  const ltpfExact = R / (1.23 + effectiveTaxRate);
  const ltpfEur = Math.round(ltpfExact);
  const vatEur = Math.round(ltpfEur * 0.23);
  const registrationTaxEur = Math.round(ltpfEur * effectiveTaxRate);

  return {
    ltpfEur,
    vatEur,
    registrationTaxEur,
    retailPriceEur: R,
    effectiveTaxMultiplier: effectiveTaxRate,
    regime: 'pre_june_2016_cc_scale',
    regimeLabel: `Προ 06/2016 Καθεστώς ν. 3833/2010 (23% ΦΠΑ + Συντελεστής ${Math.round(ccBand.rate * 100)}% για ${cc}cc × ${co2Factor} CO₂)`,
  };
}

// ============================================================================
// 2. MULTI-TRIM & MULTI-GENERATION GREEK IMPORTER `ΛΤΠΦ` MATRIX (2014–2026)
// ============================================================================

/**
 * Trim-tier keyword rules used to automatically select the exact Greek Importer trim
 * when a listing specifies a trim package (e.g., `R-Line`, `M-Sport`, `AMG Line`, `GR Sport`, `Style`, `Life`, `Active`).
 */
export const GREEK_TRIM_KEYWORD_DETECTORS = [
  { tier: 'flagship', re: /\b(premiere|first\s*edition|launch\s*edition|exclusive|inscription|autobiography|vignale|ultimate|laurin|klement|l&k|takumi|individual)\b/i },
  { tier: 'sport', re: /\b(r[\s-]?line|m[\s-]?sport|amg[\s-]?line|s[\s-]?line|gr[\s-]?sport|gt[\s-]?line|st[\s-]?line|n[\s-]?line|fr\b|monte\s*carlo|esprit\s*alpine|rs[\s-]?line|r[\s-]?design|veloce|ti\b|f[\s-]?sport)\b/i },
  { tier: 'mid', re: /\b(style|comfortline|highline|elegance|ambition|selection|design|x[\s-]?play|c[\s-]?enter|business|momentum|progressive|avantgarde|titanium|technic|techno|iconic|distinctive|passion|lounge|intens|feel|shine|glx)\b/i },
  { tier: 'base', re: /\b(essential|life|trendline|active|live|eco\b|pure\b|joy\b|basic|core|kinetic|urban|pop\b|easy|like\b|authentic|zen\b|gl\b|gl\+|comfort\b)\b/i },
];

/**
 * Generation-specific Historical Greek Importer `ΛΤΠΦ` ratios relative to 2025/2026 Official Greek `ΛΤΠΦ`,
 * calibrated against archival Toyota Hellas (2014–2026), Suzuki Hellas (2014–2026), Honda Saracakis (2016–2026),
 * Kosmocar VW/Audi, and BMW Group Hellas pricelists deposited at AADE (`ΔΙΠΕΑΑ`).
 *
 * Unlike a flat inflation multiplier, this separates:
 * - Generation 1 (`2014–2016` Pre-WLTP / Euro 6b era)
 * - Generation 2 (`2017–2019` Mid-cycle Euro 6c / 6d-TEMP era)
 * - Generation 3 (`2020–2022` Early WLTP / Mild-Hybrid transition era)
 * - Generation 4 (`2023–2026` Current GSR2 / Euro 6e mandatory ADAS era, which added €1,800–€2,900 to base ΛΤΠΦ)
 */
const GENERATION_LTPF_CURVES = {
  city_hatch: {
    // Yaris, Polo, Clio, 208, Corsa, i20, Fabia, Ibiza, Swift, Fiesta, C3, Aygo, Panda, 500
    2026: 1.015, 2025: 1.000, 2024: 0.975, 2023: 0.935,
    2022: 0.875, 2021: 0.830, 2020: 0.785, // Pre-GSR2 generation jump
    2019: 0.735, 2018: 0.710, 2017: 0.690, 2016: 0.665, 2015: 0.650, 2014: 0.635,
  },
  compact_c_segment: {
    // Golf, Corolla, Octavia, A3, 1 Series, A-Class, 308, Astra, Focus, i30, Ceed, Leon, Civic, Mazda3
    2026: 1.015, 2025: 1.000, 2024: 0.975, 2023: 0.945,
    2022: 0.895, 2021: 0.860, 2020: 0.820,
    2019: 0.775, 2018: 0.750, 2017: 0.725, 2016: 0.700, 2015: 0.680, 2014: 0.665,
  },
  suv_crossover: {
    // Yaris Cross, C-HR, T-Roc, Tiguan, Qashqai, 2008, 3008, Puma, Tucson, Sportage, X1, X3, GLA, GLC, Q3, Q5, XC40, XC60, Vitara
    2026: 1.015, 2025: 1.000, 2024: 0.980, 2023: 0.950,
    2022: 0.905, 2021: 0.870, 2020: 0.835,
    2019: 0.790, 2018: 0.765, 2017: 0.740, 2016: 0.715, 2015: 0.695, 2014: 0.680,
  },
  executive_luxury_sport: {
    // 3 Series, 5 Series, C-Class, E-Class, A4, A6, 911, Macan, Cayenne, AMG, M-Cars, RS-Cars
    2026: 1.015, 2025: 1.000, 2024: 0.980, 2023: 0.955,
    2022: 0.920, 2021: 0.890, 2020: 0.860,
    2019: 0.825, 2018: 0.800, 2017: 0.780, 2016: 0.760, 2015: 0.740, 2014: 0.720,
  },
};

/**
 * Generates the complete Multi-Trim Official Greek Importer Schedule (`Base`, `Mid`, `Sport`, `Flagship`)
 * for any matched Greek Importer model and target `Model Year / Pricelist Year`.
 */
export function buildMultiTrimGreekSchedule(baseEntry, text = '', targetYear = 2025, selectedTrimKey = '') {
  if (!baseEntry || !baseEntry.ltpf2025) return null;

  const y = Math.min(2026, Math.max(2014, Number(targetYear) || 2025));
  const lbl = String(baseEntry.label || '').toLowerCase();

  // Classify segment for generation-accurate historical curve
  let curveType = 'compact_c_segment';
  if (/\b(yaris(?!\s*cross)|polo|up!|clio|twingo|208|108|corsa|i10|i20|picanto|fabia|ibiza|swift|ignis|fiesta|c3|aygo|panda|500\b|mito|sandero|micra|jazz|mini\s*cooper)\b/i.test(lbl)) {
    curveType = 'city_hatch';
  } else if (baseEntry.body === 'suv' || /\b(suv|cross|t-roc|t-cross|tiguan|touareg|q2|q3|q5|q7|q8|x1|x2|x3|x4|x5|x6|x7|gla|glb|glc|gle|gls|2008|3008|5008|captur|austral|duster|puma|kuga|tucson|kona|sportage|niro|xc40|xc60|xc90|vitara|s-cross|qashqai|juke|x-trail|macan|cayenne|formentor|ateca|arona|kamiq|karoq|kodiaq|c-hr|rav4|avenger|renegade|compass|tonale|stelvio)\b/i.test(lbl)) {
    curveType = 'suv_crossover';
  } else if (baseEntry.ltpf2025 >= 35000 || /\b(320|330|m3|m4|520|530|c\s*180|c\s*200|c\s*220|c\s*300|e\s*200|e\s*220|a4|a5|a6|s3|rs3|gti|golf\s*r|cupra|porsche|911|boxster|cayman|taycan|amg|giulia)\b/i.test(lbl)) {
    curveType = 'executive_luxury_sport';
  }

  const curve = GENERATION_LTPF_CURVES[curveType] || GENERATION_LTPF_CURVES.compact_c_segment;
  const yearFactor = curve[y] ?? (y < 2014 ? 0.62 : 1.0);
  const cycle = y <= 2020 ? 'nedc' : 'wltp';

  // The catalog `ltpf2025` represents the core Entry/Mid Greek Importer trim.
  // Construct the 4 statutory Greek Importer trim tiers (Entry/Base, Mid/Comfort/Style, Sport-Line, Flagship):
  const isAlreadySportModel = /\b(gti|golf\s*r|s3|rs3|m135|m2|m3|m4|amg|cupra|vrs|gr\s*yaris|type\s*r|911|cayman|boxster)\b/i.test(lbl);

  const trimMultipliers = isAlreadySportModel
    ? [
        { key: 'base', name: 'Standard Performance Trim (Βασική Έκδοση Εισαγωγέα)', mult: 1.00, co2Delta: 0 },
        { key: 'mid', name: 'Plus / Comfort Pack Trim', mult: 1.045, co2Delta: 1 },
        { key: 'sport', name: 'Competition / Track / Performance Pack', mult: 1.095, co2Delta: 3 },
        { key: 'flagship', name: 'Exclusive / Individual Edition', mult: 1.15, co2Delta: 4 },
      ]
    : [
        { key: 'base', name: 'Base / Entry Trim (Active / Life / Essential / Core)', mult: 0.955, co2Delta: -2 },
        { key: 'mid', name: 'Mid / Volume Trim (Style / Business / Design / Techno)', mult: 1.000, co2Delta: 0 },
        { key: 'sport', name: 'Sport-Line Trim (R-Line / M-Sport / AMG-Line / S-Line / GR-Sport / GT-Line)', mult: 1.060, co2Delta: 2 },
        { key: 'flagship', name: 'Flagship Trim (Premiere / Exclusive / Inscription / Vignale / L&K)', mult: 1.115, co2Delta: 4 },
      ];

  const baseCo2ForCycle = y <= 2020 && baseEntry.co2 > 0
    ? Math.round(baseEntry.co2 * 0.86) // NEDC vs WLTP homologation adjustment for pre-2021 MY
    : baseEntry.co2;

  const trims = trimMultipliers.map((t) => {
    const ltpfEur = Math.round(baseEntry.ltpf2025 * yearFactor * t.mult);
    const co2 = baseEntry.fuel === 'electric' ? 0 : Math.max(0, baseCo2ForCycle + t.co2Delta);
    const retailCalc = computeGreekRetailFromLtpf(ltpfEur, {
      co2,
      fuel: baseEntry.fuel,
      cycle,
      vatRate: y < 2016 ? 0.23 : 0.24,
    });
    return {
      key: t.key,
      name: t.name,
      ltpfEur,
      apltEur: retailCalc.retailPriceEur,
      co2,
      cycle,
      modelYear: y,
    };
  });

  // Auto-detect which trim tier matches the listing text (or user's explicit `selectedTrimKey`)
  let activeKey = selectedTrimKey && trims.some((t) => t.key === selectedTrimKey) ? selectedTrimKey : '';
  let autoDetectedFromText = false;
  if (!activeKey) {
    for (const det of GREEK_TRIM_KEYWORD_DETECTORS) {
      if (det.re.test(text)) {
        activeKey = det.tier;
        autoDetectedFromText = true;
        break;
      }
    }
  }
  if (!activeKey) {
    activeKey = isAlreadySportModel ? 'base' : 'mid';
  }

  const activeTrim = trims.find((t) => t.key === activeKey) || trims[1];
  const lowTrim = trims[0];
  const highTrim = trims[2]; // Base-to-Sport spread when trim is not explicitly locked

  return {
    activeTrimKey: activeTrim.key,
    activeTrimName: activeTrim.name,
    autoDetectedFromText,
    ltpfEur: activeTrim.ltpfEur,
    apltEur: activeTrim.apltEur,
    co2: activeTrim.co2,
    cycle: activeTrim.cycle,
    modelYear: y,
    ltpfRange: autoDetectedFromText || selectedTrimKey
      ? { low: activeTrim.ltpfEur, mid: activeTrim.ltpfEur, high: activeTrim.ltpfEur }
      : { low: lowTrim.ltpfEur, mid: activeTrim.ltpfEur, high: highTrim.ltpfEur },
    availableGreekTrims: trims,
  };
}

// ============================================================================
// 3. STATUTORY CLIFF & VIN 10TH-DIGIT MODEL-YEAR FORENSIC AUDITOR
// ============================================================================

/**
 * ISO 3779 VIN 10th Character -> Manufacturing Model Year (`Έτος Κατασκευής`)
 */
const VIN_YEAR_MAP = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017,
  J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025, T: 2026,
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
};

/**
 * Decodes the 10th character of a 17-character VIN into the vehicle's Manufacturing / Model Year (`Έτος Κατασκευής`),
 * taking care to skip European manufacturers that use `0` or `Z` in position 10.
 */
export function decodeVinManufacturingYear(vin, regYear) {
  const clean = String(vin || '').trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  if (clean.length !== 17) return null;
  const ch10 = clean[9];
  if (ch10 === '0' || ch10 === 'Z' || ch10 === 'U') return null;
  const decodedYear = VIN_YEAR_MAP[ch10];
  if (!decodedYear) return null;
  // Sanity check: VIN model year must be within [-3, +1] years of First Registration Year
  if (regYear && (decodedYear > regYear + 1 || decodedYear < regYear - 4)) {
    return null;
  }
  return decodedYear;
}

/**
 * Audits a vehicle for the 4 Statutory Customs Boundary Cliffs (`ν. 5222/2025 Άρθρα 136 & 138`):
 * 1. **1-Gram CoC #49.4 CO₂ Step Cliff:** Checks if `CO₂` is within ±5 g/km of a statutory step boundary.
 * 2. **VIN 10th-Digit Manufacturing Year (`Έτος Κατασκευής`) vs First Registration Year:**
 *    - Pricelist Year Lock (`ΔΙΠΕΑΑ` values the car on its Manufacturing Model Year pricelist).
 *    - Late-Registration Depreciation Cap (`ν. 5222/2025 Άρθρο 138 §1` when registered >1 calendar year after manufacture).
 *    - `31/12/2020` vs `01/01/2021` NEDC-to-WLTP Cycle Boundary.
 * 3. **Progressive `ΛΤΠΦ` Bracket Cliff** (`€14,000 / €17,000 / €20,000 / €25,000 / €30,000`).
 * 4. **01/09/2018 Euro 6b/c (`+50%` surcharge) vs Euro 6d-TEMP (`0%` surcharge) Cliff.**
 */
export function auditStatutoryCliffsAndVinMy({
  vin = '',
  regYear = 2021,
  regMonth = 6,
  co2 = 135,
  fuel = 'petrol',
  baseLtpfEur = 22000,
  extrasEur = 0,
  taxableEur = 0,
  midScenarioTaxEur = 0,
  ltpfProvenance = '',
  availableGreekTrims = null,
  activeTrimKey = null,
  runScenarioFn = null,
} = {}) {
  const alerts = [];
  const vinModelYear = decodeVinManufacturingYear(vin, regYear);
  const effectivePricelistYear = vinModelYear && vinModelYear < regYear ? vinModelYear : regYear;

  // 1. VIN Manufacturing Year vs Registration Year Audit (ν. 5222/2025 Άρθρο 138 §1)
  if (vinModelYear && vinModelYear < regYear) {
    const yearGap = regYear - vinModelYear;
    alerts.push({
      code: 'VIN_MY_MISMATCH',
      severity: yearGap >= 2 ? 'critical' : 'warning',
      title: `VIN Manufacturing Year (MY${vinModelYear}) Earlier Than 1st Registration (${regYear})`,
      detail:
        yearGap >= 2
          ? `VIN position 10 encodes MY${vinModelYear}, but 1st registration is ${regYear} (${yearGap}-year gap). Under ν. 5222/2025 Άρθρο 138 §1, customs locks the ΛΤΠΦ pricelist to MY${vinModelYear} AND inspects late-registration age depreciation rules.`
          : `VIN position 10 encodes MY${vinModelYear} (registered in ${String(regMonth).padStart(2, '0')}/${regYear}). Greek Customs (ΔΙΠΕΑΑ) pulls the archival ${vinModelYear} Greek Importer ΛΤΠΦ pricelist rather than ${regYear}.`,
      effectivePricelistYear: vinModelYear,
    });
  }

  // 2. 1-Gram CoC #49.4 CO₂ Step Cliff Audit
  const f = String(fuel || 'petrol').toLowerCase();
  const isHybridAny =
    f === 'plugin_hybrid' || f === 'phev' || f.includes('plug') ||
    f === 'hybrid' || f === 'mild_hybrid' || f === 'mhev' || f === 'hev';

  if (f !== 'electric' && f !== 'hydrogen' && co2 > 0) {
    const isNedc = regYear < 2021;
    const boundaries = isNedc
      ? [
          { g: 100, fromLabel: '-5% (×0.95)', toLabel: '0% (×1.00)', jumpPct: '+5.3%' },
          { g: 120, fromLabel: '0% (×1.00)', toLabel: '+10% (×1.10)', jumpPct: '+10.0%' },
          { g: 140, fromLabel: '+10% (×1.10)', toLabel: '+20% (×1.20)', jumpPct: '+9.1%' },
          { g: 160, fromLabel: '+20% (×1.20)', toLabel: '+30% (×1.30)', jumpPct: '+8.3%' },
          { g: 180, fromLabel: '+30% (×1.30)', toLabel: '+40% (×1.40)', jumpPct: '+7.7%' },
          { g: 200, fromLabel: '+40% (×1.40)', toLabel: '+60% (×1.60)', jumpPct: '+14.3%' },
          { g: 250, fromLabel: '+60% (×1.60)', toLabel: '+100% (×2.00)', jumpPct: '+25.0%' },
        ]
      : [
          { g: 130, fromLabel: '-5% (×0.95)', toLabel: '0% (×1.00)', jumpPct: '+5.3%' },
          { g: 156, fromLabel: '0% (×1.00)', toLabel: '+10% (×1.10)', jumpPct: '+10.0%' },
          { g: 182, fromLabel: '+10% (×1.10)', toLabel: '+20% (×1.20)', jumpPct: '+9.1%' },
          { g: 208, fromLabel: '+20% (×1.20)', toLabel: '+30% (×1.30)', jumpPct: '+8.3%' },
          { g: 234, fromLabel: '+30% (×1.30)', toLabel: '+40% (×1.40)', jumpPct: '+7.7%' },
          { g: 260, fromLabel: '+40% (×1.40)', toLabel: '+60% (×1.60)', jumpPct: '+14.3%' },
          { g: 325, fromLabel: '+60% (×1.60)', toLabel: '+100% (×2.00)', jumpPct: '+25.0%' },
        ];

    if (isHybridAny) {
      boundaries.unshift({
        g: 50,
        fromLabel: '75% Hybrid Tax Relief V34/V35 (×0.25)',
        toLabel: '50% Hybrid Tax Relief V32/V33 (×0.50)',
        jumpPct: '+100% (Doubles Tax!)',
      });
    }

    for (const b of boundaries) {
      const dist = co2 - b.g;
      if (Math.abs(dist) <= 5) {
        const altCo2 = dist <= 0 ? b.g + 1 : b.g;
        let deltaEur = null;
        if (typeof runScenarioFn === 'function') {
          const altRes = runScenarioFn(altCo2);
          if (altRes && typeof altRes.registrationTaxEur === 'number') {
            deltaEur = altRes.registrationTaxEur - midScenarioTaxEur;
          }
        }
        const deltaStr = deltaEur != null
          ? ` (${deltaEur >= 0 ? '+' : ''}€${deltaEur.toLocaleString()} Registration Tax swing)`
          : ` (${b.jumpPct} tax multiplier jump)`;
        alerts.push({
          code: 'CO2_STEP_CLIFF',
          severity: Math.abs(dist) <= 2 || b.g === 50 ? 'critical' : 'warning',
          title: `1-Gram CoC #49.4 CO₂ Boundary Cliff at ${b.g} g/km (${isNedc ? 'NEDC' : 'WLTP'})`,
          detail:
            dist <= 0
              ? `Vehicle CO₂ (${co2} g/km) is only ${Math.abs(dist)} g/km below the ${b.g} g/km statutory cliff. If larger factory wheels/options on the physical CoC (#49.4) push CO₂ to ${b.g + 1} g/km, the multiplier jumps from ${b.fromLabel} to ${b.toLabel}${deltaStr}.`
              : `Vehicle CO₂ (${co2} g/km) is only ${dist} g/km above the ${b.g} g/km statutory cliff (${b.toLabel}). If the exact CoC (#49.4) states ≤${b.g} g/km, the multiplier drops to ${b.fromLabel}${deltaStr}.`,
          boundaryGkm: b.g,
          deltaEur,
        });
      }
    }
  }

  // 3. ν. 5313/2026 Άρθρο 10 (Ε.2039/2026) Hybrid 75% -> 50% Sunset Cliff on 01/01/2027
  if (isHybridAny && co2 > 0 && co2 <= 50) {
    alerts.push({
      code: 'HYBRID_2027_SUNSET_CLIFF',
      severity: 'warning',
      title: `ν. 5313/2026 Άρθρο 10 (Ε.2039/2026): 75% Hybrid Relief (V34/V35) Repealed on 01/01/2027`,
      detail: `Hybrids (HEV/PHEV) with CO₂ ≤ 50 g/km cleared up to 31/12/2026 receive 75% Registration Tax exemption (ICISnet codes V34/V35, paying 25% = €${midScenarioTaxEur.toLocaleString()}). From 01/01/2027 onwards, ν. 5313/2026 Άρθρο 10 §1 repeals the 75% tier and applies a flat 50% exemption (V32/V33, doubling Registration Tax to ~€${(midScenarioTaxEur * 2).toLocaleString()}).`,
    });
  }

  // 4. CoC #48 / V.9 Euro Emission Character Audit (ΑΑΔΕ Ε.2125/2020 Παράρτημα ΙΙΙ)
  if (regYear >= 2009 && regYear <= 2018 && f !== 'electric' && f !== 'hydrogen') {
    alerts.push({
      code: 'COC_48_EURO_CHARACTER_AUDIT',
      severity: regYear === 2012 || regYear === 2013 || regYear === 2015 || regYear === 2018 ? 'warning' : 'info',
      title: `Ε.2125/2020 Παράρτημα ΙΙΙ: Verify CoC #48 / V.9 Euro Emission Character (Χαρακτήρας)`,
      detail:
        regYear <= 2013
          ? `For ${regYear} vehicles, ICISnet classifies Euro 5a (chars A–E, cut-off ≤31/12/2012 → Κωδ. 1015: +200% ΤΤ + €1,000 Περιβαλλοντικό Τέλος) vs Euro 5b (chars F, G, J, K → Κωδ. 1014: +100% ΤΤ + €1,000) vs early Euro 6a (char N → Κωδ. 1004: +200%, €0 fee) strictly by the EU Type-Approval character in CoC #48 / Registration V.9.`
          : `For ${regYear} Euro 6 vehicles, ICISnet assigns Κωδ. 1003 (+100% for early Euro 6b chars Q, T), Κωδ. 1002 (+50% for Euro 6b/c chars W, BA, ZA, ZD, AA, ZG, ZJ), or Κωδ. 1001 (0% surcharge for Euro 6c/6d-TEMP chars AD, AG, BG, CG, DG, AJ, AM, AP, EA, EB, EC) strictly by the character in CoC #48 / Registration V.9.`,
    });
  }

  // 5. ΑΑΔΕ Α.1016/2025 & Α.1043/2025 Άρθρο 6 §2 Pricelist & 15-Day Importer Rule Audit
  if (availableGreekTrims && availableGreekTrims.length > 1 && !activeTrimKey) {
    alerts.push({
      code: 'AADE_A1043_UNIQUE_TRIM_RULE',
      severity: 'info',
      title: `Α.1043/2025 Άρθρο 6 §2 & Α.1016/2025: Unique Trim Isolation & 15-Day Importer Rule`,
      detail: `Under Α.1043/2025 Άρθρο 6 §2, matching a Greek Importer ΛΤΠΦ pricelist via a VIN Equipment Card requires all 6 cumulative criteria (Year, Make, Model, CC, HP, CO₂) AND must isolate one and only one trim (μία και μόνο έκδοση). Under Α.1016/2025, third-party VIN cards (PartsLink24/DAT) are accepted only if the official Greek importer has declared permanent inability or failed to reply within 15 calendar days.`,
    });
  }

  // 6. ν. 5313/2026 Άρθρα 11 & 12 (Ε.2036/2026) Mandatory Bank Transfer & Art. 52 Margin Scheme Penalty Audit
  if (taxableEur > 0) {
    const nonBankFineEur = Math.round(taxableEur * 0.24);
    const falseMarginFineEur = Math.round(taxableEur * 0.72);
    alerts.push({
      code: 'LAW_5313_2026_ANTI_FRAUD_AUDIT',
      severity: 'info',
      title: `ν. 5313/2026 Άρθρα 11–12 (Ε.2036/2026): 100% Bank Transfer & Art. 52 VIES (Code 2021) Audit`,
      detail: `100% of the foreign invoice must be paid via electronic bank transfer BEFORE ΔΕΦΚ submission (non-bank payment fine = 24% of Φορολογητέα Αξία = €${nonBankFineEur.toLocaleString()} per Άρθρο 154 §Α6α). For EU Margin Scheme (§25a UStG / Άρθρο 52) cars, Seller VIES VAT ID (code 2021 in Box 44.1) is verified; invalid Margin Scheme claims incur a 72% fine (€${falseMarginFineEur.toLocaleString()}) + 24% Greek VAT + vehicle seizure (Άρθρο 154 §Α6β & §Γ1).`,
      nonBankFineEur,
      falseMarginFineEur,
    });
  }

  // 7. Total Pre-Depreciation Wholesale Base (`Πεδίο 832 = ΛΤΠΦ + Extras`) Bracket Cliff
  const totalBase = (Number(baseLtpfEur) || 0) + (Number(extrasEur) || 0);
  const ltpfCliffs = [
    { limit: 14000, belowRate: '4%', aboveRate: '26% marginal' },
    { limit: 17000, belowRate: '26%', aboveRate: '53% marginal' },
    { limit: 20000, belowRate: '53%', aboveRate: '62% marginal' },
    { limit: 25000, belowRate: '62%', aboveRate: '71% marginal' },
  ];
  for (const lc of ltpfCliffs) {
    const diff = lc.limit - totalBase;
    if (diff > 0 && diff <= 1200) {
      alerts.push({
        code: 'LTPF_BRACKET_PROXIMITY',
        severity: 'info',
        title: `Πεδίο 832 Wholesale Base (€${totalBase.toLocaleString()}) Near €${lc.limit.toLocaleString()} Marginal Cliff`,
        detail: `Only €${diff.toLocaleString()} below the €${lc.limit.toLocaleString()} progressive bracket threshold where the marginal base tax rate jumps from ${lc.belowRate} to ${lc.aboveRate} on every additional Euro of factory extras (Α.1043/2025).`,
      });
    }
  }

  return {
    vinModelYear,
    effectivePricelistYear,
    alerts,
  };
}

// ============================================================================
// 4. OEM BUILD-SHEET & `carVertical` PARSER (ΑΑΔΕ Α.1043/2025 ANNEX I)
// ============================================================================

/**
 * Comprehensive OEM Option Code & Free-Text Equipment Valuation Dictionary
 * (BMW/MINI `S-codes`, VAG/Porsche `PR-codes`, Mercedes `SA-codes`, and Universal Equipment).
 * Prices represent official Greek Importer Pre-Tax Option Values (`ΛΤΠΦ Προαιρετικού Εξοπλισμού`)
 * used on **ΑΑΔΕ Α.1043/2025 (ΦΕΚ Β΄ 1257/2025) Υπόδειγμα Ι — Δήλωση Εξοπλισμού και Αξίας**.
 */
export const OEM_EQUIPMENT_VALUATION_CATALOG = [
  // Exterior & Sport Packages
  { id: 'sport_pkg', codeRe: /\b(S337A?|WIE|P29|P31|950|PQD|7LF|7LX)\b/i, textRe: /\b(m[\s-]?sport\s*(package|paket|pro)?|amg[\s-]?line|s[\s-]?line\s*(exterior|package|paket)|r[\s-]?line\s*(package|paket)|gr[\s-]?sport\s*pack)\b/i, label: 'OEM Sport Exterior/Interior Package (M-Sport / AMG-Line / S-Line / R-Line)', greekPreTaxEur: 2450, category: 'Packages' },
  { id: 'aero_carbon_pkg', codeRe: /\b(S71CA?|S715A?|P77|773|B14)\b/i, textRe: /\b(carbon\s*(exterior|interior|roof|package|paket|trim)|m\s*carbon|amg\s*carbon)\b/i, label: 'OEM Carbon Fibre Exterior / Interior Package', greekPreTaxEur: 2600, category: 'Packages' },
  { id: 'night_shadow_pkg', codeRe: /\b(S760A?|S7M9A?|P55|P60|4ZD)\b/i, textRe: /\b(shadow\s*line|night\s*(package|paket)|black\s*optic\s*pack)\b/i, label: 'High-Gloss Shadow Line / Night Package / Black Optics', greekPreTaxEur: 580, category: 'Exterior' },
  { id: 'metallic_paint', codeRe: /\b(MET|S0M|475|A83|A90|A96|C1D|C31|C4P|C4W|197|775|890|992|2T2T|0E0E)\b/i, textRe: /\b(metallic\s*paint|μεταλλικό\s*χρώμα|perlmutt|pearl\s*effect|mineral\s*white|sapphire\s*black|selenite\s*grey|mythos\s*black|daytona\s*grey)\b/i, label: 'Metallic / Pearl Effect Exterior Paint (Μεταλλικό Χρώμα)', greekPreTaxEur: 690, category: 'Exterior' },

  // Roof & Glazing
  { id: 'panorama_roof', codeRe: /\b(S402A?|S403A?|S407A?|3FU|PS1|PS2|413|414|3FE)\b/i, textRe: /\b(panoram\w*\s*(glass\s*)?(roof|sunroof|schiebedach)|electric\s*(glass\s*)?sunroof|ηλεκτρική\s*ηλιοροφή|πανοραμική\s*οροφή)\b/i, label: 'Electric Panoramic Glass Sunroof (Πανοραμική Ηλιοροφή)', greekPreTaxEur: 1280, category: 'Exterior' },
  { id: 'privacy_acoustic_glass', codeRe: /\b(S420A?|S3KAA?|VW1|VW5|4KF|840|851)\b/i, textRe: /\b(sun\s*protection\s*glazing|privacy\s*glass|acoustic\s*(comfort\s*)?glazing|tinted\s*rear\s*windows|φιμέ\s*κρύσταλλα)\b/i, label: 'Sun Protection / Acoustic Comfort Glazing (Φιμέ / Ηχομονωτικά Κρύσταλλα)', greekPreTaxEur: 360, category: 'Exterior' },

  // Lighting Systems
  { id: 'matrix_laser_lights', codeRe: /\b(S552A?|S5AZA?|8IU|8G4|8JU|642|P35|318|8EX|8IS)\b/i, textRe: /\b(matrix\s*led|iq\.?\s*light|bmw\s*laser\s*light|laserlight|multibeam\s*led|digital\s*light|hd\s*matrix|adaptive\s*led\s*headlights|προβολείς\s*matrix|laser)\b/i, label: 'Adaptive Matrix LED / Laser / Multibeam Headlights', greekPreTaxEur: 1390, category: 'Lighting' },

  // Chassis, Brakes & Wheels
  { id: 'air_adaptive_susp', codeRe: /\b(S223A?|S2VRA?|S2VHA?|1BK|1BY|2H4|PDD|489|459|1BV|1PAS)\b/i, textRe: /\b(adaptive\s*(m\s*)?(suspension|chassis|damping)|dcc\b|air\s*suspension|airmatic|pasm\b|front\s*axle\s*lift|αερανάρτηση|ρυθμιζόμενη\s*ανάρτηση)\b/i, label: 'Adaptive Damping / Air Suspension / PASM / DCC', greekPreTaxEur: 1450, category: 'Chassis' },
  { id: 'ceramic_sport_brakes', codeRe: /\b(S2NKA?|S2NHA?|1KU|1LX|B07|450|PCCB)\b/i, textRe: /\b(carbon[\s-]?ceramic\s*brakes|pccb\b|m\s*compound\s*brakes|m\s*sport\s*brakes|amg\s*high[\s-]?performance\s*brakes|κεραμικά\s*φρένα)\b/i, label: 'Performance / M-Sport / Carbon-Ceramic Braking System', greekPreTaxEur: 1850, category: 'Chassis' },
  { id: 'sport_chrono_exhaust', codeRe: /\b(8LH|0P8|0P9|S1MAA?|U78)\b/i, textRe: /\b(sport\s*chrono|sport\s*exhaust|akrapovic|m\s*sport\s*exhaust|amg\s*performance\s*exhaust)\b/i, label: 'Sport Chrono Package / Switchable Sport Exhaust', greekPreTaxEur: 1680, category: 'Chassis' },
  { id: 'upgraded_alloy_wheels', codeRe: /\b(S2T6A?|S20TA?|S21PA?|S1U0A?|PJ5|PJ8|42R|54R|RQT|RVQ)\b/i, textRe: /\b(19[\s"-]*inch|20[\s"-]*inch|21[\s"-]*inch|22[\s"-]*inch|turbine\s*wheels|forged\s*wheels|ζάντες\s*(19|20|21|22))\b/i, label: 'Upgraded Factory Light-Alloy / Forged Wheels (19"–22")', greekPreTaxEur: 1120, category: 'Chassis' },

  // Interior, Seats & Comfort
  { id: 'full_leather_upholstery', codeRe: /\b(S4U0A?|LCSM|LCSW|NL\w+|VA\w+|N1H|N5D|N7V|201A|211A|801A|501A|WL1)\b/i, textRe: /\b(full\s*leather|vernasca\s*leather|merino\s*leather|dakota\s*leather|nappa\s*leather|valcona\s*leather|vienna\s*leather|δερμάτινο\s*σαλόνι|suite\s*interior\s*design|fine\s*nappa)\b/i, label: 'Full Leather / Nappa / Vernasca / Suite Interior Upholstery', greekPreTaxEur: 1490, category: 'Interior' },
  { id: 'electric_memory_seats', codeRe: /\b(S459A?|S456A?|S481A?|S488A?|3L4|PV3|Q1D|Q4Q|275|242|P64)\b/i, textRe: /\b(electric\s*seats\s*with\s*memory|memory\s*seats|14[\s-]?way\s*seats|18[\s-]?way\s*seats|comfort\s*seats|sport\s*seats\s*plus|ηλεκτρικά\s*καθίσματα\s*με\s*μνήμες)\b/i, label: 'Electric Comfort / Sport Seats with Driver Memory', greekPreTaxEur: 980, category: 'Interior' },
  { id: 'heated_ventilated_seats', codeRe: /\b(S494A?|S453A?|4A3|4A4|4D3|873|401)\b/i, textRe: /\b(seat\s*heating|heated\s*(front\s*)?seats|ventilated\s*seats|sitzheizung|θερμαινόμενα\s*καθίσματα)\b/i, label: 'Heated / Ventilated Front Seats (Θερμαινόμενα Καθίσματα)', greekPreTaxEur: 380, category: 'Interior' },
  { id: 'keyless_comfort_access', codeRe: /\b(S322A?|4F2|4I3|P17|889|893)\b/i, textRe: /\b(comfort\s*access|keyless\s*(go|entry|access)|kessy\b|hands[\s-]?free\s*access)\b/i, label: 'Comfort Access / Keyless-Go Entry & Start', greekPreTaxEur: 520, category: 'Comfort' },
  { id: 'heat_pump_aux_heating', codeRe: /\b(S4T9A?|9M9|S536A?)\b/i, textRe: /\b(heat\s*pump|αντλία\s*θερμότητας|auxiliary\s*heating|standheizung|w\u00e4rmepumpe)\b/i, label: 'Heat Pump / Auxiliary Cabin Heater (Αντλία Θερμότητας)', greekPreTaxEur: 620, category: 'Comfort' },

  // Infotainment, Audio & Driver Assistance (ADAS)
  { id: 'head_up_display', codeRe: /\b(S610A?|KS1|KS2|463|HUD)\b/i, textRe: /\b(head[\s-]?up\s*display|hud\b)\b/i, label: 'Windshield Head-Up Display (HUD)', greekPreTaxEur: 890, category: 'Infotainment' },
  { id: 'premium_sound_system', codeRe: /\b(S688A?|S674A?|S6F1A?|9VS|9VJ|8RF|810|811|9VL)\b/i, textRe: /\b(harman\s*\/?\s*kardon|burmester|bang\s*(&|and)\s*olufsen|b&o\s*sound|bose\s*sound|bowers\s*(&|and)\s*wilkins|jbl\s*premium|beats\s*audio|focal\s*hi[\s-]?fi|canton\s*sound)\b/i, label: 'Premium Branded Surround Sound System (H/K · Burmester · B&O · Bose)', greekPreTaxEur: 880, category: 'Infotainment' },
  { id: 'nav_pro_cockpit', codeRe: /\b(S609A?|S6U3A?|7UG|9S8|9S9|PBF|531|P49)\b/i, textRe: /\b(navigation\s*system\s*professional|live\s*cockpit\s*professional|virtual\s*cockpit\s*plus|mmi\s*navigation\s*plus|discover\s*pro|widescreen\s*cockpit)\b/i, label: 'Navigation System Professional / Digital Cockpit Pro', greekPreTaxEur: 1150, category: 'Infotainment' },
  { id: 'driving_assistant_acc', codeRe: /\b(S5ASA?|S5ATA?|S5DFA?|8T8|PC2|P20|239|233|79B)\b/i, textRe: /\b(driving\s*assistant\s*(plus|professional)?|adaptive\s*cruise\s*control|acc\b|distronic\s*(plus|pro)?|travel\s*assist|pilot\s*assist)\b/i, label: 'Adaptive Cruise Control (ACC / Distronic / Driving Assistant Plus)', greekPreTaxEur: 840, category: 'ADAS' },
  { id: 'surround_camera_360', codeRe: /\b(S5DNA?|S5DLA?|S3AGA?|KA2|KA6|P47|501|FT3)\b/i, textRe: /\b(360[\s°]*\s*(surround\s*view|camera|area\s*view)|parking\s*assistant\s*plus|surround\s*view|κάμερα\s*360|park\s*assist\s*plus)\b/i, label: 'Parking Assistant Plus / 360° Surround View Camera', greekPreTaxEur: 690, category: 'ADAS' },
  { id: 'towbar_hitch', codeRe: /\b(S3ACA?|1D4|1D9|1M6|550)\b/i, textRe: /\b(electrically\s*folding\s*towbar|trailer\s*hitch|anh\u00e4ngerkupplung|ahk\b|κοτσαδόρος)\b/i, label: 'Swiveling / Detachable Factory Towbar (Εργοστασιακός Κοτσαδόρος)', greekPreTaxEur: 780, category: 'Exterior' },
];

/**
 * Parses a raw OEM VIN Build Sheet (`BMW S-codes`, `VAG PR-codes`, `Mercedes SA-codes`, or `carVertical` text)
 * into a structured list of Greek Importer Pre-Tax Option Values (`ΑΑΔΕ Α.1043/2025 Annex I`).
 */
export function parseOemBuildSheetToGreekExtras(rawText = '', { regYear = 2021 } = {}) {
  const text = String(rawText || '').trim();
  if (!text) {
    return {
      detectedItems: [],
      totalExtrasPreTaxEur: 0,
      rawCodeCount: 0,
      summaryLabel: 'No build-sheet text provided',
    };
  }

  // Historical scaling for option prices (options in 2016–2020 were ~10–18% lower pre-tax than 2025)
  const y = Math.min(2026, Math.max(2014, Number(regYear) || 2021));
  const yearOptionMult = y >= 2024 ? 1.0 : y >= 2021 ? 0.94 : y >= 2018 ? 0.88 : 0.82;

  const detectedItems = [];
  for (const item of OEM_EQUIPMENT_VALUATION_CATALOG) {
    const codeMatch = item.codeRe ? text.match(item.codeRe) : null;
    const textMatch = !codeMatch && item.textRe ? text.match(item.textRe) : null;
    if (codeMatch || textMatch) {
      const matchedToken = (codeMatch ? codeMatch[0] : textMatch[0]).trim();
      const greekPreTaxEur = Math.round((item.greekPreTaxEur * yearOptionMult) / 10) * 10;
      detectedItems.push({
        id: item.id,
        matchedToken,
        matchType: codeMatch ? 'OEM Option Code' : 'Equipment Description',
        label: item.label,
        category: item.category,
        greekPreTaxEur,
      });
    }
  }

  const totalExtrasPreTaxEur = detectedItems.reduce((sum, it) => sum + it.greekPreTaxEur, 0);

  return {
    detectedItems,
    totalExtrasPreTaxEur,
    itemCount: detectedItems.length,
    modelYearApplied: y,
    lawRef: 'ΑΑΔΕ Α.1043/2025 (ΦΕΚ Β΄ 1257/2025) Υπόδειγμα Ι — Δήλωση Εξοπλισμού και Αξίας',
    summaryLabel:
      detectedItems.length > 0
        ? `Parsed ${detectedItems.length} OEM Factory Options → Total Pre-Tax Extras: €${totalExtrasPreTaxEur.toLocaleString()} (Α.1043/2025)`
        : 'No chargeable extra options matched in pasted text',
  };
}

// ============================================================================
// 5. ON-DEMAND GREEK IMPORTER PRICELIST & MULTI-TRIM SEARCH ENGINE
// ============================================================================

/**
 * Searches the Official Greek Importer `ΛΤΠΦ` Catalog (`GREEK_IMPORTER_LTPF_CATALOG`)
 * by model keywords and target registration/manufacturing year (`2014–2026`), returning
 * ranked matches along with each match's 4-tier Greek Importer Trim Schedule (`Base`, `Mid`, `Sport-Line`, `Flagship`).
 */
export function searchGreekImporterPricelists(query = '', { year = 2022, trimKey = '' } = {}) {
  const q = String(query || '').trim();
  const targetYear = Math.min(2026, Math.max(2014, Number(year) || 2022));
  if (!q) {
    return {
      query: q,
      year: targetYear,
      matches: [],
      portals: GREEK_IMPORTER_PORTALS,
    };
  }

  const tokens = q
    .toLowerCase()
    .replace(/[^a-z0-9.\-+]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const scored = [];
  for (const entry of GREEK_IMPORTER_LTPF_CATALOG) {
    let score = 0;
    if (entry.re.test(q)) {
      score += 100;
    }
    const labelLower = entry.label.toLowerCase();
    for (const tok of tokens) {
      if (labelLower.includes(tok)) {
        score += 18;
      }
    }
    if (score >= 18) {
      const schedule = buildMultiTrimGreekSchedule(entry, q, targetYear, trimKey);
      scored.push({
        score,
        label: entry.label,
        cc: entry.cc,
        fuel: entry.fuel,
        body: entry.body,
        ltpf2025: entry.ltpf2025,
        aplt2025: entry.aplt2025,
        targetYear,
        activeTrimKey: schedule.activeTrimKey,
        activeTrimName: schedule.activeTrimName,
        ltpfEur: schedule.ltpfEur,
        apltEur: schedule.apltEur,
        co2: schedule.co2,
        cycle: schedule.cycle,
        trims: schedule.availableGreekTrims,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return {
    query: q,
    year: targetYear,
    matches: scored.slice(0, 12),
    portals: GREEK_IMPORTER_PORTALS,
  };
}

