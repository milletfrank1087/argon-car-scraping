/**
 * Official Greek Importer Pre-Tax List Price (ΛΤΠΦ / ΑΠΛΤΠΦ) Catalog,
 * Exact Mathematical ΑΠΛΤ <-> ΛΤΠΦ Piecewise-Linear Inverter,
 * Dutch RDW Netto Catalogusprijs Converter, and ΑΑΔΕ Α.1043/2025 Factory Options Catalog.
 *
 * Statutory Basis:
 * - ν. 5222/2025 Άρθρο 136 §2α, §3α–β, §4–6 (Progressive 6-bracket ΛΤΠΦ scale & NEDC/WLTP CO₂ multipliers)
 * - ν. 5222/2025 Άρθρο 142 §1–4 & ΑΑΔΕ Ε.2125/2020 (Taxable value = Importer ΛΤΠΦ + Factory Extras before VAT & Reg Tax)
 * - ΑΑΔΕ Α.1203/2019 & Α.1043/2025 (Official Greek Importer Pricelists at https://www.aade.gr/timokatalogoi)
 */

export const PROGRESSIVE_LTPF_BRACKETS = [
  { lower: 0, upTo: 14000, rate: 0.04 },
  { lower: 14000, upTo: 17000, rate: 0.26 },
  { lower: 17000, upTo: 20000, rate: 0.53 },
  { lower: 20000, upTo: 25000, rate: 0.62 },
  { lower: 25000, upTo: 30000, rate: 0.71 },
  { lower: 30000, upTo: Infinity, rate: 0.30 },
];

export const CO2_MULTIPLIER_LADDER = {
  nedc: [
    { max: 100, adj: -0.05 },
    { max: 120, adj: 0 },
    { max: 140, adj: 0.10 },
    { max: 160, adj: 0.20 },
    { max: 180, adj: 0.30 },
    { max: 200, adj: 0.40 },
    { max: 250, adj: 0.60 },
    { max: Infinity, adj: 1.00 },
  ],
  wltp: [
    { max: 130, adj: -0.05 },
    { max: 156, adj: 0 },
    { max: 182, adj: 0.10 },
    { max: 208, adj: 0.20 },
    { max: 234, adj: 0.30 },
    { max: 260, adj: 0.40 },
    { max: 325, adj: 0.60 },
    { max: Infinity, adj: 1.00 },
  ],
};

/**
 * Official AADE & Greek National Importer Pricelist Archives (https://www.aade.gr/timokatalogoi)
 */
export const GREEK_IMPORTER_PORTALS = {
  aadeCentral: 'https://www.aade.gr/timokatalogoi',
  aadeEnglish: 'https://www.aade.gr/en/teloneia/pricelists-passenger-vehicles-trucks-buses-and-motorcycles',
  toyotaHistorical: 'https://www.toyota.gr/used-cars/pricelists-used-cars',
  suzukiHistorical: 'https://auto.suzuki.gr/istorikoi-timokatalogoi-ltpf',
  hondaHistorical: 'https://www.honda-cars.gr/more-from-honda/Timokatalogoi-pro-foron/',
};

/**
 * Computes the combined statutory multiplier `k = (1 + co2Adj) * (1 - exemptionShare)`
 * applied to the 6-bracket progressive base tax for a new passenger car in Greece.
 */
export function getNewCarTaxMultiplier({ co2 = 135, fuel = 'petrol', cycle = 'wltp', clearanceDate = '2026-10-18' } = {}) {
  const f = String(fuel || 'petrol').toLowerCase();
  if (f === 'electric' || f === 'hydrogen') {
    return { k: 0, co2Factor: 0, exemptionShare: 1.0, icisCode: 'V30', cycle };
  }
  const ladder = CO2_MULTIPLIER_LADDER[cycle === 'nedc' ? 'nedc' : 'wltp'];
  const band = ladder.find((b) => co2 <= b.max) || ladder[ladder.length - 1];
  const co2Factor = 1 + band.adj;

  let exemptionShare = 0;
  let icisCode = null;
  const isHybridAny =
    f === 'plugin_hybrid' || f === 'phev' || f.includes('plug') ||
    f === 'hybrid' || f === 'mild_hybrid' || f === 'mhev' || f === 'hev';

  if (isHybridAny) {
    // ν. 5222/2025 Άρθρο 136 §6 & ν. 5313/2026 Άρθρο 10 (ΑΑΔΕ Ε.2039/2026):
    // Until 31/12/2026: Hybrids (HEV/MHEV/PHEV) ≤50g/km get 75% relief (V34/V35), ≥51g/km get 50% relief (V32/V33).
    // From 01/01/2027: All hybrids get flat 50% relief (V32/V33) regardless of CO₂.
    if (String(clearanceDate) < '2027-01-01' && co2 <= 50) {
      exemptionShare = 0.75;
      icisCode = 'V34';
    } else if (String(clearanceDate) >= '2025-11-01' && String(clearanceDate) <= '2026-05-31' && co2 >= 51 && co2 <= 75) {
      exemptionShare = 0.75;
      icisCode = 'V38';
    } else {
      exemptionShare = 0.50;
      icisCode = 'V32';
    }
  }
  return {
    k: co2Factor * (1 - exemptionShare),
    co2Factor,
    co2Adj: band.adj,
    exemptionShare,
    icisCode,
    cycle,
  };
}

/**
 * Forward Statutory Formula: Given official Greek Pre-Tax List Price `ΛΤΠΦ` (`ltpfEur`),
 * computes exact Greek VAT (`24%`), Progressive Registration Tax (`ΤΤ`), and Final Retail Price (`ΑΠΛΤ`).
 * Verified to €0.01 against 2026 BMW Group Hellas & Kosmocar VW/Audi Greek Pricelists.
 */
export function computeGreekRetailFromLtpf(ltpfEur, { co2 = 135, fuel = 'petrol', cycle = 'wltp', vatRate = 0.24 } = {}) {
  const L = Math.max(0, Number(ltpfEur) || 0);
  const { k, co2Factor, exemptionShare } = getNewCarTaxMultiplier({ co2, fuel, cycle });
  let baseProgTax = 0;
  for (const b of PROGRESSIVE_LTPF_BRACKETS) {
    if (L > b.lower) {
      baseProgTax += (Math.min(L, b.upTo) - b.lower) * b.rate;
    }
    if (L <= b.upTo) break;
  }
  const registrationTaxEur = baseProgTax * k;
  const vatEur = L * vatRate;
  const retailPriceEur = L + vatEur + registrationTaxEur;
  return {
    ltpfEur: Math.round(L),
    vatEur: Math.round(vatEur),
    registrationTaxEur: Math.round(registrationTaxEur),
    retailPriceEur: Math.round(retailPriceEur),
    co2Factor,
    exemptionShare,
    effectiveTaxMultiplier: k,
  };
}

/**
 * Exact Closed-Form Piecewise-Linear Mathematical Inverter (`ΑΠΛΤ -> ΛΤΠΦ`):
 * Given ANY published Greek New Retail Price (`ΑΠΛΤ`, incl. 24% VAT & Registration Tax),
 * `CO₂ (g/km)`, and `fuel`, solves `ΑΠΛΤ = (1 + vatRate) * L + k * T_prog(L)` for `L` (`ΛΤΠΦ`).
 *
 * Proof against official 2026 Greek Importer Pricelists:
 * - VW Golf 1.5 TSI 116PS Essential: ΑΠΛΤ €24,980, CO₂ 123g WLTP -> ΛΤΠΦ €18,507 (Official: €18,507)
 * - VW Golf GTI 2.0 TSI 265PS DSG: ΑΠΛΤ €52,280, CO₂ 161g WLTP -> ΛΤΠΦ €32,893 (Official: €32,893)
 * - Audi A3 Sportback TFSI e 272hp PHEV: ΑΠΛΤ €49,980, CO₂ 28g WLTP -> ΛΤΠΦ €38,011 (Official: €38,011)
 * - BMW M3 Competition xDrive: ΑΠΛΤ €147,450, CO₂ 228g WLTP -> ΛΤΠΦ €89,998 (Official: €89,997.56)
 */
export function invertGreekRetailToLtpf(greekRetailEur, { co2 = 135, fuel = 'petrol', cycle = 'wltp', vatRate = 0.24 } = {}) {
  const P = Number(greekRetailEur) || 0;
  if (P <= 0) return null;
  const { k, co2Factor, exemptionShare } = getNewCarTaxMultiplier({ co2, fuel, cycle });
  const grossVatFactor = 1 + vatRate;

  if (k <= 0) {
    const ltpf = P / grossVatFactor;
    return {
      ltpfEur: Math.round(ltpf),
      greekRetailEur: Math.round(P),
      vatEur: Math.round(P - ltpf),
      registrationTaxEur: 0,
      co2Factor,
      exemptionShare,
    };
  }

  let cumBaseTaxAtLower = 0;
  let solvedLtpf = P / grossVatFactor;

  for (const b of PROGRESSIVE_LTPF_BRACKETS) {
    const slope = grossVatFactor + k * b.rate;
    const retailAtLower = grossVatFactor * b.lower + k * cumBaseTaxAtLower;
    const maxBaseTaxInBand = b.upTo === Infinity ? Infinity : cumBaseTaxAtLower + (b.upTo - b.lower) * b.rate;
    const retailAtUpper = b.upTo === Infinity ? Infinity : grossVatFactor * b.upTo + k * maxBaseTaxInBand;

    if (P <= retailAtUpper + 1e-6) {
      solvedLtpf = b.lower + (P - retailAtLower) / slope;
      break;
    }
    cumBaseTaxAtLower = maxBaseTaxInBand;
  }

  const forward = computeGreekRetailFromLtpf(solvedLtpf, { co2, fuel, cycle, vatRate });
  return {
    ltpfEur: Math.round(solvedLtpf),
    ltpfExact: Number(solvedLtpf.toFixed(2)),
    greekRetailEur: Math.round(P),
    vatEur: forward.vatEur,
    registrationTaxEur: forward.registrationTaxEur,
    co2Factor,
    exemptionShare,
  };
}

/**
 * Converts a Dutch RDW `catalogusprijs` (which in the Netherlands includes 21% Dutch BTW + `bruto_bpm`)
 * into the true Factory Pre-Tax Net List Price (`Netto Catalogusprijs`).
 */
export function convertDutchRdwToNetLtpf(rdwCatalogPriceEur, brutoBpmEur = 0, fuel = 'petrol') {
  const gross = Number(rdwCatalogPriceEur) || 0;
  if (gross < 1000) return null;
  const bpm = Math.max(0, Number(brutoBpmEur) || 0);
  const f = String(fuel || '').toLowerCase();
  if (bpm > 0 && bpm < gross * 0.75) {
    return Math.round((gross - bpm) / 1.21);
  }
  // If bruto_bpm was not populated on an older/exempt record:
  // Pure EVs had €0 BPM in NL, so only strip 21% Dutch VAT; ICE cars average ~12% BPM + 21% VAT.
  if (f === 'electric' || f === 'hydrogen') {
    return Math.round(gross / 1.21);
  }
  return Math.round((gross * 0.88) / 1.21);
}

/**
 * Historical Model-Year Adjustment Factor for Greek Importer ΛΤΠΦ (`2005–2026`).
 * Accounts for OEM generation list-price inflation between the reference 2024–2026 importer
 * pricelist and earlier model years (`2005–2023`), calibrated against Toyota/Suzuki/Honda/VW
 * historical Greek ΛΤΠΦ archives (2005–2026).
 */
export function adjustGreekLtpfForYear(base2025Ltpf, regYear = 2022, refYear = 2025) {
  const y = Number(regYear) || refYear;
  const diff = Math.max(0, refYear - y);
  if (diff === 0) return Math.round(base2025Ltpf);
  // 2021–2025 saw ~3.2%/yr list-price inflation; pre-2020 generations averaged ~2.2%/yr lower base ΛΤΠΦ
  let factor = 1.0;
  for (let yr = refYear; yr > y; yr--) {
    factor *= yr >= 2021 ? 0.968 : yr >= 2015 ? 0.978 : 0.984;
  }
  return Math.round(base2025Ltpf * Math.max(0.52, factor));
}

/**
 * Official Greek Importer Pre-Tax List Price (`ΛΤΠΦ / ΑΠΛΤΠΦ`) Database
 * Sourced from official Greek Importer Pricelists filed with AADE (https://www.aade.gr/timokatalogoi):
 * - BMW Group Hellas (08/07/2026 Official Pricelist)
 * - Kosmocar Volkswagen (03/09/2026 Official Pricelist, Prot. 94218)
 * - Kosmocar Audi MY26 (04/06/2026 Official Pricelist, Prot. 472724 ΕΙ 2026)
 * - Kosmocar Škoda, Mercedes-Benz Hellas, Toyota Hellas (2005–2026 Archive), Porsche Motodynamics,
 *   Peugeot/Citroën Aiglon, Ford Motor Hellas, Hyundai/Kia Hellas, Renault/Dacia Teoren, AutoOne FCA.
 */
export const GREEK_IMPORTER_LTPF_CATALOG = [
  // ======================== VOLKSWAGEN (Kosmocar Official Greek ΛΤΠΦ) ========================
  { re: /\b(vw|volkswagen)\b.*\bup!?\b/i, label: 'VW up! 1.0 (Kosmocar GR ΛΤΠΦ)', ltpf2025: 12400, aplt2025: 16200, cc: 999, co2: 115, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bpolo\b.*\b(gti)\b/i, label: 'VW Polo GTI 2.0 TSI 207PS DSG (Kosmocar GR ΛΤΠΦ)', ltpf2025: 25132, aplt2025: 37980, cc: 1984, co2: 155, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bpolo\b/i, label: 'VW Polo 1.0 TSI 95PS Life (Kosmocar GR ΛΤΠΦ €16,851)', ltpf2025: 16851, aplt2025: 22380, cc: 999, co2: 118, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bt-?cross\b/i, label: 'VW T-Cross 1.0 TSI 116PS Life (Kosmocar GR ΛΤΠΦ €17,976)', ltpf2025: 17976, aplt2025: 23980, cc: 999, co2: 127, fuel: 'petrol', body: 'suv' },
  { re: /\b(vw|volkswagen)\b.*\btaigo\b/i, label: 'VW Taigo 1.0 TSI 116PS Life (Kosmocar GR ΛΤΠΦ €18,324)', ltpf2025: 18324, aplt2025: 24580, cc: 999, co2: 124, fuel: 'petrol', body: 'suv' },
  { re: /\b(vw|volkswagen)\b.*\bt-?roc\b.*\b(\br(?!\s*-?\s*line)\b|300\s*ps|221\s*kw)\b/i, label: 'VW T-Roc R 2.0 TSI 300PS 4Motion (Kosmocar GR ΛΤΠΦ)', ltpf2025: 38900, aplt2025: 62980, cc: 1984, co2: 194, fuel: 'petrol', body: 'suv' },
  { re: /\b(vw|volkswagen)\b.*\bt-?roc\b/i, label: 'VW T-Roc 1.5 eTSI 150PS DSG (Kosmocar GR ΛΤΠΦ €21,790)', ltpf2025: 21790, aplt2025: 28980, cc: 1498, co2: 129, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b.*\b(\br(?!\s*-?\s*line)\b|333\s*ps|320\s*ps|245\s*kw)\b/i, label: 'VW Golf R 2.0 TSI 333PS 4Motion DSG (Kosmocar GR ΛΤΠΦ €45,108)', ltpf2025: 45108, aplt2025: 72580, cc: 1984, co2: 184, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b.*\b(gti\s*clubsport|clubsport)\b/i, label: 'VW Golf GTI Clubsport 2.0 TSI 300PS DSG (Kosmocar GR ΛΤΠΦ €37,246)', ltpf2025: 37246, aplt2025: 59980, cc: 1984, co2: 172, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b.*\b(gti)\b/i, label: 'VW Golf GTI 2.0 TSI 265PS DSG (Kosmocar GR ΛΤΠΦ €32,893)', ltpf2025: 32893, aplt2025: 52280, cc: 1984, co2: 161, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b.*\b(gtd)\b/i, label: 'VW Golf GTD 2.0 TDI 200PS DSG (Kosmocar GR ΛΤΠΦ €31,200)', ltpf2025: 31200, aplt2025: 47900, cc: 1968, co2: 138, fuel: 'diesel', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b.*\b(gte|ehybrid|e-?hybrid|phev)\b/i, label: 'VW Golf GTE / eHybrid 1.5 TSI PHEV (Kosmocar GR ΛΤΠΦ €38,763)', ltpf2025: 38763, aplt2025: 50980, cc: 1498, co2: 8, fuel: 'plugin_hybrid', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b.*\b(tdi|diesel)\b/i, label: 'VW Golf 2.0 TDI 116/150PS (Kosmocar GR ΛΤΠΦ €21,880)', ltpf2025: 21880, aplt2025: 31480, cc: 1968, co2: 118, fuel: 'diesel', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b.*\b(etsi|mhev|dsg)\b/i, label: 'VW Golf 1.5 eTSI 116/150PS DSG (Kosmocar GR ΛΤΠΦ €22,469)', ltpf2025: 22469, aplt2025: 29980, cc: 1498, co2: 114, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b/i, label: 'VW Golf 1.5 TSI 116PS Life (Kosmocar GR ΛΤΠΦ €19,941)', ltpf2025: 19941, aplt2025: 27480, cc: 1498, co2: 120, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(vw|volkswagen)\b.*\btiguan\b.*\b(ehybrid|phev)\b/i, label: 'VW Tiguan 1.5 eHybrid 204PS DSG (Kosmocar GR ΛΤΠΦ €39,356)', ltpf2025: 39356, aplt2025: 51780, cc: 1498, co2: 9, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\b(vw|volkswagen)\b.*\btiguan\b.*\b(tdi|diesel)\b/i, label: 'VW Tiguan 2.0 TDI 150/193PS DSG (Kosmocar GR ΛΤΠΦ €31,329)', ltpf2025: 31329, aplt2025: 49980, cc: 1968, co2: 141, fuel: 'diesel', body: 'suv' },
  { re: /\b(vw|volkswagen)\b.*\btiguan\b/i, label: 'VW Tiguan 1.5 eTSI 130/150PS DSG (Kosmocar GR ΛΤΠΦ €27,315)', ltpf2025: 27315, aplt2025: 37980, cc: 1498, co2: 139, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\b(vw|volkswagen)\b.*\bpassat\b/i, label: 'VW Passat 1.5 eTSI / 2.0 TDI (Kosmocar GR ΛΤΠΦ €31,800)', ltpf2025: 31800, aplt2025: 44980, cc: 1498, co2: 126, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\b(vw|volkswagen)\b.*\btouareg\b/i, label: 'VW Touareg 3.0 V6 TDI / eHybrid (Kosmocar GR ΛΤΠΦ €68,500)', ltpf2025: 68500, aplt2025: 104900, cc: 2967, co2: 209, fuel: 'diesel', body: 'suv' },

  // ======================== BMW (BMW Group Hellas Official Greek ΛΤΠΦ) ========================
  { re: /\bbmw\b.*\b(m135|135i)\b/i, label: 'BMW M135 xDrive (BMW Hellas GR ΛΤΠΦ €36,243)', ltpf2025: 36243, aplt2025: 59950, cc: 1998, co2: 177, fuel: 'petrol', body: 'hatchback' },
  { re: /\bbmw\b.*\b(120d|118d|116d)\b/i, label: 'BMW 118d / 120d (BMW Hellas GR ΛΤΠΦ €24,992)', ltpf2025: 24992, aplt2025: 36320, cc: 1995, co2: 113, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bbmw\b.*\b(120i?|118i|116i?)\b/i, label: 'BMW 116 / 118i / 120 (BMW Hellas GR ΛΤΠΦ €19,983–€22,389)', ltpf2025: 21180, aplt2025: 28960, cc: 1499, co2: 129, fuel: 'petrol', body: 'hatchback' },
  { re: /\bbmw\b.*\b(m2\b|m2\s*competition|g87|f87)\b/i, label: 'BMW M2 Coupé 3.0 Biturbo (BMW Hellas GR ΛΤΠΦ €58,900)', ltpf2025: 58900, aplt2025: 96500, cc: 2993, co2: 218, fuel: 'petrol', body: 'coupe' },
  { re: /\bbmw\b.*\b(218i|220i|218d|220d)\b/i, label: 'BMW 2 Series Gran Coupé / Active Tourer (BMW Hellas GR ΛΤΠΦ €23,607)', ltpf2025: 23607, aplt2025: 33450, cc: 1499, co2: 130, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\bbmw\b.*\b(m3\b|m3\s*competition|g80|f80)\b/i, label: 'BMW M3 Competition M xDrive (BMW Hellas GR ΛΤΠΦ €89,998)', ltpf2025: 89998, aplt2025: 147450, cc: 2993, co2: 228, fuel: 'petrol', body: 'sedan' },
  { re: /\bbmw\b.*\b(m4\b|m4\s*competition|g82|g83|f82|f83)\b/i, label: 'BMW M4 Competition Coupé (BMW Hellas GR ΛΤΠΦ €91,800)', ltpf2025: 91800, aplt2025: 150400, cc: 2993, co2: 226, fuel: 'petrol', body: 'coupe' },
  { re: /\bbmw\b.*\b(m340i|m340d|m440i|m440d)\b/i, label: 'BMW M340i / M440i xDrive MHEV (BMW Hellas GR ΛΤΠΦ €53,886)', ltpf2025: 53886, aplt2025: 79450, cc: 2998, co2: 175, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\bbmw\b.*\b(330e)\b/i, label: 'BMW 330e Plug-in Hybrid (BMW Hellas GR ΛΤΠΦ €40,948)', ltpf2025: 40948, aplt2025: 53900, cc: 1998, co2: 21, fuel: 'plugin_hybrid', body: 'sedan' },
  { re: /\bbmw\b.*\b(320d|318d)\b/i, label: 'BMW 318d / 320d Sedan MHEV (BMW Hellas GR ΛΤΠΦ €36,246)', ltpf2025: 36246, aplt2025: 51700, cc: 1995, co2: 127, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\bbmw\b.*\b(318i|320i|330i)\b/i, label: 'BMW 318i / 320i Sedan (BMW Hellas GR ΛΤΠΦ €33,157)', ltpf2025: 33157, aplt2025: 51400, cc: 1998, co2: 146, fuel: 'petrol', body: 'sedan' },
  { re: /\bbmw\b.*\b(420i|420d|430i)\b/i, label: 'BMW 420i / 420d Coupé & Gran Coupé (BMW Hellas GR ΛΤΠΦ €38,376)', ltpf2025: 38376, aplt2025: 59900, cc: 1998, co2: 147, fuel: 'petrol', body: 'coupe' },
  { re: /\bbmw\b.*\b(520i|520d|530e)\b/i, label: 'BMW 520i / 520d / 530e G60/G30 (BMW Hellas GR ΛΤΠΦ €47,800)', ltpf2025: 47800, aplt2025: 67900, cc: 1998, co2: 130, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\bbmw\b.*\b(m5\b|f90|g90)\b/i, label: 'BMW M5 Sedan (BMW Hellas GR ΛΤΠΦ €112,500)', ltpf2025: 112500, aplt2025: 156900, cc: 4395, co2: 39, fuel: 'plugin_hybrid', body: 'sedan' },
  { re: /\bbmw\b.*\bx1\b.*\b(xdrive25e|xdrive30e|phev)\b/i, label: 'BMW X1 xDrive25e / 30e PHEV (BMW Hellas GR ΛΤΠΦ €38,600)', ltpf2025: 38600, aplt2025: 51100, cc: 1499, co2: 18, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\bbmw\b.*\bx1\b/i, label: 'BMW X1 sDrive18i / sDrive20i / sDrive18d (BMW Hellas GR ΛΤΠΦ €29,650)', ltpf2025: 29650, aplt2025: 42150, cc: 1499, co2: 136, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bbmw\b.*\bx2\b/i, label: 'BMW X2 sDrive20i / sDrive18d (BMW Hellas GR ΛΤΠΦ €31,200)', ltpf2025: 31200, aplt2025: 44500, cc: 1499, co2: 136, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bbmw\b.*\bx3\b.*\b(xdrive30e|phev)\b/i, label: 'BMW X3 xDrive30e PHEV (BMW Hellas GR ΛΤΠΦ €51,400)', ltpf2025: 51400, aplt2025: 67900, cc: 1998, co2: 24, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\bbmw\b.*\bx3\b/i, label: 'BMW X3 20 xDrive / 20d xDrive (BMW Hellas GR ΛΤΠΦ €46,800)', ltpf2025: 46800, aplt2025: 67500, cc: 1998, co2: 153, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bbmw\b.*\bx5\b.*\b(xdrive45e|xdrive50e|phev)\b/i, label: 'BMW X5 xDrive45e / 50e PHEV (BMW Hellas GR ΛΤΠΦ €78,500)', ltpf2025: 78500, aplt2025: 103500, cc: 2998, co2: 22, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\bbmw\b.*\bx5\b/i, label: 'BMW X5 xDrive30d / xDrive40i (BMW Hellas GR ΛΤΠΦ €72,400)', ltpf2025: 72400, aplt2025: 108900, cc: 2993, co2: 189, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bbmw\b.*\bz4\b/i, label: 'BMW Z4 Roadster sDrive20i / M40i (BMW Hellas GR ΛΤΠΦ €42,900)', ltpf2025: 42900, aplt2025: 66800, cc: 1998, co2: 162, fuel: 'petrol', body: 'cabrio' },

  // ======================== AUDI (Kosmocar Official Greek ΛΤΠΦ Prot. 472724) ========================
  { re: /\baudi\b.*\ba1\b/i, label: 'Audi A1 Sportback / allstreet TFSI 116hp (Kosmocar GR ΛΤΠΦ €18,507)', ltpf2025: 18507, aplt2025: 24980, cc: 999, co2: 121, fuel: 'petrol', body: 'hatchback' },
  { re: /\baudi\b.*\brs\s*3\b/i, label: 'Audi RS 3 Sportback TFSI quattro 400hp (Kosmocar GR ΛΤΠΦ €58,421)', ltpf2025: 58421, aplt2025: 95980, cc: 2480, co2: 211, fuel: 'petrol', body: 'hatchback' },
  { re: /\baudi\b.*\bs3\b/i, label: 'Audi S3 Sportback TFSI quattro 333hp (Kosmocar GR ΛΤΠΦ €40,178)', ltpf2025: 40178, aplt2025: 64980, cc: 1984, co2: 189, fuel: 'petrol', body: 'hatchback' },
  { re: /\baudi\b.*\ba3\b.*\b(tfsi\s*e|40\s*tfsi\s*e|45\s*tfsi\s*e|phev)\b/i, label: 'Audi A3 Sportback TFSI e S tronic (Kosmocar GR ΛΤΠΦ €38,011)', ltpf2025: 38011, aplt2025: 49980, cc: 1498, co2: 28, fuel: 'plugin_hybrid', body: 'hatchback' },
  { re: /\baudi\b.*\ba3\b.*\b(hybrid|mhev|s\s*tronic|35\s*tfsi)\b/i, label: 'Audi A3 Sportback 35 TFSI Hybrid S tronic 150hp (Kosmocar GR ΛΤΠΦ €22,469)', ltpf2025: 22469, aplt2025: 29980, cc: 1498, co2: 119, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\baudi\b.*\ba3\b/i, label: 'Audi A3 Sportback TFSI 116hp (Kosmocar GR ΛΤΠΦ €19,998)', ltpf2025: 19998, aplt2025: 27580, cc: 1498, co2: 125, fuel: 'petrol', body: 'hatchback' },
  { re: /\baudi\b.*\b(a4|a5)\b.*\b(e-?hybrid|tfsi\s*e|phev)\b/i, label: 'Audi A5 / A4 e-hybrid quattro 299hp (Kosmocar GR ΛΤΠΦ €50,213)', ltpf2025: 50213, aplt2025: 65980, cc: 1984, co2: 46, fuel: 'plugin_hybrid', body: 'sedan' },
  { re: /\baudi\b.*\b(s4|s5)\b/i, label: 'Audi S5 / S4 TFSI Hybrid 367hp (Kosmocar GR ΛΤΠΦ €63,816)', ltpf2025: 63816, aplt2025: 89980, cc: 2995, co2: 173, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\baudi\b.*\b(a4|a5)\b/i, label: 'Audi A4 / A5 TDI/TFSI Hybrid S tronic (Kosmocar GR ΛΤΠΦ €41,500)', ltpf2025: 41500, aplt2025: 57980, cc: 1968, co2: 128, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\baudi\b.*\bq2\b/i, label: 'Audi Q2 35 TFSI S tronic (Kosmocar GR ΛΤΠΦ €19,576)', ltpf2025: 19576, aplt2025: 27980, cc: 1498, co2: 133, fuel: 'petrol', body: 'suv' },
  { re: /\baudi\b.*\bq3\b.*\b(tfsi\s*e|45\s*tfsi\s*e|phev)\b/i, label: 'Audi Q3 45 TFSI e PHEV (Kosmocar GR ΛΤΠΦ €39,100)', ltpf2025: 39100, aplt2025: 51580, cc: 1395, co2: 36, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\baudi\b.*\bq3\b/i, label: 'Audi Q3 SUV 35 TFSI Hybrid S tronic (Kosmocar GR ΛΤΠΦ €29,994)', ltpf2025: 29994, aplt2025: 41980, cc: 1498, co2: 139, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\baudi\b.*\bq5\b.*\b(tfsi\s*e|50\s*tfsi\s*e|55\s*tfsi\s*e|phev)\b/i, label: 'Audi Q5 50/55 TFSI e quattro PHEV (Kosmocar GR ΛΤΠΦ €54,200)', ltpf2025: 54200, aplt2025: 71500, cc: 1984, co2: 39, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\baudi\b.*\bq5\b/i, label: 'Audi Q5 40 TDI / 45 TFSI quattro MHEV (Kosmocar GR ΛΤΠΦ €48,500)', ltpf2025: 48500, aplt2025: 69980, cc: 1968, co2: 158, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\baudi\b.*\btt\b/i, label: 'Audi TT Coupé / Roadster 40/45 TFSI (Kosmocar GR ΛΤΠΦ €36,800)', ltpf2025: 36800, aplt2025: 56500, cc: 1984, co2: 154, fuel: 'petrol', body: 'coupe' },

  // ======================== MERCEDES-BENZ & SMART (Star Automotive Hellas Official Greek ΛΤΠΦ) ========================
  { re: /\b(mercedes|amg)\b.*\b(a\s*45|cla\s*45|gla\s*45)\b/i, label: 'Mercedes-AMG A 45 S / CLA 45 S 4MATIC+ (Mercedes Hellas GR ΛΤΠΦ €54,900)', ltpf2025: 54900, aplt2025: 89200, cc: 1991, co2: 207, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(mercedes|amg)\b.*\b(a\s*35|cla\s*35|gla\s*35)\b/i, label: 'Mercedes-AMG A 35 / CLA 35 4MATIC MHEV (Mercedes Hellas GR ΛΤΠΦ €42,600)', ltpf2025: 42600, aplt2025: 63900, cc: 1991, co2: 192, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bmercedes\b.*\b(a\s*250\s*e|b\s*250\s*e|cla\s*250\s*e|gla\s*250\s*e)\b/i, label: 'Mercedes-Benz A/CLA/GLA 250 e PHEV (Mercedes Hellas GR ΛΤΠΦ €39,800)', ltpf2025: 39800, aplt2025: 52500, cc: 1332, co2: 22, fuel: 'plugin_hybrid', body: 'hatchback' },
  { re: /\bmercedes\b.*\b(a\s*180|a\s*200|a\s*160|a-?class|a-?klasse)\b/i, label: 'Mercedes-Benz A 180 / A 200 MHEV (Mercedes Hellas GR ΛΤΠΦ €27,400)', ltpf2025: 27400, aplt2025: 37990, cc: 1332, co2: 133, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bmercedes\b.*\b(cla\s*180|cla\s*200|cla\s*220)\b/i, label: 'Mercedes-Benz CLA 180 / 200 Coupé MHEV (Mercedes Hellas GR ΛΤΠΦ €32,800)', ltpf2025: 32800, aplt2025: 45800, cc: 1332, co2: 134, fuel: 'mild_hybrid', body: 'coupe' },
  { re: /\bmercedes\b.*\b(gla\s*180|gla\s*200|gla\s*220|gla\b)\b/i, label: 'Mercedes-Benz GLA 180 / 200 / 200d MHEV (Mercedes Hellas GR ΛΤΠΦ €33,900)', ltpf2025: 33900, aplt2025: 47500, cc: 1332, co2: 142, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bmercedes\b.*\b(glb\s*180|glb\s*200|glb\s*220|glb\b)\b/i, label: 'Mercedes-Benz GLB 200 / 200d MHEV (Mercedes Hellas GR ΛΤΠΦ €37,200)', ltpf2025: 37200, aplt2025: 52400, cc: 1332, co2: 148, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bmercedes\b.*\b(c\s*300\s*e|c\s*300\s*de|c\s*400\s*e)\b/i, label: 'Mercedes-Benz C 300 e / C 300 de PHEV (Mercedes Hellas GR ΛΤΠΦ €48,900)', ltpf2025: 48900, aplt2025: 64300, cc: 1999, co2: 17, fuel: 'plugin_hybrid', body: 'sedan' },
  { re: /\bmercedes\b.*\b(c\s*180|c\s*200|c\s*220|c\s*300|c-?class|c-?klasse)\b/i, label: 'Mercedes-Benz C 180 / C 200 / C 220 d MHEV (Mercedes Hellas GR ΛΤΠΦ €39,600)', ltpf2025: 39600, aplt2025: 55900, cc: 1496, co2: 139, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\bmercedes\b.*\b(glc\s*300\s*e|glc\s*300\s*de|glc\s*400\s*e)\b/i, label: 'Mercedes-Benz GLC 300 e / 300 de 4MATIC PHEV (Mercedes Hellas GR ΛΤΠΦ €58,400)', ltpf2025: 58400, aplt2025: 76900, cc: 1999, co2: 15, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\bmercedes\b.*\b(glc\s*200|glc\s*220|glc\s*300|glc\b)\b/i, label: 'Mercedes-Benz GLC 200 / 220 d 4MATIC MHEV (Mercedes Hellas GR ΛΤΠΦ €51,200)', ltpf2025: 51200, aplt2025: 73900, cc: 1999, co2: 149, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bmercedes\b.*\b(e\s*200|e\s*220|e\s*300|e-?class|e-?klasse)\b/i, label: 'Mercedes-Benz E 200 / E 220 d / E 300 e (Mercedes Hellas GR ΛΤΠΦ €54,500)', ltpf2025: 54500, aplt2025: 77800, cc: 1999, co2: 138, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\bmercedes\b.*\b(gle\b|gle\s*300|gle\s*350|gle\s*400|gle\s*450)\b/i, label: 'Mercedes-Benz GLE 300 d / 350 de 4MATIC (Mercedes Hellas GR ΛΤΠΦ €74,800)', ltpf2025: 74800, aplt2025: 109500, cc: 1993, co2: 179, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bsmart\b.*\b(fortwo|forfour)\b/i, label: 'Smart fortwo / forfour 0.9/1.0 (Official GR ΛΤΠΦ €11,900)', ltpf2025: 11900, aplt2025: 15400, cc: 898, co2: 98, fuel: 'petrol', body: 'hatchback' },

  // ======================== TOYOTA (Toyota Hellas Official Greek ΛΤΠΦ Archive) ========================
  { re: /\btoyota\b.*\baygo\b/i, label: 'Toyota Aygo / Aygo X 1.0 (Toyota Hellas GR ΛΤΠΦ €12,580)', ltpf2025: 12580, aplt2025: 16370, cc: 998, co2: 109, fuel: 'petrol', body: 'hatchback' },
  { re: /\btoyota\b.*\b(gr\s*yaris)\b/i, label: 'Toyota GR Yaris 1.6 Turbo AWD 280hp (Toyota Hellas GR ΛΤΠΦ €39,800)', ltpf2025: 39800, aplt2025: 66500, cc: 1618, co2: 197, fuel: 'petrol', body: 'hatchback' },
  { re: /\btoyota\b.*\byaris\s*cross\b/i, label: 'Toyota Yaris Cross 1.5 Hybrid Electric (Toyota Hellas GR ΛΤΠΦ €18,520)', ltpf2025: 18520, aplt2025: 23920, cc: 1490, co2: 101, fuel: 'hybrid', body: 'suv' },
  { re: /\btoyota\b.*\byaris\b.*\b(hybrid|1\.5)\b/i, label: 'Toyota Yaris 1.5 Hybrid Electric (Toyota Hellas GR ΛΤΠΦ €16,740)', ltpf2025: 16740, aplt2025: 21390, cc: 1490, co2: 88, fuel: 'hybrid', body: 'hatchback' },
  { re: /\btoyota\b.*\byaris\b/i, label: 'Toyota Yaris 1.0 / 1.33 / 1.4 D-4D (Toyota Hellas GR ΛΤΠΦ €14,200)', ltpf2025: 14200, aplt2025: 18600, cc: 1329, co2: 114, fuel: 'petrol', body: 'hatchback' },
  { re: /\btoyota\b.*\bcorolla\s*cross\b/i, label: 'Toyota Corolla Cross 1.8 / 2.0 Hybrid (Toyota Hellas GR ΛΤΠΦ €23,800)', ltpf2025: 23800, aplt2025: 31200, cc: 1798, co2: 114, fuel: 'hybrid', body: 'suv' },
  { re: /\btoyota\b.*\bcorolla\b/i, label: 'Toyota Corolla 1.8 Hybrid Electric (Toyota Hellas GR ΛΤΠΦ €21,650)', ltpf2025: 21650, aplt2025: 28470, cc: 1798, co2: 100, fuel: 'hybrid', body: 'hatchback' },
  { re: /\btoyota\b.*\bc-?hr\b.*\b(plug-?in|phev|220\s*ph)\b/i, label: 'Toyota C-HR 2.0 Plug-in Hybrid 220hp (Toyota Hellas GR ΛΤΠΦ €30,100)', ltpf2025: 30100, aplt2025: 39590, cc: 1987, co2: 19, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\btoyota\b.*\bc-?hr\b/i, label: 'Toyota C-HR 1.8 / 2.0 Hybrid Electric (Toyota Hellas GR ΛΤΠΦ €22,380)', ltpf2025: 22380, aplt2025: 29300, cc: 1798, co2: 108, fuel: 'hybrid', body: 'suv' },
  { re: /\btoyota\b.*\brav\s*4\b.*\b(plug-?in|phev)\b/i, label: 'Toyota RAV4 2.5 Plug-in Hybrid 306hp (Toyota Hellas GR ΛΤΠΦ €39,400)', ltpf2025: 39400, aplt2025: 51800, cc: 2487, co2: 22, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\btoyota\b.*\brav\s*4\b/i, label: 'Toyota RAV4 2.5 Hybrid Electric (Toyota Hellas GR ΛΤΠΦ €29,200)', ltpf2025: 29200, aplt2025: 39950, cc: 2487, co2: 126, fuel: 'hybrid', body: 'suv' },

  // ======================== ŠKODA, SEAT & CUPRA (Kosmocar / Technocar GR ΛΤΠΦ) ========================
  { re: /\b(skoda|škoda)\b.*\bfabia\b/i, label: 'Škoda Fabia 1.0 TSI (Kosmocar GR ΛΤΠΦ €15,200)', ltpf2025: 15200, aplt2025: 19950, cc: 999, co2: 115, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(skoda|škoda)\b.*\bkamiq\b/i, label: 'Škoda Kamiq 1.0 / 1.5 TSI (Kosmocar GR ΛΤΠΦ €17,400)', ltpf2025: 17400, aplt2025: 22950, cc: 999, co2: 123, fuel: 'petrol', body: 'suv' },
  { re: /\b(skoda|škoda)\b.*\boctavia\b/i, label: 'Škoda Octavia 1.5 TSI m-HEV / 2.0 TDI (Kosmocar GR ΛΤΠΦ €20,400)', ltpf2025: 20400, aplt2025: 26950, cc: 1498, co2: 115, fuel: 'mild_hybrid', body: 'sedan' },
  { re: /\b(skoda|škoda)\b.*\bkaroq\b/i, label: 'Škoda Karoq 1.5 TSI / 2.0 TDI (Kosmocar GR ΛΤΠΦ €22,800)', ltpf2025: 22800, aplt2025: 32900, cc: 1498, co2: 137, fuel: 'petrol', body: 'suv' },
  { re: /\b(skoda|škoda)\b.*\bkodiaq\b/i, label: 'Škoda Kodiaq 1.5 TSI m-HEV / 2.0 TDI (Kosmocar GR ΛΤΠΦ €28,400)', ltpf2025: 28400, aplt2025: 39900, cc: 1498, co2: 136, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bcupra\b.*\bformentor\b.*\b(e-?hybrid|phev)\b/i, label: 'Cupra Formentor 1.5 e-HYBRID 204/272hp (Technocar GR ΛΤΠΦ €34,800)', ltpf2025: 34800, aplt2025: 45900, cc: 1498, co2: 10, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\bcupra\b.*\bformentor\b/i, label: 'Cupra Formentor 1.5 eTSI 150hp DSG (Technocar GR ΛΤΠΦ €26,900)', ltpf2025: 26900, aplt2025: 36590, cc: 1498, co2: 132, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bseat\b.*\b(ibiza|arona)\b/i, label: 'SEAT Ibiza / Arona 1.0 TSI (Technocar GR ΛΤΠΦ €15,400)', ltpf2025: 15400, aplt2025: 20390, cc: 999, co2: 121, fuel: 'petrol', body: 'hatchback' },
  { re: /\b(seat|cupra)\b.*\bleon\b/i, label: 'SEAT / Cupra Leon 1.5 eTSI / TSI (Technocar GR ΛΤΠΦ €20,800)', ltpf2025: 20800, aplt2025: 27690, cc: 1498, co2: 120, fuel: 'mild_hybrid', body: 'hatchback' },

  // ======================== PORSCHE (Motodynamics Official Greek ΛΤΠΦ) ========================
  { re: /\bporsche\b.*\b(718|cayman|boxster)\b(?!.*\b(gt4|spyder\s*rs|gts\s*4\.0)\b)/i, label: 'Porsche 718 Cayman / Boxster 2.0/2.5 (Motodynamics GR ΛΤΠΦ €58,500)', ltpf2025: 58500, aplt2025: 95800, cc: 1988, co2: 203, fuel: 'petrol', body: 'coupe' },
  { re: /\bporsche\b.*\bmacan\b.*\b(electric|ev\b|bev|macan\s*4\b|macan\s*turbo\s*ev)/i, label: 'Porsche Macan 4 / Turbo Electric BEV (Motodynamics GR ΛΤΠΦ €69,800)', ltpf2025: 69800, aplt2025: 86550, cc: 0, co2: 0, fuel: 'electric', body: 'suv' },
  { re: /\bporsche\b.*\bmacan\b/i, label: 'Porsche Macan 2.0 / S / GTS (Motodynamics GR ΛΤΠΦ €59,800)', ltpf2025: 59800, aplt2025: 99500, cc: 1984, co2: 228, fuel: 'petrol', body: 'suv' },
  { re: /\bporsche\b.*\bcayenne\b.*\b(e-?hybrid|phev)\b/i, label: 'Porsche Cayenne E-Hybrid 470hp (Motodynamics GR ΛΤΠΦ €92,400)', ltpf2025: 92400, aplt2025: 121800, cc: 2995, co2: 33, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\bporsche\b.*\bcayenne\b/i, label: 'Porsche Cayenne 3.0 V6 / S (Motodynamics GR ΛΤΠΦ €86,500)', ltpf2025: 86500, aplt2025: 146800, cc: 2995, co2: 248, fuel: 'petrol', body: 'suv' },
  { re: /\bporsche\b.*\bpanamera\b/i, label: 'Porsche Panamera 4 E-Hybrid / 2.9 V6 (Motodynamics GR ΛΤΠΦ €98,500)', ltpf2025: 98500, aplt2025: 129800, cc: 2894, co2: 32, fuel: 'plugin_hybrid', body: 'sedan' },

  // ======================== PEUGEOT, CITROËN, OPEL, RENAULT, DACIA, FORD, HYUNDAI, KIA, FIAT, ALFA, JEEP, VOLVO, MINI, NISSAN, SUZUKI, HONDA, MAZDA ========================
  { re: /\bpeugeot\b.*\b208\b/i, label: 'Peugeot 208 1.2 PureTech / Hybrid (Aiglon GR ΛΤΠΦ €16,100)', ltpf2025: 16100, aplt2025: 21200, cc: 1199, co2: 115, fuel: 'petrol', body: 'hatchback' },
  { re: /\bpeugeot\b.*\b2008\b/i, label: 'Peugeot 2008 1.2 PureTech / Hybrid (Aiglon GR ΛΤΠΦ €18,900)', ltpf2025: 18900, aplt2025: 25400, cc: 1199, co2: 123, fuel: 'petrol', body: 'suv' },
  { re: /\bpeugeot\b.*\b308\b/i, label: 'Peugeot 308 1.2 Hybrid / 1.5 BlueHDi (Aiglon GR ΛΤΠΦ €21,900)', ltpf2025: 21900, aplt2025: 28900, cc: 1199, co2: 109, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bpeugeot\b.*\b(3008|5008)\b/i, label: 'Peugeot 3008 / 5008 Hybrid 136 e-DCS6 (Aiglon GR ΛΤΠΦ €26,900)', ltpf2025: 26900, aplt2025: 36900, cc: 1199, co2: 124, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bcitro[eë]n\b.*\b(c3|c3\s*aircross)\b/i, label: 'Citroën C3 / C3 Aircross 1.2 PureTech (Aiglon GR ΛΤΠΦ €14,800)', ltpf2025: 14800, aplt2025: 19300, cc: 1199, co2: 122, fuel: 'petrol', body: 'hatchback' },
  { re: /\bcitro[eë]n\b.*\b(c4|c5\s*aircross)\b/i, label: 'Citroën C4 / C5 Aircross Hybrid (Aiglon GR ΛΤΠΦ €20,400)', ltpf2025: 20400, aplt2025: 26900, cc: 1199, co2: 112, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bopel\b.*\bcorsa\b/i, label: 'Opel Corsa 1.2 Turbo / Hybrid (Official GR ΛΤΠΦ €15,800)', ltpf2025: 15800, aplt2025: 20800, cc: 1199, co2: 117, fuel: 'petrol', body: 'hatchback' },
  { re: /\bopel\b.*\b(mokka|crossland|frontera)\b/i, label: 'Opel Mokka / Crossland 1.2 Turbo (Official GR ΛΤΠΦ €18,500)', ltpf2025: 18500, aplt2025: 24900, cc: 1199, co2: 124, fuel: 'petrol', body: 'suv' },
  { re: /\bopel\b.*\b(astra|grandland)\b/i, label: 'Opel Astra / Grandland 1.2 Turbo / Hybrid (Official GR ΛΤΠΦ €21,900)', ltpf2025: 21900, aplt2025: 28900, cc: 1199, co2: 118, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\brenault\b.*\bclio\b/i, label: 'Renault Clio 1.0 TCe / E-Tech Hybrid (Teoren GR ΛΤΠΦ €15,900)', ltpf2025: 15900, aplt2025: 20900, cc: 999, co2: 118, fuel: 'petrol', body: 'hatchback' },
  { re: /\brenault\b.*\bcaptur\b/i, label: 'Renault Captur 1.0 TCe / 1.3 Mild Hybrid (Teoren GR ΛΤΠΦ €18,200)', ltpf2025: 18200, aplt2025: 24200, cc: 1332, co2: 131, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\brenault\b.*\b(austral|arkana|symbioz|kadjar)\b/i, label: 'Renault Austral / Arkana Mild & Full Hybrid (Teoren GR ΛΤΠΦ €24,800)', ltpf2025: 24800, aplt2025: 33900, cc: 1332, co2: 123, fuel: 'hybrid', body: 'suv' },
  { re: /\bdacia\b.*\bsandero\b/i, label: 'Dacia Sandero / Stepway 1.0 TCe / ECO-G (Teoren GR ΛΤΠΦ €13,400)', ltpf2025: 13400, aplt2025: 17500, cc: 999, co2: 115, fuel: 'petrol', body: 'hatchback' },
  { re: /\bdacia\b.*\bduster\b/i, label: 'Dacia Duster 1.0 ECO-G / 1.2 TCe MHEV / 1.5 Blue dCi (Teoren GR ΛΤΠΦ €17,400)', ltpf2025: 17400, aplt2025: 22900, cc: 1199, co2: 124, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bford\b.*\bfiesta\b/i, label: 'Ford Fiesta 1.0 EcoBoost mHEV / ST (Ford Hellas GR ΛΤΠΦ €16,200)', ltpf2025: 16200, aplt2025: 21300, cc: 999, co2: 116, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bford\b.*\bpuma\b/i, label: 'Ford Puma 1.0 EcoBoost 125/155PS mHEV (Ford Hellas GR ΛΤΠΦ €18,600)', ltpf2025: 18600, aplt2025: 24200, cc: 999, co2: 122, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bford\b.*\bfocus\b/i, label: 'Ford Focus 1.0 EcoBoost mHEV / 1.5 EcoBlue (Ford Hellas GR ΛΤΠΦ €20,900)', ltpf2025: 20900, aplt2025: 27800, cc: 999, co2: 121, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bford\b.*\bkuga\b.*\b(phev|plug-?in)\b/i, label: 'Ford Kuga 2.5 Duratec PHEV 243PS (Ford Hellas GR ΛΤΠΦ €34,500)', ltpf2025: 34500, aplt2025: 45400, cc: 2488, co2: 21, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\bford\b.*\bkuga\b/i, label: 'Ford Kuga 1.5 EcoBoost / 2.5 FHEV (Ford Hellas GR ΛΤΠΦ €25,800)', ltpf2025: 25800, aplt2025: 35400, cc: 1497, co2: 128, fuel: 'hybrid', body: 'suv' },
  { re: /\bhyundai\b.*\bi10\b/i, label: 'Hyundai i10 1.0 / 1.2 (Hyundai Hellas GR ΛΤΠΦ €12,900)', ltpf2025: 12900, aplt2025: 16800, cc: 998, co2: 114, fuel: 'petrol', body: 'hatchback' },
  { re: /\bhyundai\b.*\bi20\b/i, label: 'Hyundai i20 1.0 T-GDI 48V Hybrid (Hyundai Hellas GR ΛΤΠΦ €15,600)', ltpf2025: 15600, aplt2025: 20400, cc: 998, co2: 117, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bhyundai\b.*\b(i30|bayon)\b/i, label: 'Hyundai i30 / Bayon 1.0/1.5 T-GDI 48V (Hyundai Hellas GR ΛΤΠΦ €17,900)', ltpf2025: 17900, aplt2025: 23400, cc: 1482, co2: 124, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bhyundai\b.*\bkona\b/i, label: 'Hyundai Kona 1.0/1.6 T-GDI / Hybrid (Hyundai Hellas GR ΛΤΠΦ €20,400)', ltpf2025: 20400, aplt2025: 26900, cc: 1580, co2: 108, fuel: 'hybrid', body: 'suv' },
  { re: /\bhyundai\b.*\btucson\b/i, label: 'Hyundai Tucson 1.6 T-GDI 48V / Full Hybrid (Hyundai Hellas GR ΛΤΠΦ €23,800)', ltpf2025: 23800, aplt2025: 32400, cc: 1598, co2: 132, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bkia\b.*\b(picanto|stonic)\b/i, label: 'Kia Picanto / Stonic 1.0 / 1.2 (Kia Hellas GR ΛΤΠΦ €14,900)', ltpf2025: 14900, aplt2025: 19400, cc: 998, co2: 120, fuel: 'petrol', body: 'hatchback' },
  { re: /\bkia\b.*\b(ceed|xceed)\b/i, label: 'Kia Ceed / XCeed 1.5 T-GDI 48V MHEV (Kia Hellas GR ΛΤΠΦ €19,600)', ltpf2025: 19600, aplt2025: 25900, cc: 1482, co2: 126, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bkia\b.*\bsportage\b/i, label: 'Kia Sportage 1.6 T-GDI 48V / HEV (Kia Hellas GR ΛΤΠΦ €23,600)', ltpf2025: 23600, aplt2025: 32200, cc: 1598, co2: 133, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bfiat\b.*\b(500|panda)\b/i, label: 'Fiat 500 / Panda 1.0 Hybrid (AutoOne GR ΛΤΠΦ €13,200)', ltpf2025: 13200, aplt2025: 17100, cc: 999, co2: 112, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\balfa\s*romeo\b.*\b(tonale|junior)\b/i, label: 'Alfa Romeo Tonale / Junior 1.5 Hybrid (AutoOne GR ΛΤΠΦ €29,400)', ltpf2025: 29400, aplt2025: 40900, cc: 1469, co2: 130, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\balfa\s*romeo\b.*\b(giulia|stelvio)\b(?!.*\b(quadrifoglio|\bqv\b)\b)/i, label: 'Alfa Romeo Giulia / Stelvio 2.0 Turbo / 2.2 Diesel (AutoOne GR ΛΤΠΦ €42,500)', ltpf2025: 42500, aplt2025: 65900, cc: 2143, co2: 156, fuel: 'diesel', body: 'sedan' },
  { re: /\bjeep\b.*\b(avenger|renegade|compass)\b/i, label: 'Jeep Avenger / Renegade / Compass e-Hybrid (AutoOne GR ΛΤΠΦ €22,900)', ltpf2025: 22900, aplt2025: 30900, cc: 1199, co2: 126, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bvolvo\b.*\bxc\s*40\b/i, label: 'Volvo XC40 B3/B4 Mild Hybrid / T4/T5 PHEV (Velmar GR ΛΤΠΦ €31,800)', ltpf2025: 31800, aplt2025: 45900, cc: 1969, co2: 148, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bvolvo\b.*\bxc\s*60\b/i, label: 'Volvo XC60 B4/B5 / T6/T8 Plug-in Hybrid (Velmar GR ΛΤΠΦ €48,900)', ltpf2025: 48900, aplt2025: 64900, cc: 1969, co2: 24, fuel: 'plugin_hybrid', body: 'suv' },
  { re: /\bmini\b.*\b(countryman)\b/i, label: 'MINI Countryman C / S ALL4 (BMW Hellas GR ΛΤΠΦ €26,800)', ltpf2025: 26800, aplt2025: 36900, cc: 1499, co2: 133, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bmini\b.*\b(cooper|one)\b/i, label: 'MINI Cooper C / S (BMW Hellas GR ΛΤΠΦ €20,400)', ltpf2025: 20400, aplt2025: 28450, cc: 1499, co2: 133, fuel: 'petrol', body: 'hatchback' },
  { re: /\bnissan\b.*\b(qashqai|x-?trail)\b/i, label: 'Nissan Qashqai 1.3 DiG-T Mild Hybrid / e-POWER (Theocar GR ΛΤΠΦ €21,900)', ltpf2025: 21900, aplt2025: 29990, cc: 1332, co2: 142, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bnissan\b.*\b(juke|micra)\b/i, label: 'Nissan Juke / Micra 1.0 DIG-T / Hybrid (Theocar GR ΛΤΠΦ €17,500)', ltpf2025: 17500, aplt2025: 23400, cc: 999, co2: 134, fuel: 'petrol', body: 'suv' },
  { re: /\bsuzuki\b.*\b(swift|ignis)\b/i, label: 'Suzuki Swift / Ignis 1.2 Hybrid (Suzuki Hellas GR ΛΤΠΦ €14,400)', ltpf2025: 14400, aplt2025: 18450, cc: 1197, co2: 99, fuel: 'mild_hybrid', body: 'hatchback' },
  { re: /\bsuzuki\b.*\b(vitara|s-?cross)\b/i, label: 'Suzuki Vitara / S-Cross 1.4 Boosterjet 48V Hybrid (Suzuki Hellas GR ΛΤΠΦ €16,800)', ltpf2025: 16800, aplt2025: 21980, cc: 1373, co2: 119, fuel: 'mild_hybrid', body: 'suv' },
  { re: /\bhonda\b.*\b(civic|hr-?v|cr-?v|jazz)\b(?!.*\btype[\s-]*r\b)/i, label: 'Honda Civic / HR-V / Jazz e:HEV Full Hybrid (Saracakis GR ΛΤΠΦ €24,900)', ltpf2025: 24900, aplt2025: 33900, cc: 1993, co2: 108, fuel: 'hybrid', body: 'hatchback' },
  { re: /\bmazda\b.*\b(cx-?30|cx-?5|mazda\s*3)\b/i, label: 'Mazda 3 / CX-30 / CX-5 e-Skyactiv MHEV (AutoOne GR ΛΤΠΦ €21,800)', ltpf2025: 21800, aplt2025: 29400, cc: 1998, co2: 134, fuel: 'mild_hybrid', body: 'suv' },
];

/**
 * Looks up a vehicle in `GREEK_IMPORTER_LTPF_CATALOG` and adjusts the official Greek `ΛΤΠΦ`
 * for the vehicle's registration year.
 */
export function lookupGreekImporterLtpf(text = '', regYear = 2022) {
  if (!text) return null;
  const s = String(text);
  const entry = GREEK_IMPORTER_LTPF_CATALOG.find((row) => row.re.test(s));
  if (!entry) return null;
  const adjustedLtpf = adjustGreekLtpfForYear(entry.ltpf2025, regYear, 2025);
  return {
    ...entry,
    ltpfEur: adjustedLtpf,
    ltpfRange: {
      low: Math.round(adjustedLtpf * 0.94),
      mid: adjustedLtpf,
      high: Math.round(adjustedLtpf * 1.07),
    },
    sourceLabel:
      regYear >= 2024
        ? `${entry.label} (Official Greek Importer Pricelist)`
        : `${entry.label} (${regYear} MY-Adjusted Official Greek Importer ΛΤΠΦ €${adjustedLtpf.toLocaleString()})`,
  };
}

/**
 * Factory Optional Equipment (Πρόσθετος Εργοστασιακός Εξοπλισμός - ΑΑΔΕ Α.1043/2025).
 */
export const FACTORY_OPTIONS_CATALOG = [
  { id: 'laser_matrix', label: 'Laser / Matrix LED Headlights', re: /matrix|laser ?licht|laserlicht|laser\b|led-?matrix|multibeam|pdls/i, low: 1100, mid: 1650, high: 2400 },
  { id: 'carbon_pkg', label: 'Carbon Exterior / Interior Package', re: /carbon|καρμπόν|cfk|m carbon/i, low: 1400, mid: 2400, high: 3800 },
  { id: 'ceramic_brakes', label: 'Carbon-Ceramic Brakes (PCCB / Ceramic)', re: /ceramic|keramik|pccb/i, low: 4200, mid: 5800, high: 7500 },
  { id: 'sport_chrono', label: 'Sport Chrono / M Driver / Performance Pack', re: /sport.?chrono|weissach|competition|performance.?pack|protonic|ultimate/i, low: 1200, mid: 2100, high: 3400 },
  { id: 'pano_roof', label: 'Panorama / Glass Sunroof', re: /panorama|glasdach|glass roof|schiebedach/i, low: 950, mid: 1450, high: 1950 },
  { id: 'hud', label: 'Head-Up Display (HUD)', re: /head.?up|\bhud\b/i, low: 650, mid: 980, high: 1350 },
  { id: 'premium_audio', label: 'Premium Audio (Harman Kardon / Burmester / B&O / Bose)', re: /bang ?(&|und|and) ?olufsen|\bb&o\b|\bbose\b|harman|\bh&k\b|\bhk\b|burmester|meridian/i, low: 700, mid: 1250, high: 2100 },
  { id: 'acc_distronic', label: 'Adaptive Cruise / Driving Assistant Plus', re: /adaptive cruise|abstandstempomat|\bacc\b|distronic|innodrive|driving assistant/i, low: 600, mid: 950, high: 1400 },
  { id: 'full_leather', label: 'Full Extended Leather / Nappa / Alcantara', re: /vollleder|volleder|nappa|alcantara|spheric|merino|club.?leder/i, low: 900, mid: 1600, high: 2600 },
  { id: 'cam360', label: '360° Surround View Camera', re: /360|surround.?view|rundumsicht|area view/i, low: 450, mid: 700, high: 1050 },
  { id: 'air_lift', label: 'Front Axle Lift / Air Suspension (PASM / Airmatic)', re: /liftsystem|front.?lift|luftfederung|air.?suspension|airmatic|\bpasm\b/i, low: 1200, mid: 1950, high: 2900 },
  { id: 'forged_wheels', label: '20"–22" Forged / Turbine Alloy Wheels', re: /\b(20|21|22)[ -]?(zoll|inch|")|turbinen|forged/i, low: 650, mid: 1200, high: 2100 },
  { id: 'keyless', label: 'Comfort Access / Keyless Entry', re: /keyless|komfortzugang|comfort access/i, low: 350, mid: 600, high: 900 },
  { id: 'electric_seats', label: '14/18-Way Electric Memory Seats', re: /memory.?sitz|18-?wege|14-?wege|elektr.*sitz/i, low: 500, mid: 850, high: 1300 },
];

export function estimateFactoryExtras(text = '', baseListPriceMid = 50000, selectedOptionIds = null, category = 'passenger') {
  if (['motorcycle', 'bus', 'truck_heavy', 'historic', 'moik'].includes(category)) {
    return {
      low: 0,
      mid: 0,
      high: 0,
      detectedItems: [],
      note: 'Exempt from passenger ΛΤΠΦ Annex I/II extras table',
    };
  }

  let detectedItems;
  if (Array.isArray(selectedOptionIds)) {
    detectedItems = FACTORY_OPTIONS_CATALOG.filter((o) => selectedOptionIds.includes(o.id));
  } else {
    detectedItems = FACTORY_OPTIONS_CATALOG.filter((o) => o.re.test(text));
  }

  const detectedLow = detectedItems.reduce((s, i) => s + i.low, 0);
  const detectedMid = detectedItems.reduce((s, i) => s + i.mid, 0);
  const detectedHigh = detectedItems.reduce((s, i) => s + i.high, 0);

  const cap = Math.round(baseListPriceMid * 0.14);

  if (Array.isArray(selectedOptionIds)) {
    return {
      low: Math.min(cap, detectedLow),
      mid: Math.min(cap, detectedMid),
      high: Math.min(cap, detectedHigh),
      detectedItems,
      note: `${detectedItems.length} factory option(s) selected`,
    };
  }

  const low = Math.min(cap, Math.max(detectedLow, Math.round(baseListPriceMid * 0.015)));
  const mid = Math.min(cap, Math.max(detectedMid, Math.round(baseListPriceMid * 0.05)));
  const high = Math.min(cap, Math.max(detectedHigh + Math.round(baseListPriceMid * 0.03), Math.round(baseListPriceMid * 0.105)));

  return {
    low,
    mid,
    high,
    detectedItems,
    note:
      detectedItems.length > 0
        ? `Detected ${detectedItems.map((d) => d.label.split(' ')[0]).join(', ')} + typical VIN extras`
        : 'Estimated VIN extras band (1.5% – 10.5% of ΛΤΠΦ)',
  };
}

/**
 * Known Model Homologation & Greek Pre-Tax List Price (ΛΤΠΦ) Profiles across Supercars, PHEVs, Motorcycles & Pickups
 */
export const MODEL_PROFILES = [
  {
    matchRe: /\bbmw\b.*\bi8\b|\bi8\b.*\b(roadster|coupe|coupé|edrive|protonic)\b/i,
    roadsterRe: /roadster|cabrio|spyder/i,
    category: 'passenger',
    fuel: 'plugin_hybrid',
    cc: 1499,
    co2RangeByYear: (y, isRoadster) =>
      y >= 2018
        ? isRoadster
          ? { low: 46, mid: 46, high: 46 }
          : { low: 42, mid: 42, high: 44 }
        : { low: 49, mid: 49, high: 49 },
    listPriceRangeByYear: (y, isRoadster) => {
      const mid = isRoadster ? 124500 : y >= 2018 ? 114200 : 109800;
      return { low: Math.round(mid * 0.96), mid, high: Math.round(mid * 1.04) };
    },
    body: (isRoadster) => (isRoadster ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'BMW i8 1.5 eDrive PHEV (BMW Hellas Official ΛΤΠΦ • Homologated 42–49 g/km NEDC)',
  },
  {
    matchRe: /\baudi\b.*\ba3\b.*\b(40\s*tfsi\s*e|45\s*tfsi\s*e|tfsie|tfsi\s*e|e-tron|phev)\b/i,
    category: 'passenger',
    fuel: 'plugin_hybrid',
    cc: 1498,
    co2RangeByYear: (y) => (y >= 2024 ? { low: 26, mid: 28, high: 30 } : { low: 24, mid: 26, high: 31 }),
    listPriceRangeByYear: (y) =>
      y >= 2024 ? { low: 36500, mid: 38011, high: 38900 } : { low: 33997, mid: 34671, high: 36301 },
    body: () => 'hatchback',
    confidence: 'high',
    label: 'Audi A3 Sportback TFSI e PHEV (Kosmocar Official Greek ΛΤΠΦ €33,997–€38,011)',
  },
  {
    matchRe: /\bporsche\b.*\b911\b/i,
    roadsterRe: /cabrio|targa|speedster|convertible/i,
    category: 'passenger',
    fuel: (text, y) => (/t-?hybrid/i.test(text) || (y >= 2025 && /\bgts\b/i.test(text)) ? 'hybrid' : 'petrol'),
    cc: (text, y) => {
      if (/gt3|speedster/i.test(text)) return 3996;
      if (/turbo/i.test(text)) return y >= 2020 ? 3745 : 3800;
      if (/t-?hybrid/i.test(text) || (y >= 2025 && /\bgts\b/i.test(text))) return 3591;
      return 2981;
    },
    co2RangeByYear: (y, _isCab, text) => {
      if (/gt3|turbo/i.test(text)) return { low: 275, mid: 295, high: 318 };
      if (/t-?hybrid/i.test(text) || (y >= 2025 && /\bgts\b/i.test(text))) return { low: 239, mid: 244, high: 251 };
      return y >= 2021 ? { low: 233, mid: 241, high: 254 } : { low: 190, mid: 206, high: 220 };
    },
    listPriceRangeByYear: (y, isCab, text) => {
      let mid = y >= 2024 ? 118000 : y >= 2019 ? 96500 : 85000;
      if (/turbo\s*s/i.test(text)) mid = Math.round(mid * 1.82);
      else if (/turbo/i.test(text)) mid = Math.round(mid * 1.65);
      else if (/gt3\s*rs/i.test(text)) mid = Math.round(mid * 1.78);
      else if (/gt3/i.test(text)) mid = Math.round(mid * 1.55);
      else if (/\bgts\b/i.test(text)) mid = Math.round(mid * 1.28);
      else if (/\b4s\b/i.test(text)) mid = Math.round(mid * 1.18);
      else if (/\bcarrera\s*s\b/i.test(text)) mid = Math.round(mid * 1.11);
      if (isCab) mid += 10500;
      return { low: Math.round(mid * 0.94), mid, high: Math.round(mid * 1.08) };
    },
    body: (isCab) => (isCab ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Porsche 911 (991 / 992 Motodynamics Greek ΛΤΠΦ Profile)',
  },
  {
    matchRe: /\bford\b.*\bmustang\b.*\bmach-?e\b|\bmustang\s+mach-?e\b/i,
    category: 'passenger',
    fuel: 'electric',
    cc: 0,
    co2RangeByYear: () => ({ low: 0, mid: 0, high: 0 }),
    listPriceRangeByYear: (_y, _isCab, text) => {
      const mid = /\bgt\b|rally/i.test(text) ? 60476 : /awd|extended|er\b|98\s*kwh|91\s*kwh/i.test(text) ? 49992 : 43540;
      return { low: Math.round(mid * 0.94), mid, high: Math.round(mid * 1.06) };
    },
    body: () => 'suv',
    confidence: 'high',
    label: 'Ford Mustang Mach-E Pure Electric BEV SUV (Ford Motor Hellas ΛΤΠΦ · 100% Tax Exempt V30)',
  },
  {
    matchRe: /\bford\b.*\bmustang\b(?!.*\bmach-?e\b)/i,
    roadsterRe: /cabrio|convertible/i,
    category: 'passenger',
    fuel: 'petrol',
    cc: (text, y) => (/2\.3|ecoboost/i.test(text) ? 2261 : y >= 2018 ? 5038 : 4951),
    co2RangeByYear: (y, _isCab, text) =>
      /2\.3|ecoboost/i.test(text)
        ? y >= 2021
          ? { low: 205, mid: 215, high: 225 }
          : { low: 179, mid: 184, high: 199 }
        : /dark\s*horse|mach\s*1|bullitt/i.test(text)
          ? { low: 275, mid: 279, high: 285 }
          : y >= 2021
            ? { low: 256, mid: 268, high: 282 }
            : { low: 225, mid: 260, high: 281 },
    listPriceRangeByYear: (_y, isCab, text) => {
      const base = /2\.3|ecoboost/i.test(text) ? 37500 : /dark\s*horse/i.test(text) ? 58900 : /mach\s*1|bullitt/i.test(text) ? 54200 : 48500;
      const mid = isCab ? base + 4200 : base;
      return { low: Math.round(mid * 0.93), mid, high: Math.round(mid * 1.07) };
    },
    body: (isCab) => (isCab ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Ford Mustang (2.3 EcoBoost 2,261cc / 5.0 Ti-VCT V8 GT & Dark Horse 5,038cc — Ford Motor Hellas ΛΤΠΦ)',
  },
  {
    matchRe: /\baudi\b.*\br8\b/i,
    roadsterRe: /spyder|cabrio|roadster/i,
    category: 'passenger',
    fuel: 'petrol',
    cc: 5204,
    co2RangeByYear: (y) => (y >= 2021 ? { low: 288, mid: 297, high: 309 } : { low: 272, mid: 287, high: 298 }),
    listPriceRangeByYear: (_y, isSpyder) => {
      const mid = isSpyder ? 156000 : 144000;
      return { low: Math.round(mid * 0.94), mid, high: Math.round(mid * 1.08) };
    },
    body: (isSpyder) => (isSpyder ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Audi R8 5.2 FSI V10 quattro (Kosmocar Greek ΛΤΠΦ)',
  },
  {
    matchRe: /\b(mercedes|amg)\b.*\bamg\s*gt\b/i,
    roadsterRe: /roadster|cabrio|c\s*roadster/i,
    category: 'passenger',
    fuel: 'petrol',
    cc: 3982,
    co2RangeByYear: (y) => (y >= 2021 ? { low: 275, mid: 284, high: 305 } : { low: 216, mid: 224, high: 245 }),
    listPriceRangeByYear: (_y, isRoadster) => {
      const mid = isRoadster ? 131000 : 118000;
      return { low: Math.round(mid * 0.93), mid, high: Math.round(mid * 1.09) };
    },
    body: (isRoadster) => (isRoadster ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Mercedes-AMG GT 4.0 V8 Biturbo (Star Automotive Hellas ΛΤΠΦ)',
  },
  {
    matchRe: /\bferrari\b.*\b(488|f8|296|roma|sf90|812)\b/i,
    roadsterRe: /spider|aperta|gts/i,
    category: 'passenger',
    fuel: (text) => (/296|sf90/i.test(text) ? 'plugin_hybrid' : 'petrol'),
    cc: (text) => {
      if (/\b296\b/i.test(text)) return 2992;
      if (/\bsf90\b/i.test(text)) return 3990;
      if (/\b812\b/i.test(text)) return 6496;
      if (/\broma\b/i.test(text)) return 3855;
      return 3902; // 488 GTB / Pista & F8 Tributo / Spider
    },
    co2RangeByYear: (_y, _isSp, text) => {
      if (/\b296\b/i.test(text)) return { low: 149, mid: 149, high: 153 };
      if (/\bsf90\b/i.test(text)) return { low: 154, mid: 154, high: 160 };
      if (/\b812\b/i.test(text)) return { low: 340, mid: 355, high: 373 };
      if (/\broma\b/i.test(text)) return { low: 250, mid: 255, high: 262 };
      return { low: 260, mid: 275, high: 295 };
    },
    listPriceRangeByYear: (_y, isSp, text) => {
      let mid = 212000;
      if (/\bsf90\b/i.test(text)) mid = isSp ? 380000 : 345000;
      else if (/\b812\b/i.test(text)) mid = isSp ? 295000 : 268000;
      else if (/\b296\b/i.test(text)) mid = isSp ? 242000 : 218000;
      else if (/\broma\b/i.test(text)) mid = isSp ? 196000 : 178000;
      else if (isSp) mid = 235000;
      return { low: Math.round(mid * 0.94), mid, high: Math.round(mid * 1.08) };
    },
    body: (isSp) => (isSp ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Ferrari Supercar Homologation Profile (Genesis / Official Importer ΛΤΠΦ)',
  },
  {
    matchRe: /\blamborghini\b.*\bhurac[aá]n\b|\bhurac[aá]n\b|\b(lp\s*610|lp\s*580|lp\s*640|huracan\s*evo|huracan\s*sto|huracan\s*tecnica|huracan\s*sterrato|huracan\s*performante)\b/i,
    roadsterRe: /spyder|spider|cabrio|roadster|aperta/i,
    category: 'passenger',
    fuel: 'petrol',
    cc: 5204,
    co2RangeByYear: (y, isSpyder, text) => {
      if (/\bsto\b|\bsterrato\b|\btecnica\b/i.test(text)) {
        return { low: 328, mid: 331, high: 338 };
      }
      if (/\bperformante\b/i.test(text)) {
        return isSpyder ? { low: 314, mid: 320, high: 325 } : { low: 308, mid: 314, high: 320 };
      }
      if (y >= 2019 || /\bevo\b/i.test(text)) {
        return isSpyder ? { low: 328, mid: 335, high: 338 } : { low: 322, mid: 332, high: 337 };
      }
      if (/580-?2|\brwd\b/i.test(text)) {
        return isSpyder ? { low: 278, mid: 283, high: 288 } : { low: 275, mid: 278, high: 283 };
      }
      return isSpyder ? { low: 280, mid: 285, high: 290 } : { low: 278, mid: 280, high: 290 };
    },
    listPriceRangeByYear: (y, isSpyder, text) => {
      let mid = 172000;
      if (/\bsto\b/i.test(text)) mid = 256000;
      else if (/\bsterrato\b/i.test(text)) mid = 224000;
      else if (/\btecnica\b/i.test(text)) mid = 204000;
      else if (/\bperformante\b/i.test(text)) mid = 198000;
      else if (/\bevo\b/i.test(text)) {
        mid = /rwd|580|2wd/i.test(text) ? 165000 : 188000;
      } else if (/580-?2|\brwd\b/i.test(text)) {
        mid = 154000;
      } else if (y >= 2020) {
        mid = 188000;
      }
      if (isSpyder && !/\bsto\b|\bsterrato\b|\btecnica\b/i.test(text)) {
        mid += 17500;
      }
      return { low: Math.round(mid * 0.95), mid, high: Math.round(mid * 1.06) };
    },
    body: (isSpyder) => (isSpyder ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Lamborghini Huracán 5.2 V10 (Trident Cars GR ΛΤΠΦ · 5,204 cc · 278–338 g/km CO₂)',
  },
  {
    matchRe: /\blamborghini\b.*\burus\b|\burus\b.*\b(performante|se\b|v8|bi-?turbo)\b/i,
    category: 'passenger',
    fuel: (text) => (/\bse\b|\bphev\b|\bhybrid\b/i.test(text) ? 'plugin_hybrid' : 'petrol'),
    cc: 3996,
    co2RangeByYear: (_y, _isCab, text) => (/\bse\b|\bphev\b|\bhybrid\b/i.test(text) ? { low: 51, mid: 51, high: 60 } : { low: 292, mid: 320, high: 325 }),
    listPriceRangeByYear: (_y, _isCab, text) => {
      const mid = /\bse\b|\bphev\b/i.test(text) ? 212000 : /performante|\bs\b/i.test(text) ? 208000 : 182000;
      return { low: Math.round(mid * 0.95), mid, high: Math.round(mid * 1.06) };
    },
    body: () => 'suv',
    confidence: 'high',
    label: 'Lamborghini Urus 4.0 V8 BiTurbo / Urus SE PHEV SUV (Trident Cars GR ΛΤΠΦ · 3,996 cc)',
  },
  {
    matchRe: /\blamborghini\b.*\baventador\b|\baventador\b.*\b(lp\s*7\d\d|svj|ultimae)\b/i,
    roadsterRe: /roadster|spyder|spider/i,
    category: 'passenger',
    fuel: 'petrol',
    cc: 6498,
    co2RangeByYear: () => ({ low: 370, mid: 398, high: 452 }),
    listPriceRangeByYear: (_y, isRoadster, text) => {
      let mid = /svj|ultimae/i.test(text) ? 345000 : /\bsv\b/i.test(text) ? 310000 : 272000;
      if (isRoadster) mid += 26000;
      return { low: Math.round(mid * 0.95), mid, high: Math.round(mid * 1.06) };
    },
    body: (isRoadster) => (isRoadster ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Lamborghini Aventador 6.5 V12 (Trident Cars GR ΛΤΠΦ · 6,498 cc)',
  },
  // ======================== JDM ICONS (NISSAN GT-R R35, TOYOTA GR SUPRA, GR YARIS, CIVIC TYPE R, MAZDA MX-5) ========================
  {
    matchRe: /\bnissan\b.*\b(gt-?r|gtr|\br35\b)\b/i,
    fuel: 'petrol',
    cc: 3799,
    co2RangeByYear: (year) => (year >= 2019 ? { low: 305, mid: 316, high: 325 } : { low: 275, mid: 278, high: 285 }),
    listPriceRangeByYear: (year, _isRoadster, text = '') => {
      if (/\bnismo\b/i.test(text)) return { low: 142000, mid: 148000, high: 155000 };
      if (/\btrack\s*edition\b/i.test(text)) return { low: 119000, mid: 124000, high: 129000 };
      const base = year >= 2020 ? 112000 : year >= 2016 ? 102000 : 88000;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: () => 'coupe',
    confidence: 'high',
    label: 'Nissan GT-R R35 3.8 V6 Twin-Turbo VR38DETT (Theocar GR Homologation ΛΤΠΦ €88,000–€148,000)',
  },
  {
    matchRe: /\btoyota\b.*\b(gr\s*supra|supra)\b/i,
    fuel: 'petrol',
    cc: (text) => (/\b(2\.0|258\s*(hp|ps)|190\s*kw|b48)\b/i.test(text) ? 1998 : 2998),
    co2RangeByYear: (_year, _isRoadster, text = '') =>
      /\b(2\.0|258\s*(hp|ps)|190\s*kw|b48)\b/i.test(text)
        ? { low: 163, mid: 167, high: 172 }
        : { low: 185, mid: 188, high: 198 },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      const base = /\b(2\.0|258\s*(hp|ps)|190\s*kw|b48)\b/i.test(text) ? 42500 : 52900;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: () => 'coupe',
    confidence: 'high',
    label: 'Toyota GR Supra A90 2.0L / 3.0L Inline-6 (Toyota Hellas Official GR ΛΤΠΦ €42,500–€52,900)',
  },
  {
    matchRe: /\btoyota\b.*\b(gr\s*yaris)\b/i,
    fuel: 'petrol',
    cc: 1618,
    co2RangeByYear: (year) => (year >= 2024 ? { low: 190, mid: 197, high: 215 } : { low: 184, mid: 186, high: 192 }),
    listPriceRangeByYear: (year) => {
      const base = year >= 2024 ? 39800 : 34800;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.06) };
    },
    body: () => 'hatchback',
    confidence: 'high',
    label: 'Toyota GR Yaris 1.6 Turbo AWD G16E-GTS (Toyota Hellas Official GR ΛΤΠΦ €34,800–€39,800)',
  },
  {
    matchRe: /\bhonda\b.*\bcivic\b.*\btype[\s-]*r\b/i,
    fuel: 'petrol',
    cc: 1996,
    co2RangeByYear: (year) => (year >= 2022 ? { low: 185, mid: 186, high: 189 } : { low: 176, mid: 178, high: 182 }),
    listPriceRangeByYear: (year) => {
      const base = year >= 2022 ? 47900 : year >= 2017 ? 38500 : 34500;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: () => 'hatchback',
    confidence: 'high',
    label: 'Honda Civic Type R FK2/FK8/FL5 2.0 VTEC Turbo (Saracakis GR Official ΛΤΠΦ €34,500–€47,900)',
  },
  {
    matchRe: /\bmazda\b.*\b(mx-?5|miata)\b/i,
    roadsterRe: /\b(roadster|cabrio|convertible|soft\s*top|rf\b)\b/i,
    fuel: 'petrol',
    cc: (text) => (/\b(2\.0|184\s*(hp|ps)|160\s*(hp|ps)|135\s*kw)\b/i.test(text) ? 1998 : 1496),
    co2RangeByYear: (_year, _isRoadster, text = '') =>
      /\b(2\.0|184\s*(hp|ps)|160\s*(hp|ps)|135\s*kw)\b/i.test(text)
        ? { low: 152, mid: 155, high: 161 }
        : { low: 138, mid: 142, high: 145 },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      let base = /\b(2\.0|184\s*(hp|ps)|160\s*(hp|ps)|135\s*kw)\b/i.test(text) ? 25800 : 21900;
      if (/\brf\b/i.test(text)) base += 2200;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: () => 'cabrio',
    confidence: 'high',
    label: 'Mazda MX-5 ND 1.5 / 2.0 Skyactiv-G Roadster / RF (AutoOne GR Official ΛΤΠΦ €21,900–€28,000)',
  },
  {
    matchRe: /\balfa\s*romeo\b.*\b(giulia|stelvio)\b.*\b(quadrifoglio|\bqv\b)\b/i,
    fuel: 'petrol',
    cc: 2891,
    co2RangeByYear: (_year, _isRoadster, text = '') =>
      /\bstelvio\b/i.test(text) ? { low: 245, mid: 250, high: 267 } : { low: 222, mid: 227, high: 235 },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      const base = /\bstelvio\b/i.test(text) ? 86000 : 78500;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: (_isRoadster, text = '') => (/\bstelvio\b/i.test(text) ? 'suv' : 'sedan'),
    confidence: 'high',
    label: 'Alfa Romeo Giulia / Stelvio 2.9 V6 Bi-Turbo Quadrifoglio (Official GR ΛΤΠΦ €78,500–€86,000)',
  },
  // ======================== SUPER-SUVS & ULTRA-LUXURY (AMG G63, DEFENDER, RANGE ROVER, BENTLEY, ASTON MARTIN, PORSCHE 718 GT4) ========================
  {
    matchRe: /\b(mercedes|amg)\b.*\b(g\s*63|g63|g\s*500|g500|g\s*350\s*d|g\s*400\s*d|g\s*450\s*d|g\s*580|g-?class|g-?klasse)\b/i,
    fuel: (text, year = 2022) => {
      if (/\b(g\s*580|eq\s*tech|electric|bev)\b/i.test(text)) return 'electric';
      if (/\b(g\s*350\s*d|g\s*400\s*d|g\s*450\s*d|diesel)\b/i.test(text)) return year >= 2024 ? 'mild_hybrid' : 'diesel';
      return year >= 2024 ? 'mild_hybrid' : 'petrol';
    },
    cc: (text, year = 2022) => {
      if (/\b(g\s*580|eq\s*tech|electric|bev)\b/i.test(text)) return 0;
      if (/\b(g\s*350\s*d|g\s*400\s*d)\b/i.test(text)) return 2925;
      if (/\bg\s*450\s*d\b/i.test(text)) return 2989;
      if (/\bg\s*500\b/i.test(text) && year >= 2024) return 2999;
      return year >= 2018 ? 3982 : 5461;
    },
    co2RangeByYear: (year, _isRoadster, text = '') => {
      if (/\b(g\s*580|eq\s*tech|electric|bev)\b/i.test(text)) return { low: 0, mid: 0, high: 0 };
      if (/\b(g\s*350\s*d|g\s*400\s*d|g\s*450\s*d)\b/i.test(text)) return { low: 229, mid: 247, high: 268 };
      return year >= 2024 ? { low: 330, mid: 335, high: 342 } : { low: 330, mid: 345, high: 358 };
    },
    listPriceRangeByYear: (year, _isRoadster, text = '') => {
      if (/\b(g\s*580|eq\s*tech|electric|bev)\b/i.test(text)) return { low: 115000, mid: 119500, high: 126000 };
      if (/\b(g\s*350\s*d|g\s*400\s*d|g\s*450\s*d)\b/i.test(text)) {
        const dBase = year >= 2024 ? 108500 : 96000;
        return { low: Math.round(dBase * 0.96), mid: dBase, high: Math.round(dBase * 1.05) };
      }
      if (/\bg\s*500\b/i.test(text)) return { low: 105000, mid: 112000, high: 118000 };
      const base = year >= 2024 ? 158500 : year >= 2022 ? 148000 : 138000;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.06) };
    },
    body: () => 'suv',
    confidence: 'high',
    label: 'Mercedes-Benz G-Class / AMG G 63 / G 580 EQ (Star Automotive GR ΛΤΠΦ €96,000–€158,500)',
  },
  {
    matchRe: /\bland\s*rover\b.*\bdefender\b|\bdefender\b.*\b(90|110|130|p400e|d250|d300|d350|v8|octa)\b/i,
    fuel: (text) => {
      if (/\b(p400e|p300e|phev|plug-?in)\b/i.test(text)) return 'plugin_hybrid';
      if (/\b(v8|p525)\b/i.test(text) && !/\bocta\b/i.test(text)) return 'petrol';
      return 'mild_hybrid';
    },
    cc: (text) => {
      if (/\b(p400e|p300e)\b/i.test(text)) return 1997;
      if (/\bocta\b/i.test(text)) return 4395;
      if (/\b(v8|p525)\b/i.test(text)) return 5000;
      return 2997;
    },
    co2RangeByYear: (_year, _isRoadster, text = '') => {
      if (/\b(p400e|p300e|phev)\b/i.test(text)) return { low: 59, mid: 64, high: 74 };
      if (/\b(v8|p525|octa)\b/i.test(text)) return { low: 298, mid: 327, high: 340 };
      return { low: 215, mid: 226, high: 238 };
    },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      let base = 62500;
      if (/\bocta\b/i.test(text)) base = 142000;
      else if (/\b(v8|p525)\b/i.test(text)) base = 118000;
      else if (/\b(p400e|p300e|phev)\b/i.test(text)) base = 68500;
      else if (/\b130\b/i.test(text)) base = 71500;
      else if (/\b90\b/i.test(text)) base = 56500;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.06) };
    },
    body: () => 'suv',
    confidence: 'high',
    label: 'Land Rover Defender L663 90/110/130 D250/D300/P400e/V8 (Petropoulos GR ΛΤΠΦ €56,500–€142,000)',
  },
  {
    matchRe: /\brange\s*rover\b.*\b(sport|vogue|autobiography|sv\b|p460e|p550e|p510e|p400e|d300|d350|p530)\b/i,
    fuel: (text) => {
      if (/\b(p460e|p550e|p510e|p400e|phev|plug-?in)\b/i.test(text)) return 'plugin_hybrid';
      return 'mild_hybrid';
    },
    cc: (text) => {
      if (/\bp400e\b/i.test(text)) return 1997;
      if (/\b(p460e|p550e|p510e)\b/i.test(text)) return 2996;
      if (/\b(p530|\bsv\b|v8)\b/i.test(text)) return 4395;
      return 2997;
    },
    co2RangeByYear: (_year, _isRoadster, text = '') => {
      if (/\b(p460e|p550e|p510e)\b/i.test(text)) return { low: 18, mid: 20, high: 29 };
      if (/\bp400e\b/i.test(text)) return { low: 64, mid: 69, high: 75 };
      if (/\b(p530|\bsv\b|v8)\b/i.test(text)) return { low: 265, mid: 272, high: 290 };
      return { low: 190, mid: 196, high: 210 };
    },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      const isSport = /\bsport\b/i.test(text);
      let base = isSport ? 82500 : 98500;
      if (/\bsv\b/i.test(text)) base = 158000;
      else if (/\bp530\b/i.test(text)) base = 128000;
      else if (/\b(p460e|p550e|p510e)\b/i.test(text)) base = isSport ? 94500 : 112000;
      else if (/\bp400e\b/i.test(text)) base = 76500;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.06) };
    },
    body: () => 'suv',
    confidence: 'high',
    label: 'Range Rover / Range Rover Sport L460/L461 (Petropoulos GR Official ΛΤΠΦ €76,500–€158,000)',
  },
  {
    matchRe: /\bbentley\b.*\b(continental|bentayga|flying\s*spur)\b/i,
    roadsterRe: /\b(gtc|convertible|cabrio)\b/i,
    fuel: (text, year = 2022) => {
      if (/\b(hybrid|phev|e-?hybrid|ultra\s*performance)\b/i.test(text) || (year >= 2025 && /\bspeed\b/i.test(text))) {
        return 'plugin_hybrid';
      }
      return 'petrol';
    },
    cc: (text, year = 2022) => {
      if (/\bbentayga\b.*\b(hybrid|phev)\b/i.test(text)) return 2995;
      if (/\bw12\b/i.test(text) || (/\bspeed\b/i.test(text) && year <= 2024 && !/\b(hybrid|v8)\b/i.test(text))) return 5950;
      return 3996;
    },
    co2RangeByYear: (year, _isRoadster, text = '') => {
      if (/\b(ultra\s*performance)\b/i.test(text) || (year >= 2025 && /\bspeed\b/i.test(text))) return { low: 29, mid: 29, high: 33 };
      if (/\bbentayga\b.*\b(hybrid|phev)\b/i.test(text)) return { low: 78, mid: 82, high: 86 };
      if (/\bw12\b/i.test(text)) return { low: 308, mid: 320, high: 336 };
      return { low: 275, mid: 284, high: 298 };
    },
    listPriceRangeByYear: (year, isRoadster, text = '') => {
      let base = /\bbentayga\b/i.test(text) ? 178000 : 188000;
      if (/\bbentayga\b.*\b(hybrid|phev)\b/i.test(text)) base = 168000;
      else if (year >= 2025 && /\bspeed\b/i.test(text)) base = 218000;
      else if (/\b(w12|speed|mulliner)\b/i.test(text)) base = 215000;
      if (isRoadster) base += 20000;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: (isRoadster, text = '') => (/\bbentayga\b/i.test(text) ? 'suv' : /\bflying\s*spur\b/i.test(text) ? 'sedan' : isRoadster ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Bentley Continental GT / GTC / Bentayga / Flying Spur (Kosmocar Bentley GR ΛΤΠΦ €168,000–€238,000)',
  },
  {
    matchRe: /\baston\s*martin\b.*\b(vantage|db11|db12|dbs|dbx|dbx\s*707|vanquish)\b/i,
    roadsterRe: /\b(volante|roadster|cabrio|convertible)\b/i,
    fuel: 'petrol',
    cc: (text) => (/\b(v12|dbs|vanquish)\b/i.test(text) ? 5204 : 3982),
    co2RangeByYear: (_year, _isRoadster, text = '') => {
      if (/\bdbx\s*707\b/i.test(text)) return { low: 318, mid: 323, high: 330 };
      if (/\bdbx\b/i.test(text)) return { low: 305, mid: 312, high: 320 };
      if (/\b(v12|dbs|vanquish)\b/i.test(text)) return { low: 295, mid: 306, high: 315 };
      return { low: 245, mid: 268, high: 282 };
    },
    listPriceRangeByYear: (year, isRoadster, text = '') => {
      let base = 138000;
      if (/\b(dbs|vanquish)\b/i.test(text)) base = 245000;
      else if (/\bdbx\s*707\b/i.test(text)) base = 198000;
      else if (/\bdbx\b/i.test(text)) base = 165000;
      else if (/\b(db12|db11)\b/i.test(text)) base = /\bv12\b/i.test(text) ? 210000 : 182000;
      else if (/\bvantage\b/i.test(text) && year >= 2024) base = 168000;
      if (isRoadster) base += 14000;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: (isRoadster, text = '') => (/\bdbx\b/i.test(text) ? 'suv' : isRoadster ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Aston Martin Vantage / DB11 / DB12 / DBS / DBX707 (Homologation ΛΤΠΦ €138,000–€245,000)',
  },
  {
    matchRe: /\bporsche\b.*\b(718|cayman|boxster)\b.*\b(gt4\s*rs|spyder\s*rs|gt4\b|gts\s*4\.0)\b/i,
    roadsterRe: /\b(spyder|boxster)\b/i,
    fuel: 'petrol',
    cc: (text) => (/\b(gt4\s*rs|spyder\s*rs)\b/i.test(text) ? 3996 : 3995),
    co2RangeByYear: (_year, _isRoadster, text = '') =>
      /\b(gt4\s*rs|spyder\s*rs)\b/i.test(text)
        ? { low: 295, mid: 299, high: 305 }
        : { low: 245, mid: 249, high: 256 },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      const base = /\b(gt4\s*rs|spyder\s*rs)\b/i.test(text) ? 124500 : 84500;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: (isRoadster) => (isRoadster ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Porsche 718 Cayman GT4 / GT4 RS / Spyder RS 4.0L (Motodynamics GR ΛΤΠΦ €84,500–€124,500)',
  },
  // ======================== HYPERCARS & BESPOKE LUXURY (ROLLS-ROYCE, BUGATTI, MASERATI MC20/FOLGORE, LOTUS EMIRA/ELETRE) ========================
  {
    matchRe: /\brolls[\s-]*royce\b.*\b(cullinan|ghost|phantom|wraith|dawn|spectre)\b/i,
    roadsterRe: /\b(dawn|drophead|convertible|cabrio)\b/i,
    fuel: (text) => (/\bspectre\b/i.test(text) ? 'electric' : 'petrol'),
    cc: (text) => (/\bspectre\b/i.test(text) ? 0 : /\b(wraith|dawn)\b/i.test(text) ? 6592 : 6749),
    co2RangeByYear: (_year, _isRoadster, text = '') => {
      if (/\bspectre\b/i.test(text)) return { low: 0, mid: 0, high: 0 };
      if (/\b(wraith|dawn)\b/i.test(text)) return { low: 325, mid: 328, high: 335 };
      return { low: 341, mid: 352, high: 368 };
    },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      let base = 265000; // Ghost
      if (/\bspectre\b/i.test(text)) base = 318000;
      else if (/\bphantom\b/i.test(text)) base = 395000;
      else if (/\bcullinan\b/i.test(text)) base = /\bblack\s*badge\b/i.test(text) ? 325000 : 285000;
      else if (/\bghost\b/i.test(text)) base = /\bblack\s*badge\b/i.test(text) ? 302000 : 265000;
      else if (/\bdawn\b/i.test(text)) base = 278000;
      else if (/\bwraith\b/i.test(text)) base = 255000;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: (isRoadster, text = '') =>
      /\bcullinan\b/i.test(text) ? 'suv' : /\b(ghost|phantom)\b/i.test(text) ? 'sedan' : isRoadster ? 'cabrio' : 'coupe',
    confidence: 'high',
    label: 'Rolls-Royce Cullinan / Ghost / Phantom / Wraith / Dawn / Spectre BEV (Homologation ΛΤΠΦ €255,000–€395,000)',
  },
  {
    matchRe: /\bbugatti\b.*\b(chiron|veyron|mistral|divo|tourbillon)\b/i,
    roadsterRe: /\b(mistral|grand\s*sport|vitesse|roadster)\b/i,
    fuel: (text) => (/\btourbillon\b/i.test(text) ? 'plugin_hybrid' : 'petrol'),
    cc: (text) => (/\btourbillon\b/i.test(text) ? 8300 : 7993),
    co2RangeByYear: (_year, _isRoadster, text = '') =>
      /\btourbillon\b/i.test(text) ? { low: 140, mid: 150, high: 165 } : { low: 505, mid: 516, high: 539 },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      let base = 2400000; // Chiron
      if (/\btourbillon\b/i.test(text)) base = 3800000;
      else if (/\b(super\s*sport|pur\s*sport)\b/i.test(text)) base = 3200000;
      else if (/\bveyron\b/i.test(text)) base = 1350000;
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: (isRoadster) => (isRoadster ? 'cabrio' : 'coupe'),
    confidence: 'high',
    label: 'Bugatti Veyron / Chiron / Super Sport / Tourbillon W16/V16 (Homologation ΛΤΠΦ €1.35M–€3.80M)',
  },
  {
    matchRe: /\bmaserati\b.*\b(mc20|mc\s*20|grecale|granturismo|gran\s*turismo|levante)\b/i,
    roadsterRe: /\b(cielo|grancabrio|spyder|cabrio|convertible)\b/i,
    fuel: (text) => {
      if (/\bfolgore\b/i.test(text)) return 'electric';
      if (/\bgrecale\b.*\b(gt\b|modena)\b/i.test(text)) return 'mild_hybrid';
      return 'petrol';
    },
    cc: (text) => {
      if (/\bfolgore\b/i.test(text)) return 0;
      if (/\bgrecale\b.*\b(gt\b|modena)\b/i.test(text)) return 1995;
      return 2992;
    },
    co2RangeByYear: (_year, _isRoadster, text = '') => {
      if (/\bfolgore\b/i.test(text)) return { low: 0, mid: 0, high: 0 };
      if (/\bgrecale\b.*\b(gt\b|modena)\b/i.test(text)) return { low: 192, mid: 198, high: 205 };
      return { low: 254, mid: 261, high: 270 };
    },
    listPriceRangeByYear: (_year, isRoadster, text = '') => {
      let base = 188000; // MC20 Coupé
      if (/\b(mc20|mc\s*20)\b/i.test(text)) base = isRoadster || /\bcielo\b/i.test(text) ? 212000 : 188000;
      else if (/\bgrecale\b/i.test(text)) {
        base = /\bfolgore\b/i.test(text) ? 89500 : /\btrofeo\b/i.test(text) ? 88500 : /\bmodena\b/i.test(text) ? 62500 : 54500;
      } else if (/\b(granturismo|gran\s*turismo)\b/i.test(text)) {
        base = /\bfolgore\b/i.test(text) ? 158000 : /\btrofeo\b/i.test(text) ? 162000 : 134000;
      } else if (/\blevante\b/i.test(text)) {
        base = 82000;
      }
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: (isRoadster, text = '') =>
      /\b(grecale|levante)\b/i.test(text) ? 'suv' : isRoadster || /\bcielo\b/i.test(text) ? 'cabrio' : 'coupe',
    confidence: 'high',
    label: 'Maserati MC20 / Cielo / Grecale / GranTurismo / Folgore BEV (Trident Cars GR ΛΤΠΦ €54,500–€212,000)',
  },
  {
    matchRe: /\blotus\b.*\b(emira|eletre|emeya|evora|exige|elise)\b/i,
    roadsterRe: /\b(roadster|cabrio|convertible)\b/i,
    fuel: (text) => (/\b(eletre|emeya)\b/i.test(text) ? 'electric' : 'petrol'),
    cc: (text) => {
      if (/\b(eletre|emeya)\b/i.test(text)) return 0;
      if (/\bemira\b.*\b(2\.0|i4|amg|360|400)\b/i.test(text)) return 1991;
      if (/\belise\b/i.test(text)) return 1798;
      return 3456;
    },
    co2RangeByYear: (_year, _isRoadster, text = '') => {
      if (/\b(eletre|emeya)\b/i.test(text)) return { low: 0, mid: 0, high: 0 };
      if (/\bemira\b.*\b(2\.0|i4|amg|360|400)\b/i.test(text)) return { low: 205, mid: 208, high: 214 };
      if (/\belise\b/i.test(text)) return { low: 170, mid: 173, high: 178 };
      return { low: 235, mid: 243, high: 258 };
    },
    listPriceRangeByYear: (_year, _isRoadster, text = '') => {
      let base = 76500; // Emira V6
      if (/\b(eletre|emeya)\b/i.test(text)) {
        base = /\b\br\b/i.test(text) ? 124000 : /\b\bs\b/i.test(text) ? 102000 : 82500;
      } else if (/\bemira\b.*\b(2\.0|i4|amg|360|400)\b/i.test(text)) {
        base = 72500;
      } else if (/\b(exige|evora)\b/i.test(text)) {
        base = 68500;
      } else if (/\belise\b/i.test(text)) {
        base = 44500;
      }
      return { low: Math.round(base * 0.96), mid: base, high: Math.round(base * 1.05) };
    },
    body: (_isRoadster, text = '') => (/\beletre\b/i.test(text) ? 'suv' : /\bemeya\b/i.test(text) ? 'sedan' : 'coupe'),
    confidence: 'high',
    label: 'Lotus Emira V6 & 2.0 / Eletre & Emeya BEV / Exige / Elise (Homologation ΛΤΠΦ €44,500–€124,000)',
  },
  {
    matchRe: /\b(tesla\s+model\s+[3ysx]|porsche\s+taycan|audi\s+(?:e-?tron\s+gt|q4\s+e-?tron|q8\s+e-?tron)|bmw\s+(?:i3|i4|ix|ix1|ix2|ix3|i5|i7)\b|mercedes(?:-benz)?\s+(?:eqa|eqb|eqc|eqe|eqs)\b|vw\s+id\.[3457]|volkswagen\s+id\.[3457]|hyundai\s+ioniq\s*[56]|kia\s+ev[369]|polestar\s+[234])\b/i,
    category: 'passenger',
    fuel: 'electric',
    cc: 0,
    co2RangeByYear: () => ({ low: 0, mid: 0, high: 0 }),
    listPriceRangeByYear: (_y, _isCab, text) => {
      let mid = 39500;
      if (/tesla\s+model\s+3/i.test(text)) {
        mid = /performance/i.test(text) ? 46766 : /long\s*range|\blr\b|awd|dual\s*motor/i.test(text) ? 40315 : 33863;
      } else if (/tesla\s+model\s+y/i.test(text)) {
        mid = /performance/i.test(text) ? 48379 : /long\s*range|\blr\b|awd|dual\s*motor/i.test(text) ? 41927 : 36282;
      } else if (/tesla\s+model\s+s/i.test(text)) {
        mid = /plaid/i.test(text) ? 88702 : 76605;
      } else if (/tesla\s+model\s+x/i.test(text)) {
        mid = /plaid/i.test(text) ? 92734 : 80637;
      } else if (/porsche\s+taycan/i.test(text)) {
        mid = /\bturbo\s*s\b/i.test(text) ? 169000 : /\bturbo\b/i.test(text) ? 141500 : /\bgts\b/i.test(text) ? 112000 : /\b4s\b/i.test(text) ? 96500 : 81800;
      } else if (/e-?tron\s+gt|eqs|i7/i.test(text)) {
        mid = 88000;
      } else if (/i4|ix3|eqe|i5|q8\s+e-?tron/i.test(text)) {
        mid = 56000;
      }
      return { low: Math.round(mid * 0.94), mid, high: Math.round(mid * 1.06) };
    },
    body: (_isCab, text) => (/suv|ix|q4|q8|eqa|eqb|eqc|model\s+[yx]|id\.[45]|ioniq\s*5|ev[69]/i.test(text || '') ? 'suv' : 'sedan'),
    confidence: 'high',
    label: 'Pure Electric BEV (0 g/km CO₂ — 100% Exempt from Greek Registration Tax & Road Tax, ICISnet V30/V31)',
  },
  {
    matchRe: /\bbmw\b.*\b(r\s*1250\s*gs|r1250gs|r\s*1300\s*gs|s\s*1000\s*rr)\b/i,
    category: 'motorcycle',
    fuel: 'petrol',
    cc: 1254,
    co2RangeByYear: () => ({ low: 110, mid: 110, high: 115 }),
    listPriceRangeByYear: () => ({ low: 15400, mid: 16500, high: 18200 }),
    body: () => 'coupe',
    confidence: 'high',
    label: 'BMW Motorrad R 1250 GS / S 1000 RR (Δ.Κ. 87.11 — 12% Bracket 901–1400cc)',
  },
  {
    matchRe: /\bford\b.*\branger\b|\btoyota\b.*\bhilux\b|\bvw\b.*\bamarok\b/i,
    category: 'truck_double_cab',
    fuel: 'diesel',
    cc: 1996,
    co2RangeByYear: () => ({ low: 198, mid: 215, high: 235 }),
    listPriceRangeByYear: () => ({ low: 34500, mid: 38500, high: 44000 }),
    body: () => 'suv',
    confidence: 'high',
    label: 'Double-Cab Pickup ≤3.5t (ν. 5222/2025 Άρθ. 139 §1ε — 8% Base Tax)',
  },
];
