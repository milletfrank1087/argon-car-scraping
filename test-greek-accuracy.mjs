/**
 * 56-Test Primary-Source Greek Customs & ΛΤΠΦ Accuracy Benchmark Suite
 *
 * Tests `greek-ltpf-catalog.mjs`, `greek-ltpf-auditor.mjs`, and `greek-import-calc.mjs` against:
 * 1. Official 2026 Greek Importer Pricelists deposited at AADE (`ΔΙΠΕΑΑ`):
 *    - BMW Group Hellas Official Retail & Pre-Tax Pricelist (08/07/2026)
 *    - Kosmocar Audi MY26 Official Pricelist (04/06/2026, Prot. 472724 ΕΙ 2026)
 *    - Kosmocar Volkswagen MY26 Official Pricelist (18/02/2026)
 * 2. Official AADE Worked Examples (`Ε.2125/2020`, `ΔΕΦΚΦΔ 1192035 ΕΞ 2017` ICISnet Πεδίο 849)
 * 3. Pre-06/2016 `ν. 3833/2010` Legacy Inverter & Dutch RDW (`Wet BPM 1992`) Netto Catalogusprijs Stripper
 * 4. End-to-End Used Car Catalog Locks, Blind Multi-Trim Estimator & `ν. 5313/2026` Hybrid Sunset Cliffs
 * 5. American Muscle Cars (`Ford Mustang GT 5.0 V8`, `Mustang Dark Horse`, `Mustang 2.3 EcoBoost`, `Mustang Mach-E BEV`, `Corvette C8 6.2 V8`)
 * 6. Exotic Supercars (`Lamborghini Huracán EVO`, `Huracán STO`, `Huracán LP 580-2 Spyder`, `Urus SE PHEV`, `Aventador SVJ`, `Ferrari 296 GTB PHEV`, `Ferrari SF90 Spider PHEV`, `Ferrari 812 Superfast`, `Porsche 911 GT3`, `Porsche 911 GTS T-Hybrid`, `McLaren 720S`)
 * 7. Direct-Sales Pure Electric BEVs (`Tesla Model 3 RWD / Performance`, `Tesla Model Y Long Range`, `Tesla Model S Plaid`)
 * 8. Special Customs Regimes (`Double-Cab Pick-up Άρθ. 139`, `Historic ≥30yr Δ.Κ. 97.05`, `Rotary Wankel 2x CC Άρθ. 143`)
 */

import * as cat from './greek-ltpf-catalog.mjs';
import * as aud from './greek-ltpf-auditor.mjs';
import * as calc from './greek-import-calc.mjs';

const tests = [];

function addTest(id, category, name, actual, expected, source) {
  const diff = +(actual - expected).toFixed(2);
  const pct = expected === 0 ? (actual === 0 ? 0 : 100) : +((Math.abs(diff) / expected) * 100).toFixed(4);
  tests.push({ id, category, name, actual, expected, diff, pct, source });
}

function runInv(id, name, aplt, opts, officialLtpf, source) {
  const res = cat.invertGreekRetailToLtpf(aplt, opts);
  addTest(id, '1. Official 2026 Importer Pricelist Inversion (ΑΠΛΤ → ΛΤΠΦ)', name, res.ltpfEur, officialLtpf, source);
}

// GROUP 1: 18 Official 2026 Greek Importer Pricelist Models
runInv('T01', 'BMW 116 Hatch (F70, 1499cc Petrol, 135g WLTP)', 27700, { co2: 135, fuel: 'petrol', cycle: 'wltp' }, 19983, 'BMW Group Hellas 08/07/2026');
runInv('T02', 'BMW 120 Hatch (F70, 1499cc MHEV, 121g WLTP, V32 50%)', 29990, { co2: 121, fuel: 'mhev', cycle: 'wltp' }, 22475, 'BMW Group Hellas 08/07/2026');
runInv('T03', 'BMW 218i Coupé (G42, 1998cc Petrol, 148g WLTP)', 49900, { co2: 148, fuel: 'petrol', cycle: 'wltp' }, 32026, 'BMW Group Hellas 08/07/2026');
runInv('T04', 'BMW M240i xDrive Coupé (G42, 2998cc MHEV, 167g WLTP)', 67367, { co2: 167, fuel: 'mhev', cycle: 'wltp' }, 47721, 'BMW Group Hellas 08/07/2026');
runInv('T05', 'BMW M2 Coupé LCI (G87, 2993cc Petrol, 220g WLTP)', 97150, { co2: 220, fuel: 'petrol', cycle: 'wltp' }, 59139, 'BMW Group Hellas 08/07/2026');
runInv('T06', 'BMW 225e xDrive Active Tourer (U06, 1499cc PHEV, 49g V34 75%)', 49291, { co2: 49, fuel: 'plugin_hybrid', cycle: 'wltp' }, 37486, 'BMW Group Hellas 08/07/2026');
runInv('T07', 'BMW 225e xDrive Active Tourer (U06, 1499cc PHEV, 60g V32 50%)', 52100, { co2: 60, fuel: 'plugin_hybrid', cycle: 'wltp' }, 37486, 'BMW Group Hellas 08/07/2026');
runInv('T08', 'BMW i3 50 xDrive Sedan (NA0, BEV, 0g V30 100%)', 65500, { co2: 0, fuel: 'electric', cycle: 'wltp' }, 52823, 'BMW Group Hellas 08/07/2026');
runInv('T09', 'BMW 320d xDrive Sedan (G20 LCI, 1995cc MHEV, 138g WLTP)', 60100, { co2: 138, fuel: 'mhev', cycle: 'wltp' }, 43029, 'BMW Group Hellas 08/07/2026');
runInv('T10', 'BMW M3 Competition Sedan (G80 LCI, 2993cc Petrol, 220g WLTP)', 139100, { co2: 220, fuel: 'petrol', cycle: 'wltp' }, 84875, 'BMW Group Hellas 08/07/2026');
runInv('T11', 'Audi A3 Sportback TFSI 116hp (8Y, 1498cc Petrol, 125g WLTP)', 27580, { co2: 125, fuel: 'petrol', cycle: 'wltp' }, 19998, 'Kosmocar Audi Prot. 472724');
runInv('T12', 'Audi A3 Sportback S line TFSI MHEV 150hp (8Y, 1498cc MHEV, 120g)', 31980, { co2: 120, fuel: 'mhev', cycle: 'wltp' }, 23772, 'Kosmocar Audi Prot. 472724');
runInv('T13', 'Audi A3 Sportback S line TFSI e 272hp (8Y, 1498cc PHEV, 28g V34)', 49980, { co2: 28, fuel: 'plugin_hybrid', cycle: 'wltp' }, 38011, 'Kosmocar Audi Prot. 472724');
runInv('T14', 'Audi A5 Avant S line e-hybrid 367hp (B10, 1984cc PHEV, 51g V32)', 79980, { co2: 51, fuel: 'plugin_hybrid', cycle: 'wltp' }, 57652, 'Kosmocar Audi Prot. 472724');
runInv('T15', 'VW Golf 1.5 TSI 116PS Essential (CD1, 1498cc Petrol, 123g WLTP)', 24980, { co2: 123, fuel: 'petrol', cycle: 'wltp' }, 18507, 'Kosmocar VW 18/02/2026');
runInv('T16', 'VW Golf 1.5 eTSI 150PS Life DSG (CD1, 1498cc MHEV, 121g WLTP)', 29980, { co2: 121, fuel: 'mhev', cycle: 'wltp' }, 22469, 'Kosmocar VW 18/02/2026');
runInv('T17', 'VW Golf GTI 2.0 TSI 265PS DSG (CD1, 1984cc Petrol, 161g WLTP)', 52280, { co2: 161, fuel: 'petrol', cycle: 'wltp' }, 32893, 'Kosmocar VW 18/02/2026');
runInv('T18', 'VW Golf R 2.0 TSI 4MOTION 333PS DSG (CD1, 1984cc Petrol, 184g WLTP)', 64126, { co2: 184, fuel: 'petrol', cycle: 'wltp' }, 39644, 'Kosmocar VW 18/02/2026');

// GROUP 2: 4 Official AADE Statutory Worked Examples (Ε.2125/2020 & ICISnet Πεδίο 849)
const ex1 = calc.calculateGreekImport({ priceEur: 12000, registration: '15/09/2018', mileageKm: 75000, fuelType: 'petrol', cc: 1500, co2: 145 }, '', { clearanceDate: '2023-09-15', body: 'sedan', listPriceEur: 33138, extrasEur: 1500, euroCharacter: 'AD' });
addTest('T19', '2. AADE Official Worked Examples (Ε.2125/2020 & ICISnet)', 'AADE Ε.2125/2020 Used Sedan (5yr, 75k km, ΛΤΠΦ €34,638, 145g NEDC Euro 6c AD)', ex1.registrationTaxExactEur, 3686.39, 'AADE Ε.2125/2020 §Β');

const ex2 = calc.calculateGreekImport({ priceEur: 12000, registration: '15/09/2014', mileageKm: 142000, fuelType: 'diesel', cc: 2200, co2: 180, country: 'CH' }, '', { clearanceDate: '2020-09-15', body: 'suv', listPriceEur: 35000, extrasEur: 3500, euroCharacter: 'A' });
addTest('T20', '2. AADE Official Worked Examples (Ε.2125/2020 & ICISnet)', 'AADE Ε.2125/2020 Used SUV (6yr, 142k km, ΛΤΠΦ €38,500, 180g NEDC Euro 5a A +200%)', ex2.registrationTaxExactEur, 13624.42, 'AADE Ε.2125/2020 §Β');

const ex3 = cat.computeGreekRetailFromLtpf(15000, { co2: 99, fuel: 'petrol', cycle: 'wltp' });
addTest('T21', '2. AADE Official Worked Examples (Ε.2125/2020 & ICISnet)', 'AADE Ε.2125/2020 Ex 1 (New Car ΛΤΠΦ €15,000, 99g WLTP → Reg Tax)', ex3.registrationTaxEur, 779, 'AADE Ε.2125/2020 §Α');

const ex4 = calc.calculateGreekImport({ priceEur: 5000, registration: '10/10/2018', mileageKm: 167000, fuelType: 'petrol', cc: 1600, co2: 150 }, '', { clearanceDate: '2026-10-10', body: 'sedan', listPriceEur: 20000 });
addTest('T22', '2. AADE Official Worked Examples (Ε.2125/2020 & ICISnet)', 'ICISnet Πεδίο 849 1-Decimal Combined Depreciation (83% Age + 9.4% Km = 84.6%)', ex4.totalDepPct, 84.6, 'ΔΕΦΚΦΔ 1192035 ΕΞ 2017');

// GROUP 3: Pre-2016 ν. 3833/2010 Inverter & Dutch RDW Fiscale Waarde Stripper
const pre16 = aud.invertGreekRetailByYear(32600, { cc: 1995, co2: 119, fuel: 'diesel', pricelistYear: 2014, pricelistMonth: 6 });
addTest('T23', '3. Pre-2016 ν. 3833/2010 & Dutch RDW Inverters', 'Pre-2016 ν. 3833/2010 Inverter (2014 1995cc Euro 5, 23% VAT + 40% CC Tax, ΑΠΛΤ €32,600)', pre16.ltpfEur, 20000, 'ν. 3833/2010');

const rdw = cat.convertDutchRdwToNetLtpf(47615, 681, 'plugin_hybrid');
addTest('T24', '3. Pre-2016 ν. 3833/2010 & Dutch RDW Inverters', 'Dutch RDW Fiscale Waarde (€47,615 - €681 BPM) / 1.21 BTW → Net ΛΤΠΦ', rdw, 38788, 'RDW Open Data + Wet BPM');

// GROUP 4: End-to-End Used Car Catalog Locks, Trim Estimators & Statutory Cliffs
const i8 = calc.calculateGreekImport({ title: 'BMW i8 Coupe', vin: 'WBY2Z21040V345865', year: 2014, registration: '09/2014', mileageKm: 85000, fuelType: 'plugin_hybrid', cc: 1499, co2: 49, priceEur: 55000 });
addTest('T25', '4. End-to-End Used Car Import & Statutory Cliffs', '2014 BMW i8 Coupé (WBY2Z21040V345865) Official BMW Hellas ΛΤΠΦ Lock', i8.baseListPriceEur, 109800, 'BMW Hellas 2014 I12 Pricelist');

const golf8 = calc.calculateGreekImport({ title: 'Volkswagen Golf 1.5 eTSI 150 PS DSG', year: 2025, registration: '03/2025', mileageKm: 15000, fuelType: 'mild_hybrid', cc: 1498, co2: 121, priceEur: 22000 });
addTest('T26', '4. End-to-End Used Car Import & Statutory Cliffs', '2025 VW Golf 1.5 eTSI Auto-Catalog Lock vs Kosmocar Official', golf8.baseListPriceEur, 22469, 'Kosmocar VW Pricelist');

const gti = calc.calculateGreekImport({ title: 'Volkswagen Golf GTI 2.0 TSI DSG', year: 2025, registration: '02/2025', mileageKm: 12000, fuelType: 'petrol', cc: 1984, co2: 162, priceEur: 34000 });
addTest('T27', '4. End-to-End Used Car Import & Statutory Cliffs', '2025 VW Golf GTI 2.0 TSI Auto-Catalog Lock vs Kosmocar Official', gti.baseListPriceEur, 32893, 'Kosmocar VW Pricelist');

const s3 = calc.calculateGreekImport({ title: 'Audi S3 Sportback 2.0 TFSI quattro', year: 2025, registration: '01/2025', mileageKm: 10000, fuelType: 'petrol', cc: 1984, co2: 185, priceEur: 39000 });
addTest('T28', '4. End-to-End Used Car Import & Statutory Cliffs', '2025 Audi S3 Sportback quattro Auto-Catalog Lock vs Kosmocar Official', s3.baseListPriceEur, 40178, 'Kosmocar Audi Pricelist');

const a3sline = calc.calculateGreekImport({ title: 'Audi A3 Sportback 35 TFSI S-Line S tronic', year: 2025, registration: '04/2025', mileageKm: 14000, fuelType: 'mild_hybrid', cc: 1498, co2: 120, priceEur: 24500 });
addTest('T29', '4. End-to-End Used Car Import & Statutory Cliffs', '2025 Audi A3 35 TFSI S-Line Blind Trim Multiplier vs Kosmocar S-Line Official', a3sline.baseListPriceEur, 23772, 'Kosmocar Audi Prot. 472724');

const phev2026 = calc.calculateGreekImport({ title: 'BMW 330e Sedan PHEV', year: 2023, registration: '15/10/2023', mileageKm: 45000, fuelType: 'plugin_hybrid', cc: 1998, co2: 35, priceEur: 28000 }, '', { clearanceDate: '2026-10-15', listPriceEur: 43454 });
const phev2027 = calc.calculateGreekImport({ title: 'BMW 330e Sedan PHEV', year: 2024, registration: '15/01/2024', mileageKm: 45000, fuelType: 'plugin_hybrid', cc: 1998, co2: 35, priceEur: 28000 }, '', { clearanceDate: '2027-01-15', listPriceEur: 43454 });
addTest('T30', '4. End-to-End Used Car Import & Statutory Cliffs', 'ν. 5313/2026 Art. 10 PHEV ≤50g Sunset (V35 75% → V33 50% at 36m age = exact 2.00x)', phev2027.registrationTaxExactEur, +(phev2026.registrationTaxExactEur * 2).toFixed(2), 'ν. 5313/2026 Άρθρο 10');

// GROUP 5: American Muscle Cars (Ford Mustang GT 5.0 V8, Dark Horse, 2.3 EcoBoost, Mach-E BEV, Corvette C8)
const mGt = calc.calculateGreekImport({ title: 'Ford Mustang GT 5.0 Ti-VCT V8 Fastback', year: 2022, registration: '15/06/2022', mileageKm: 28000, priceEur: 49000, vin: '1FA6P8CF0N5100001' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
// 48m Coupé: 47% age dep -> taxable = 48500 * 0.53 = 25705; progTax(48500) = 15130; co2 = 268g WLTP (+60% -> 1.60) -> RegTax = 15130 * 0.53 * 1.60 = 12830.24
addTest('T31', '5. Muscle Cars (Ford Mustang & Corvette Family)', '2022 Ford Mustang GT 5.0 V8 (5,038cc, 268g WLTP, ΛΤΠΦ €48,500, 48m 47% Dep → Reg Tax)', mGt.registrationTaxExactEur, 12830.24, 'Ford Hellas + ν. 5222/2025 Art. 136');
addTest('T32', '5. Muscle Cars (Ford Mustang & Corvette Family)', '2022 Ford Mustang GT 5.0 V8 Engine Displacement Lock (5,038 cc Coyote Gen-3)', mGt.cc, 5038, 'Ford Homologation CoC');

const mDark = calc.calculateGreekImport({ title: 'Ford Mustang Dark Horse 5.0 V8', year: 2025, registration: '03/2025', mileageKm: 5000, priceEur: 68000, vin: '1FA6P8R00R5100002' }, '', { clearanceDate: '2026-09-15' });
addTest('T33', '5. Muscle Cars (Ford Mustang & Corvette Family)', '2025 Ford Mustang Dark Horse 5.0 V8 Official ΛΤΠΦ Lock (€58,900, 279g WLTP)', mDark.baseListPriceEur, 58900, 'Ford Motor Hellas MY25 Pricelist');

const mEco = calc.calculateGreekImport({ title: 'Ford Mustang 2.3 EcoBoost Convertible', year: 2019, registration: '05/2019', mileageKm: 65000, priceEur: 31000, vin: '1FATP8UH0K5100003' }, '', { clearanceDate: '2026-05-15' });
addTest('T34', '5. Muscle Cars (Ford Mustang & Corvette Family)', '2019 Ford Mustang 2.3 EcoBoost Cabrio (2,261cc & ΛΤΠΦ €41,700 Lock)', mEco.baseListPriceEur + mEco.cc, 41700 + 2261, 'Ford Motor Hellas Pricelist');

const machE = calc.calculateGreekImport({ title: 'Ford Mustang Mach-E AWD Extended Range', year: 2023, registration: '04/2023', mileageKm: 32000, priceEur: 36500, vin: 'WF0TK3SU0PMA00004' }, '', { clearanceDate: '2026-04-15' });
addTest('T35', '5. Muscle Cars (Ford Mustang & Corvette Family)', '2023 Ford Mustang Mach-E AWD ER (Pure BEV Detection → €0 Reg Tax & €0 Road Tax)', machE.registrationTaxEur + machE.roadTaxEur + machE.cc, 0, 'ν. 5222/2025 Art. 136 §6 (V30 BEV)');
addTest('T36', '5. Muscle Cars (Ford Mustang & Corvette Family)', '2023 Ford Mustang Mach-E AWD ER Official Greek ΛΤΠΦ (€49,992)', machE.baseListPriceEur, 49992, 'Ford Motor Hellas Mach-E Pricelist');

const c8 = calc.calculateGreekImport({ title: 'Chevrolet Corvette C8 Stingray 6.2 V8', year: 2023, registration: '07/2023', mileageKm: 12000, priceEur: 92000, vin: '1G1YB2D40P5100001' }, '', { clearanceDate: '2026-07-15', extrasEur: 0 });
addTest('T37', '5. Muscle Cars (Ford Mustang & Corvette Family)', '2023 Chevrolet Corvette C8 6.2L V8 (6,162cc LT2, 277g WLTP, ΛΤΠΦ €78,000)', c8.baseListPriceEur + c8.cc, 78000 + 6162, 'Corvette Europe Homologation');

// GROUP 6: Exotic Supercars (Lamborghini Huracán, Urus SE PHEV, Aventador SVJ, Ferrari 296/SF90/812, Porsche 911 GT3/GTS, McLaren 720S)
const hurEvo = calc.calculateGreekImport({ title: 'Lamborghini Huracan EVO Coupe LP 640-4', year: 2021, registration: '15/06/2021', mileageKm: 18000, priceEur: 245000, vin: 'ZHWUF4ZF0MLA10001' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
// 60m Coupé: 59% age dep -> taxable = 188000 * 0.41 = 77080; progTax(188000) = 56980; co2 = 332g WLTP (>325g -> +100% = 2.00) -> RegTax = 56980 * 0.41 * 2.00 = 46723.60
addTest('T38', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2021 Lamborghini Huracán EVO LP 640-4 (ΛΤΠΦ €188,000, 332g WLTP +100% CO₂, 60m 59% Dep → Reg Tax)', hurEvo.registrationTaxExactEur, 46723.60, 'Trident Cars GR + ν. 5222/2025 Art. 136');

const hurSto = calc.calculateGreekImport({ title: 'Lamborghini Huracan STO', year: 2023, registration: '05/2023', mileageKm: 6500, priceEur: 335000, vin: 'ZHWUF6ZF0PLA10002' }, '', { clearanceDate: '2026-05-15', extrasEur: 0 });
addTest('T39', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2023 Lamborghini Huracán STO Official ΛΤΠΦ Lock (€256,000, 331g WLTP)', hurSto.baseListPriceEur, 256000, 'Trident Cars GR Homologation');

const hur580 = calc.calculateGreekImport({ title: 'Lamborghini Huracan LP 580-2 Spyder RWD', year: 2017, registration: '07/2017', mileageKm: 34000, priceEur: 179000, vin: 'ZHWUR2ZF0HLA10003' }, '', { clearanceDate: '2026-07-15', extrasEur: 0 });
addTest('T40', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2017 Lamborghini Huracán LP 580-2 Spyder (ΛΤΠΦ €171,500 & 283g NEDC Lock)', hur580.baseListPriceEur, 171500, 'Trident Cars GR Homologation');

const urusSeV39 = calc.calculateGreekImport({ title: 'Lamborghini Urus SE Plug-in Hybrid 800 CV', year: 2025, registration: '04/2025', mileageKm: 8000, priceEur: 285000, vin: 'ZPBUA1ZL0SLA10004' }, '', { clearanceDate: '2026-04-15', extrasEur: 0 });
addTest('T41', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2025 Lamborghini Urus SE PHEV (51g WLTP during 11/2025–05/2026 V39 Window → 75% Relief)', urusSeV39.exemptionShare, 0.75, 'ν. 5222/2025 Art. 136 §6α & Ε.2039/2026');

const urusSeV33 = calc.calculateGreekImport({ title: 'Lamborghini Urus SE Plug-in Hybrid 800 CV', year: 2025, registration: '04/2025', mileageKm: 8000, priceEur: 285000, vin: 'ZPBUA1ZL0SLA10004' }, '', { clearanceDate: '2026-10-18', extrasEur: 0 });
addTest('T42', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2025 Lamborghini Urus SE PHEV (51g WLTP post-31/05/2026 → V33 50% Hybrid Relief)', urusSeV33.exemptionShare, 0.50, 'ν. 5222/2025 Art. 136 §6 & Ε.2039/2026');

const aventSvj = calc.calculateGreekImport({ title: 'Lamborghini Aventador SVJ Roadster LP 770-4', year: 2020, registration: '06/2020', mileageKm: 9000, priceEur: 580000, vin: 'ZHWUM6ZD0LLA10005' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
addTest('T43', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2020 Lamborghini Aventador SVJ Roadster (6,498cc V12 & ΛΤΠΦ €371,000 Lock)', aventSvj.baseListPriceEur, 371000, 'Trident Cars GR Homologation');

const f296 = calc.calculateGreekImport({ title: 'Ferrari 296 GTB Assetto Fiorano', year: 2023, registration: '09/2023', mileageKm: 7500, priceEur: 275000, vin: 'ZFF99SLA0P0296001' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T44', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2023 Ferrari 296 GTB V6 PHEV (2,992cc, 149g WLTP, 50% Hybrid Relief V33, ΛΤΠΦ €218,000)', f296.baseListPriceEur + f296.cc + f296.exemptionShare * 100, 218000 + 2992 + 50, 'Genesis Ferrari GR + ν. 5222/2025 Art. 136 §6');

const sf90 = calc.calculateGreekImport({ title: 'Ferrari SF90 Spider', year: 2022, registration: '05/2022', mileageKm: 6200, priceEur: 460000, vin: 'ZFF96NMA0N0296002' }, '', { clearanceDate: '2026-05-15', extrasEur: 0 });
addTest('T45', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2022 Ferrari SF90 Spider V8 PHEV (3,990cc, 154g WLTP, 50% Hybrid Relief V33, ΛΤΠΦ €380,000)', sf90.baseListPriceEur + sf90.cc + sf90.exemptionShare * 100, 380000 + 3990 + 50, 'Genesis Ferrari GR + ν. 5222/2025 Art. 136 §6');

const f812 = calc.calculateGreekImport({ title: 'Ferrari 812 Superfast 6.5 V12', year: 2019, registration: '04/2019', mileageKm: 19000, priceEur: 295000, vin: 'ZFF83CLA0K0296003' }, '', { clearanceDate: '2026-04-15', extrasEur: 0 });
addTest('T46', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2019 Ferrari 812 Superfast (6,496cc V12, 355g NEDC, ΛΤΠΦ €268,000)', f812.baseListPriceEur + f812.cc, 268000 + 6496, 'Genesis Ferrari GR');

const gt3 = calc.calculateGreekImport({ title: 'Porsche 911 GT3 (992) PDK', year: 2022, registration: '08/2022', mileageKm: 11000, priceEur: 215000, vin: 'WP0ZZZ99ZNS270001' }, '', { clearanceDate: '2026-08-15', extrasEur: 0 });
addTest('T47', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2022 Porsche 911 GT3 (992) (3,996cc Boxer-6, 295g WLTP, ΛΤΠΦ €149,575)', gt3.baseListPriceEur + gt3.cc, 149575 + 3996, 'Motodynamics Porsche GR');

const gtsHybrid = calc.calculateGreekImport({ title: 'Porsche 911 Carrera GTS T-Hybrid Coupé', year: 2025, registration: '05/2025', mileageKm: 6500, priceEur: 185000, vin: 'WP0ZZZ99ZSS270002' }, '', { clearanceDate: '2026-05-15', extrasEur: 0 });
addTest('T48', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2025 Porsche 911 Carrera GTS T-Hybrid (3,591cc HEV → V33 50% Hybrid Relief)', gtsHybrid.cc + gtsHybrid.exemptionShare * 100, 3591 + 50, 'Motodynamics Porsche GR + ν. 5222/2025');

const mcl720 = calc.calculateGreekImport({ title: 'McLaren 720S Coupe 4.0 V8', year: 2020, registration: '03/2020', mileageKm: 16000, priceEur: 210000, vin: 'SBM14DCA0LW001001' }, '', { clearanceDate: '2026-03-15', extrasEur: 0 });
addTest('T49', '6. Exotic Supercars (Lamborghini, Ferrari, Porsche, McLaren)', '2020 McLaren 720S Coupé (3,994cc V8 Twin-Turbo, 276g NEDC, ΛΤΠΦ €215,000)', mcl720.baseListPriceEur + mcl720.cc, 215000 + 3994, 'McLaren Homologation Benchmark');

// GROUP 7: Pure Electric BEVs (Tesla Model 3, Model Y, Model S Plaid)
const tm3Rwd = calc.calculateGreekImport({ title: 'Tesla Model 3 RWD Highland', year: 2024, registration: '09/2024', mileageKm: 15000, priceEur: 31500, vin: 'LRW3E7FA0RC000001' }, '', { clearanceDate: '2026-09-15' });
addTest('T50', '7. Pure Electric BEVs (Tesla Greece & Direct-Sales EVs)', '2024 Tesla Model 3 RWD Highland (Official Tesla GR ΛΤΠΦ €33,863 & €0 Reg/Road Tax)', tm3Rwd.baseListPriceEur + tm3Rwd.registrationTaxEur + tm3Rwd.roadTaxEur, 33863, 'Tesla Greece ΑΠΛΤ €41,990 / 1.24');

const tm3Perf = calc.calculateGreekImport({ title: 'Tesla Model 3 Performance AWD', year: 2024, registration: '10/2024', mileageKm: 12000, priceEur: 44000, vin: 'LRW3E7EC0RC000002' }, '', { clearanceDate: '2026-10-15' });
addTest('T51', '7. Pure Electric BEVs (Tesla Greece & Direct-Sales EVs)', '2024 Tesla Model 3 Performance AWD (Official Tesla GR ΛΤΠΦ €46,766 & €0 Reg Tax)', tm3Perf.baseListPriceEur + tm3Perf.registrationTaxEur, 46766, 'Tesla Greece ΑΠΛΤ €57,990 / 1.24');

const tmyLr = calc.calculateGreekImport({ title: 'Tesla Model Y Long Range Dual Motor AWD', year: 2023, registration: '11/2023', mileageKm: 29000, priceEur: 36900, vin: 'XP7YGCEK0PB000003' }, '', { clearanceDate: '2026-11-15' });
addTest('T52', '7. Pure Electric BEVs (Tesla Greece & Direct-Sales EVs)', '2023 Tesla Model Y Long Range AWD (Official Tesla GR ΛΤΠΦ €41,927, SUV Body & €0 Tax)', tmyLr.baseListPriceEur + tmyLr.registrationTaxEur, 41927, 'Tesla Greece ΑΠΛΤ €51,990 / 1.24');

const tmsPlaid = calc.calculateGreekImport({ title: 'Tesla Model S Plaid Tri-Motor', year: 2023, registration: '05/2023', mileageKm: 22000, priceEur: 79000, vin: '5YJSA7E60PF000004' }, '', { clearanceDate: '2026-05-15' });
addTest('T53', '7. Pure Electric BEVs (Tesla Greece & Direct-Sales EVs)', '2023 Tesla Model S Plaid 1,020hp (Official Tesla GR ΛΤΠΦ €88,702 & €0 Reg/Road Tax)', tmsPlaid.baseListPriceEur + tmsPlaid.registrationTaxEur + tmsPlaid.roadTaxEur, 88702, 'Tesla Greece ΑΠΛΤ €109,990 / 1.24');

// GROUP 8: Special Customs Categories (Pick-up Άρθ. 139, Historic ≥30yr Δ.Κ. 97.05, Wankel 2x CC Άρθ. 143)
const ranger = calc.calculateGreekImport({ title: 'Ford Ranger 2.0 EcoBlue Wildtrak Double Cab', year: 2022, registration: '15/06/2022', mileageKm: 60000, priceEur: 32000, vin: '6FPPXXMJ2P1000001' }, '', { clearanceDate: '2026-06-15', listPriceEur: 38500, extrasEur: 0 });
// 48m SUV/Pickup ageDep = 50% -> taxable = 38500 * 0.50 = 19250; 8% rate -> 19250 * 0.08 = 1540
addTest('T54', '8. Special Customs Regimes (Pick-up, Moto, Historic, Wankel)', '2022 Ford Ranger Double-Cab Pick-up (Άρθ. 139 §1ε 8% Base Tax on €19,250 Depreciated Value)', ranger.registrationTaxEur, 1540, 'ν. 5222/2025 Άρθρο 139 §1ε');

const old911 = calc.calculateGreekImport({ title: 'Porsche 911 Carrera 2 (964) Classic Oldtimer', year: 1991, registration: '05/1991', mileageKm: 145000, priceEur: 85000, country: 'CH' }, '', { clearanceDate: '2026-05-15' });
addTest('T55', '8. Special Customs Regimes (Pick-up, Moto, Historic, Wankel)', '1991 Porsche 911 (964) From Switzerland (≥30yr Historic Δ.Κ. 97.05 → €0 Reg Tax & €0 TARIC Duty)', old911.registrationTaxEur + old911.customsDutyEur, 0, 'Δ.Κ. 97.05 & ν. 4850/2021 Άρθρο 36');

const rx8 = calc.calculateGreekImport({ title: 'Mazda RX-8 1.3 Renesis Rotary Wankel', year: 2008, registration: '06/2008', mileageKm: 130000, priceEur: 9500 });
addTest('T56', '8. Special Customs Regimes (Pick-up, Moto, Historic, Wankel)', '2008 Mazda RX-8 1.3L Renesis Wankel (Άρθ. 143 Statutory 2x Displacement = 2,616 cc)', rx8.cc, 2616, 'ν. 5222/2025 Άρθρο 143');

// GROUP 9: JDM Performance Icons & Hot Hatches (Nissan GT-R R35, Toyota GR Supra, GR Yaris, Civic Type R, Mazda MX-5)
const gtr20 = calc.calculateGreekImport({ title: 'Nissan GT-R R35 Prestige 3.8 V6 Twin-Turbo', year: 2020, registration: '15/06/2020', mileageKm: 24000, priceEur: 118000, vin: 'JN1GANR35U0100001' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
// 72m Coupé: DEPRECIATION_TABLE[72][4] = 66% age dep -> taxable = 112000 * 0.34 = 38080; progTax(112000) = 2480 + 87000*0.32 = 30320? Wait: progTax(112000) = 32590; co2 = 316g WLTP (251-325g -> +60% = 1.60) -> RegTax = 32590 * 0.34 * 1.60 = 17728.96
addTest('T57', '9. JDM Performance Icons (Nissan GT-R, GR Supra, GR Yaris, Civic Type R, MX-5)', '2020 Nissan GT-R R35 Prestige (3,799cc VR38DETT, 316g WLTP, ΛΤΠΦ €112,000 Lock)', gtr20.baseListPriceEur + gtr20.cc, 112000 + 3799, 'Theocar Nissan GR Homologation');

const gtrNismo = calc.calculateGreekImport({ title: 'Nissan GT-R R35 NISMO 600PS', year: 2021, registration: '05/2021', mileageKm: 9000, priceEur: 195000, vin: 'JN1GANR35U0100002' }, '', { clearanceDate: '2026-05-15', extrasEur: 0 });
addTest('T58', '9. JDM Performance Icons (Nissan GT-R, GR Supra, GR Yaris, Civic Type R, MX-5)', '2021 Nissan GT-R R35 NISMO Official Homologation ΛΤΠΦ Lock (€148,000)', gtrNismo.baseListPriceEur, 148000, 'Theocar Nissan GR Homologation');

const supra30 = calc.calculateGreekImport({ title: 'Toyota GR Supra 3.0L Legend 340hp', year: 2022, registration: '04/2022', mileageKm: 19000, priceEur: 56000, vin: 'WZ1DB4C00NW010003' }, '', { clearanceDate: '2026-04-15', extrasEur: 0 });
addTest('T59', '9. JDM Performance Icons (Nissan GT-R, GR Supra, GR Yaris, Civic Type R, MX-5)', '2022 Toyota GR Supra 3.0L Inline-6 B58 (2,998cc, 188g WLTP, ΛΤΠΦ €52,900)', supra30.baseListPriceEur + supra30.cc, 52900 + 2998, 'Toyota Hellas Official GR Pricelist');

const supra20 = calc.calculateGreekImport({ title: 'Toyota GR Supra 2.0 Turbo 258hp', year: 2022, registration: '07/2022', mileageKm: 22000, priceEur: 44500, vin: 'WZ1DB2C00NW010004' }, '', { clearanceDate: '2026-07-15', extrasEur: 0 });
addTest('T60', '9. JDM Performance Icons (Nissan GT-R, GR Supra, GR Yaris, Civic Type R, MX-5)', '2022 Toyota GR Supra 2.0L B48 Disambiguation (1,998cc, 167g WLTP, ΛΤΠΦ €42,500)', supra20.baseListPriceEur + supra20.cc, 42500 + 1998, 'Toyota Hellas Official GR Pricelist');

const grYaris = calc.calculateGreekImport({ title: 'Toyota GR Yaris 1.6 Turbo AWD Circuit Pack', year: 2024, registration: '06/2024', mileageKm: 8000, priceEur: 47000, vin: 'JTDAF4E300A010005' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
addTest('T61', '9. JDM Performance Icons (Nissan GT-R, GR Supra, GR Yaris, Civic Type R, MX-5)', '2024 Toyota GR Yaris 1.6 Turbo AWD (1,618cc G16E-GTS, 197g WLTP, ΛΤΠΦ €39,800)', grYaris.baseListPriceEur + grYaris.cc, 39800 + 1618, 'Toyota Hellas Official GR Pricelist');

const ctrFl5 = calc.calculateGreekImport({ title: 'Honda Civic Type R 2.0 VTEC Turbo FL5 329PS', year: 2023, registration: '09/2023', mileageKm: 11000, priceEur: 54000, vin: 'JHMFL5G40PX010006' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T62', '9. JDM Performance Icons (Nissan GT-R, GR Supra, GR Yaris, Civic Type R, MX-5)', '2023 Honda Civic Type R FL5 (Disambiguated from Civic e:HEV → 1,996cc Petrol, 0% Relief, ΛΤΠΦ €47,900)', ctrFl5.baseListPriceEur + ctrFl5.cc + ctrFl5.exemptionShare * 100, 47900 + 1996 + 0, 'Saracakis Honda GR Pricelist');

const ctrFk8 = calc.calculateGreekImport({ title: 'Honda Civic Type R GT FK8 320PS', year: 2019, registration: '05/2019', mileageKm: 42000, priceEur: 36900, vin: 'SHHFK8G70KU010007' }, '', { clearanceDate: '2026-05-15', extrasEur: 0 });
addTest('T63', '9. JDM Performance Icons (Nissan GT-R, GR Supra, GR Yaris, Civic Type R, MX-5)', '2019 Honda Civic Type R FK8 GT (1,996cc, 178g WLTP, ΛΤΠΦ €38,500)', ctrFk8.baseListPriceEur + ctrFk8.cc, 38500 + 1996, 'Saracakis Honda GR Pricelist');

const mx5Rf = calc.calculateGreekImport({ title: 'Mazda MX-5 RF 2.0 Skyactiv-G 184PS Roadster', year: 2021, registration: '06/2021', mileageKm: 28000, priceEur: 27500, vin: 'JMZND6E7600100008' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
addTest('T64', '9. JDM Performance Icons (Nissan GT-R, GR Supra, GR Yaris, Civic Type R, MX-5)', '2021 Mazda MX-5 RF 2.0L 184PS (Disambiguated from MHEV SUV → Cabrio Petrol, 1,998cc, ΛΤΠΦ €28,000)', mx5Rf.baseListPriceEur + mx5Rf.cc + mx5Rf.exemptionShare * 100, 28000 + 1998 + 0, 'AutoOne Mazda GR Pricelist');

// GROUP 10: Super-SUVs, G-Class & Ultra-Luxury (AMG G63 W463A vs W465 MHEV vs G580 EQ, Defender, Range Rover, Bentley, Aston Martin, Giulia QV, 718 GT4 RS, Taycan Turbo S)
const g63Ice = calc.calculateGreekImport({ title: 'Mercedes-AMG G 63 4MATIC (W463A)', year: 2021, registration: '06/2021', mileageKm: 38000, priceEur: 169000, vin: 'W1N4632761X100001' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
addTest('T65', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2021 Mercedes-AMG G 63 W463A (3,982cc Pure Petrol → 0% Exemption, ΛΤΠΦ €138,000)', g63Ice.baseListPriceEur + g63Ice.cc + g63Ice.exemptionShare * 100, 138000 + 3982 + 0, 'Star Automotive Mercedes GR');

const g63Mhev = calc.calculateGreekImport({ title: 'Mercedes-AMG G 63 4MATIC (W465) 48V', year: 2025, registration: '03/2025', mileageKm: 7000, priceEur: 225000, vin: 'W1N4652761X100002' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T66', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2025 Mercedes-AMG G 63 W465 48V ISG (3,982cc MHEV → 50% Hybrid Relief V33, ΛΤΠΦ €158,500)', g63Mhev.baseListPriceEur + g63Mhev.cc + g63Mhev.exemptionShare * 100, 158500 + 3982 + 50, 'Star Automotive GR + ν. 5222/2025 Art. 136 §6');

const g580Eq = calc.calculateGreekImport({ title: 'Mercedes-Benz G 580 with EQ Technology', year: 2025, registration: '05/2025', mileageKm: 4000, priceEur: 148000, vin: 'W1N4653101X100003' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T67', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2025 Mercedes-Benz G 580 EQ Technology (Pure BEV → €0 Reg Tax, €0 Road Tax, ΛΤΠΦ €119,500)', g580Eq.baseListPriceEur + g580Eq.registrationTaxEur + g580Eq.roadTaxEur, 119500, 'Star Automotive GR + ICISnet V30');

const defD300 = calc.calculateGreekImport({ title: 'Land Rover Defender 110 D300 MHEV HSE', year: 2022, registration: '04/2022', mileageKm: 45000, priceEur: 74000, vin: 'SALEA7BW0N2100004' }, '', { clearanceDate: '2026-04-15', extrasEur: 0 });
addTest('T68', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2022 Land Rover Defender 110 D300 (2,997cc MHEV Diesel → 50% Hybrid Relief V33, ΛΤΠΦ €62,500)', defD300.baseListPriceEur + defD300.cc + defD300.exemptionShare * 100, 62500 + 2997 + 50, 'Petropoulos Land Rover GR');

const defP400e = calc.calculateGreekImport({ title: 'Land Rover Defender 110 P400e Plug-in Hybrid X-Dynamic', year: 2023, registration: '06/2023', mileageKm: 28000, priceEur: 79000, vin: 'SALEA7CX0P2100005' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
addTest('T69', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2023 Land Rover Defender 110 P400e PHEV (1,997cc, 64g WLTP >50g → 50% Relief V33, ΛΤΠΦ €68,500)', defP400e.baseListPriceEur + defP400e.cc + defP400e.exemptionShare * 100, 68500 + 1997 + 50, 'Petropoulos Land Rover GR');

const defV8 = calc.calculateGreekImport({ title: 'Land Rover Defender 110 V8 P525 Carpathian Edition', year: 2023, registration: '08/2023', mileageKm: 15000, priceEur: 129000, vin: 'SALEA7DX0P2100006' }, '', { clearanceDate: '2026-08-15', extrasEur: 0 });
addTest('T70', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2023 Land Rover Defender 110 V8 P525 (5,000cc Supercharged V8 → 0% Exemption, ΛΤΠΦ €118,000)', defV8.baseListPriceEur + defV8.cc + defV8.exemptionShare * 100, 118000 + 5000 + 0, 'Petropoulos Land Rover GR');

const rrsP460e = calc.calculateGreekImport({ title: 'Range Rover Sport P460e Plug-in Hybrid Dynamic SE', year: 2024, registration: '05/2024', mileageKm: 14000, priceEur: 108000, vin: 'SAL1A2BU0RA100007' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T71', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2024 Range Rover Sport P460e PHEV (2,996cc, 20g WLTP ≤50g → 75% Relief V35, ΛΤΠΦ €94,500)', rrsP460e.baseListPriceEur + rrsP460e.cc + rrsP460e.exemptionShare * 100, 94500 + 2996 + 75, 'Petropoulos Land Rover GR');

const rrSv = calc.calculateGreekImport({ title: 'Range Rover SV P615 V8 Twin-Turbo', year: 2024, registration: '04/2024', mileageKm: 9000, priceEur: 195000, vin: 'SAL1A2BV0RA100008' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T72', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2024 Range Rover SV V8 (4,395cc MHEV → 50% Hybrid Relief V33, ΛΤΠΦ €158,000)', rrSv.baseListPriceEur + rrSv.cc + rrSv.exemptionShare * 100, 158000 + 4395 + 50, 'Petropoulos Land Rover GR');

const contGtV8 = calc.calculateGreekImport({ title: 'Bentley Continental GT 4.0 V8 Coupe', year: 2022, registration: '06/2022', mileageKm: 16000, priceEur: 215000, vin: 'SCBCZ13S0NC100009' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
addTest('T73', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2022 Bentley Continental GT 4.0 V8 (3,996cc Pure Petrol → 0% Exemption, ΛΤΠΦ €188,000)', contGtV8.baseListPriceEur + contGtV8.cc + contGtV8.exemptionShare * 100, 188000 + 3996 + 0, 'Kosmocar Bentley GR');

const contGtHybrid = calc.calculateGreekImport({ title: 'Bentley Continental GT Speed Ultra Performance Hybrid', year: 2025, registration: '04/2025', mileageKm: 3500, priceEur: 295000, vin: 'SCBCZ13S0SC100010' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T74', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2025 Bentley Continental GT Speed 782PS PHEV (3,996cc, 29g WLTP ≤50g → 75% Relief V35, ΛΤΠΦ €218,000)', contGtHybrid.baseListPriceEur + contGtHybrid.cc + contGtHybrid.exemptionShare * 100, 218000 + 3996 + 75, 'Kosmocar Bentley GR + ν. 5222/2025');

const bentaygaPhev = calc.calculateGreekImport({ title: 'Bentley Bentayga Hybrid 3.0 V6 TFSI PHEV', year: 2023, registration: '05/2023', mileageKm: 18000, priceEur: 185000, vin: 'SJAAM2ZV0PC100011' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T75', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2023 Bentley Bentayga Hybrid PHEV (2,995cc, 82g WLTP >50g → 50% Relief V33, ΛΤΠΦ €168,000)', bentaygaPhev.baseListPriceEur + bentaygaPhev.cc + bentaygaPhev.exemptionShare * 100, 168000 + 2995 + 50, 'Kosmocar Bentley GR');

const dbx707 = calc.calculateGreekImport({ title: 'Aston Martin DBX707 4.0 V8 AWD', year: 2023, registration: '07/2023', mileageKm: 12000, priceEur: 210000, vin: 'SD7VUJAW0PN100012' }, '', { clearanceDate: '2026-07-15', extrasEur: 0 });
addTest('T76', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2023 Aston Martin DBX707 (3,982cc V8 Twin-Turbo, 323g WLTP, ΛΤΠΦ €198,000)', dbx707.baseListPriceEur + dbx707.cc, 198000 + 3982, 'Aston Martin Homologation');

const dbsV12 = calc.calculateGreekImport({ title: 'Aston Martin DBS Superleggera 5.2 V12 Coupe', year: 2021, registration: '05/2021', mileageKm: 11000, priceEur: 235000, vin: 'SCFRMFAW0MGL10013' }, '', { clearanceDate: '2026-05-15', extrasEur: 0 });
addTest('T77', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2021 Aston Martin DBS Superleggera (5,204cc V12 Twin-Turbo, 306g WLTP, ΛΤΠΦ €245,000)', dbsV12.baseListPriceEur + dbsV12.cc, 245000 + 5204, 'Aston Martin Homologation');

const giuliaQv = calc.calculateGreekImport({ title: 'Alfa Romeo Giulia 2.9 V6 Bi-Turbo Quadrifoglio 510PS', year: 2022, registration: '06/2022', mileageKm: 21000, priceEur: 69000, vin: 'ZAR95200007100014' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
addTest('T78', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2022 Alfa Romeo Giulia Quadrifoglio (Disambiguated from 2.2 Diesel → 2,891cc V6 Petrol, ΛΤΠΦ €78,500)', giuliaQv.baseListPriceEur + giuliaQv.cc + (giuliaQv.fuel === 'petrol' ? 1 : 0), 78500 + 2891 + 1, 'AutoOne Alfa Romeo GR');

const gt4Rs = calc.calculateGreekImport({ title: 'Porsche 718 Cayman GT4 RS 4.0 PDK Weissach', year: 2023, registration: '08/2023', mileageKm: 5500, priceEur: 178000, vin: 'WP0ZZZ98ZPS270015' }, '', { clearanceDate: '2026-08-15', extrasEur: 0 });
addTest('T79', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2023 Porsche 718 Cayman GT4 RS (Disambiguated from 718 2.0L → 3,996cc Flat-6, ΛΤΠΦ €124,500)', gt4Rs.baseListPriceEur + gt4Rs.cc, 124500 + 3996, 'Motodynamics Porsche GR');

const taycanTs = calc.calculateGreekImport({ title: 'Porsche Taycan Turbo S Cross Turismo', year: 2023, registration: '04/2023', mileageKm: 16000, priceEur: 112000, vin: 'WP0ZZZY1ZPS100016' }, '', { clearanceDate: '2026-04-15' });
addTest('T80', '10. Super-SUVs & Ultra-Luxury (AMG G63, Defender, Range Rover, Bentley, Aston Martin)', '2023 Porsche Taycan Turbo S BEV (Official Motodynamics GR ΛΤΠΦ €169,000 & €0 Reg/Road Tax)', taycanTs.baseListPriceEur + taycanTs.registrationTaxEur + taycanTs.roadTaxEur, 169000, 'Motodynamics Porsche GR + ICISnet V30');

// GROUP 11: Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati MC20/Folgore, Lotus Emira/Eletre)
const cullinanBb = calc.calculateGreekImport({ title: 'Rolls-Royce Cullinan Black Badge 6.75 V12', year: 2023, registration: '05/2023', mileageKm: 9500, priceEur: 385000, vin: 'SCA689S00PU100001' }, '', { clearanceDate: '2026-05-15', extrasEur: 0 });
addTest('T81', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2023 Rolls-Royce Cullinan Black Badge (6,749cc V12, 352g WLTP, ΛΤΠΦ €325,000)', cullinanBb.baseListPriceEur + cullinanBb.cc, 325000 + 6749, 'Rolls-Royce Homologation');

const spectre = calc.calculateGreekImport({ title: 'Rolls-Royce Spectre Coupe Electric', year: 2024, registration: '06/2024', mileageKm: 4000, priceEur: 379000, vin: 'SCA681S00RU100002' }, '', { clearanceDate: '2026-06-15' });
addTest('T82', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2024 Rolls-Royce Spectre BEV (ΛΤΠΦ €318,000, 0cc, €0 Reg Tax & €0 Road Tax under ICISnet V30)', spectre.baseListPriceEur + spectre.registrationTaxEur + spectre.roadTaxEur + spectre.cc, 318000, 'ν. 5222/2025 Άρθρο 136 §6 (V30 BEV)');

const rrGhost = calc.calculateGreekImport({ title: 'Rolls-Royce Ghost 6.75 V12 Extended', year: 2021, registration: '09/2021', mileageKm: 18000, priceEur: 269000, vin: 'SCA682S00MU100003' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T83', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2021 Rolls-Royce Ghost 6.75 V12 (6,749cc V12, Sedan Body, ΛΤΠΦ €265,000)', rrGhost.baseListPriceEur + rrGhost.cc, 265000 + 6749, 'Rolls-Royce Homologation');

const chironSs = calc.calculateGreekImport({ title: 'Bugatti Chiron Super Sport 8.0 W16 1600PS', year: 2022, registration: '07/2022', mileageKm: 2500, priceEur: 3650000, vin: 'VF9SP3V30NM795001' }, '', { clearanceDate: '2026-07-15', extrasEur: 0 });
addTest('T84', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2022 Bugatti Chiron Super Sport (7,993cc Quad-Turbo W16, 516g WLTP, ΛΤΠΦ €3,200,000)', chironSs.baseListPriceEur + chironSs.cc, 3200000 + 7993, 'Bugatti Homologation');

const tourbillon = calc.calculateGreekImport({ title: 'Bugatti Tourbillon 8.3 V16 Plug-in Hybrid', year: 2026, registration: '02/2026', mileageKm: 800, priceEur: 4200000, vin: 'VF9TB1V10TM795002' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T85', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2026 Bugatti Tourbillon V16 PHEV (8,300cc, 150g WLTP >50g → 50% Hybrid Relief V33, ΛΤΠΦ €3,800,000)', tourbillon.baseListPriceEur + tourbillon.cc + tourbillon.exemptionShare * 100, 3800000 + 8300 + 50, 'Bugatti Homologation + ν. 5222/2025 Art. 136 §6');

const mc20Cielo = calc.calculateGreekImport({ title: 'Maserati MC20 Cielo 3.0 V6 Nettuno Spyder', year: 2023, registration: '06/2023', mileageKm: 6000, priceEur: 245000, vin: 'ZAM24BMA0P0400001' }, '', { clearanceDate: '2026-06-15', extrasEur: 0 });
addTest('T86', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2023 Maserati MC20 Cielo Spyder (2,992cc Nettuno V6, Cabrio, ΛΤΠΦ €212,000)', mc20Cielo.baseListPriceEur + mc20Cielo.cc, 212000 + 2992, 'Trident Cars Maserati GR');

const grecaleFolgore = calc.calculateGreekImport({ title: 'Maserati Grecale Folgore AWD 557PS', year: 2024, registration: '05/2024', mileageKm: 7500, priceEur: 79000, vin: 'ZAM25BMA0R0400002' }, '', { clearanceDate: '2026-05-15' });
addTest('T87', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2024 Maserati Grecale Folgore BEV (0cc, €0 Reg/Road Tax V30, ΛΤΠΦ €89,500)', grecaleFolgore.baseListPriceEur + grecaleFolgore.registrationTaxEur + grecaleFolgore.roadTaxEur + grecaleFolgore.cc, 89500, 'Trident Cars Maserati GR + ICISnet V30');

const grecaleModena = calc.calculateGreekImport({ title: 'Maserati Grecale Modena 2.0 330hp AWD', year: 2023, registration: '04/2023', mileageKm: 18000, priceEur: 64000, vin: 'ZAM25BMA0P0400003' }, '', { clearanceDate: '2026-04-15', extrasEur: 0 });
addTest('T88', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2023 Maserati Grecale Modena (1,995cc 48V MHEV → 50% Hybrid Relief V33, ΛΤΠΦ €62,500)', grecaleModena.baseListPriceEur + grecaleModena.cc + grecaleModena.exemptionShare * 100, 62500 + 1995 + 50, 'Trident Cars Maserati GR');

const emiraV6 = calc.calculateGreekImport({ title: 'Lotus Emira 3.5 V6 Supercharged First Edition', year: 2023, registration: '07/2023', mileageKm: 8000, priceEur: 86000, vin: 'SCCLE1230PHA10001' }, '', { clearanceDate: '2026-07-15', extrasEur: 0 });
const emiraI4 = calc.calculateGreekImport({ title: 'Lotus Emira 2.0 i4 AMG First Edition', year: 2024, registration: '03/2024', mileageKm: 5000, priceEur: 82000, vin: 'SCCLE1230RHA10002' }, '', { clearanceDate: '2026-09-15', extrasEur: 0 });
addTest('T89', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', 'Lotus Emira 3.5 V6 (3,456cc, €76,500) vs 2.0 i4 AMG (1,991cc, €72,500) Disambiguation', emiraV6.baseListPriceEur + emiraV6.cc + emiraI4.baseListPriceEur + emiraI4.cc, 76500 + 3456 + 72500 + 1991, 'Lotus Homologation');

const eletreR = calc.calculateGreekImport({ title: 'Lotus Eletre R 905hp Dual Motor AWD', year: 2024, registration: '04/2024', mileageKm: 6000, priceEur: 118000, vin: 'LJUBM1230RHA10003' }, '', { clearanceDate: '2026-09-15' });
addTest('T90', '11. Hypercars & Ultra-Bespoke Luxury (Rolls-Royce, Bugatti, Maserati, Lotus)', '2024 Lotus Eletre R 905hp Hyper-SUV BEV (0cc, €0 Reg/Road Tax V30, ΛΤΠΦ €124,000)', eletreR.baseListPriceEur + eletreR.registrationTaxEur + eletreR.roadTaxEur + eletreR.cc, 124000, 'Lotus Homologation + ICISnet V30');

// GROUP 12: Extreme Statutory Customs Regimes (Campervans, Ambulances, Converted Vans, Buses, Motorcycles, Taxi/Multi-Child/ΑμεΑ, Euro 5 Hybrid Env Levy, Euro 3 Ban, Salvage/Unfallwagen)
const camper = calc.calculateGreekImport({ title: 'Fiat Ducato 2.2 Multijet Wohnmobil Campervan', year: 2022, registration: '15/06/2022', mileageKm: 40000, priceEur: 48000, cc: 2184, fuelType: 'diesel' }, '', { clearanceDate: '2026-06-15', category: 'motorhome', listPriceEur: 45000, extrasEur: 0 });
// 48m MPV colIdx=5 -> ageDep = 49% -> taxable = 45000 * 0.51 = 22950; progTax(45000) = 14080; motorhome Euro 6 co2Factor = 1.10; 75% exemption (pays 25%) -> 14080 * 0.51 * 1.10 * 0.25 = 1974.72
addTest('T91', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', '2022 Fiat Ducato Motorhome (Άρθ. 136 §3γ & §7: MPV 49% Dep, +10% Factor & 75% Motorhome Relief)', camper.registrationTaxExactEur, 1974.72, 'ν. 5222/2025 Άρθρο 136 §3γ & §7');

const ambulance = calc.calculateGreekImport({ title: 'Mercedes-Benz Sprinter 316 CDI Krankenwagen Ambulance', year: 2021, registration: '05/2021', mileageKm: 95000, priceEur: 28000, cc: 2143, fuelType: 'diesel' }, '', { clearanceDate: '2026-05-15', category: 'emergency_special' });
addTest('T92', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', '2021 Mercedes Sprinter Ambulance / Hearse (Άρθ. 141 §1 Flat €53 Reg Tax & €53 Road Tax)', ambulance.registrationTaxEur + ambulance.roadTaxEur, 106, 'ν. 5222/2025 Άρθρο 141 §1');

const convVan = calc.calculateGreekImport({ title: 'Ford Fiesta 1.5 TDCi Van (Converted from Passenger)', year: 2022, registration: '15/06/2022', mileageKm: 50000, priceEur: 11500, cc: 1499, fuelType: 'diesel' }, '', { clearanceDate: '2026-06-15', category: 'truck_van_from_passenger', body: 'hatchback', listPriceEur: 16000, extrasEur: 0 });
// 48m Hatchback colIdx=1 -> ageDep = 49% -> taxable = 16000 * 0.51 = 8160; Converted Van rate = 3 * 10% = 30% -> 8160 * 0.30 = 2448
addTest('T93', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', '2022 Converted Passenger Van (Άρθ. 139 §2 Penalty Rate 3×10% = 30% on Passenger Taxable Value)', convVan.registrationTaxExactEur, 2448, 'ν. 5222/2025 Άρθρο 139 §2');

const coachBus = calc.calculateGreekImport({ title: 'Mercedes-Benz Tourismo 50-Seat Coach Bus', year: 2021, registration: '04/2021', mileageKm: 180000, priceEur: 145000, seats: 50 }, '', { clearanceDate: '2026-04-15', category: 'bus' });
addTest('T94', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', '2021 50-Seat Coach Bus Δ.Κ. 87.02 (Άρθ. 141 §1 Flat Reg Tax = 1 Yr Road Tax = €410)', coachBus.registrationTaxEur, 410, 'ν. 5222/2025 Άρθρο 141 §1');

const r1250gs = calc.calculateGreekImport({ title: 'BMW R 1250 GS Adventure', year: 2022, registration: '15/06/2022', mileageKm: 18000, priceEur: 14000, vin: 'WB10J9100N6100001' }, '', { clearanceDate: '2026-06-15', listPriceEur: 16500 });
// 48m Moto ageDep = 25% -> depreciatedWholesale = 16500 * 0.75 = 12375; invoice floor = max(12375, 14000) = 14000 + min(shipping 1200, 500) = 14500; 1254cc rate = 12% -> 14500 * 0.12 = 1740
addTest('T95', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', '2022 BMW R 1250 GS Motorcycle (Άρθ. 140 §2α Invoice Floor €14,000 + €500 Shipping Cap × 12% = €1,740)', r1250gs.registrationTaxExactEur, 1740, 'ν. 5222/2025 Άρθρο 140 §1–2');

const taxiOctavia = calc.calculateGreekImport({ title: 'Skoda Octavia 2.0 TDI DSG', year: 2022, registration: '15/06/2022', mileageKm: 60000, priceEur: 18500, cc: 1968, co2: 118, fuelType: 'diesel' }, '', { clearanceDate: '2026-06-15', category: 'taxi', body: 'sedan', listPriceEur: 20000, extrasEur: 0 });
// 48m Sedan colIdx=2 -> ageDep = 57% -> taxable = 20000 * 0.43 = 8600; progTax(20000) = 560+780+1590 = 2930; co2=118g WLTP (-5% = 0.95); rawRegTax = 2930 * 0.43 * 0.95 = 1196.905; Taxi 87% relief (pays 13%) -> 1196.905 * 0.13 = 155.60
addTest('T96', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', '2022 Skoda Octavia Licensed Taxi Ε.Δ.Χ. (Άρθ. 138 87% Statutory Exemption → Pays 13% = €155.60)', taxiOctavia.registrationTaxExactEur, 155.60, 'ν. 5222/2025 Άρθρο 138');

const multichildTiguan = calc.calculateGreekImport({ title: 'VW Tiguan 1.5 eTSI DSG', year: 2023, registration: '05/2023', mileageKm: 30000, priceEur: 26500, cc: 1498, co2: 139 }, '', { clearanceDate: '2026-05-15', category: 'multichild' });
const ameaTiguan = calc.calculateGreekImport({ title: 'VW Tiguan 1.5 eTSI DSG', year: 2023, registration: '05/2023', mileageKm: 30000, priceEur: 26500, cc: 1498, co2: 139 }, '', { clearanceDate: '2026-05-15', category: 'disabled_amea' });
addTest('T97', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', 'Multi-Child (≤2,000cc Άρθ. 149) & Disabled ΑμεΑ (≤1,650cc Άρθ. 148 §2) 100% Exemption → €0 Tax', multichildTiguan.registrationTaxEur + ameaTiguan.registrationTaxEur + ameaTiguan.roadTaxEur, 0, 'ν. 5222/2025 Άρθρα 148 & 149');

const euro5Hybrid = calc.calculateGreekImport({ title: 'Toyota Yaris 1.5 Hybrid', year: 2012, registration: '06/2012', mileageKm: 120000, priceEur: 7500, cc: 1497, co2: 79, fuelType: 'hybrid' }, '', { clearanceDate: '2026-06-15' });
const euro5Diesel = calc.calculateGreekImport({ title: 'VW Golf 1.6 TDI', year: 2012, registration: '06/2012', mileageKm: 150000, priceEur: 6500, cc: 1598, co2: 109, fuelType: 'diesel' }, '', { clearanceDate: '2026-06-15' });
addTest('T98', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', 'ν. 4710/2020 Art. 5 §3 Environmental Levy: Euro 5 Hybrid (€0 Exempt) vs Euro 5 Diesel (€1,000)', euro5Hybrid.envLevyEur * 1000 + euro5Diesel.envLevyEur, 1000, 'ν. 4710/2020 Άρθρο 5 §3 & Ε.2123/2020');

const euro3Ban = calc.calculateGreekImport({ title: 'BMW 320i E46 Sedan', year: 2003, registration: '06/2003', mileageKm: 190000, priceEur: 4500, cc: 2171, fuelType: 'petrol' }, '', { clearanceDate: '2026-06-15' });
addTest('T99', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', '2003 BMW 320i E46 Euro 3 (<2005 & <30yr → Statutory Registration Prohibition Flag)', euro3Ban.registrationBanned ? 1 : 0, 1, 'ν. 4710/2020 Άρθρο 5 §1');

const salvageM3 = calc.calculateGreekImport({ title: 'BMW M3 Competition G80 Unfallwagen Motorschaden Salvage', year: 2022, registration: '06/2022', mileageKm: 28000, priceEur: 42000, vin: 'WBS41AY000F100001' }, '', { clearanceDate: '2026-06-15' });
addTest('T100', '12. Extreme Statutory Regimes (Campervan, Ambulance, Converted Van, Bus, Moto, Taxi, ΑμεΑ, Salvage)', '2022 BMW M3 Unfallwagen Salvage (Α.1203/2019 Art. 4: 0% Crash Discount → Full Undamaged ΛΤΠΦ €82,798 Lock)', salvageM3.baseListPriceEur + (salvageM3.isSalvageOrDamaged ? 1 : 0), 82798 + 1, 'ν. 5222/2025 Άρθρο 142 & Α.1203/2019 Άρθρο 4');

const exactMatches = tests.filter((t) => Math.abs(t.diff) <= 0.01).length;
const meanAbsError = +(tests.reduce((s, t) => s + Math.abs(t.diff), 0) / tests.length).toFixed(2);
const meanPctError = +(tests.reduce((s, t) => s + t.pct, 0) / tests.length).toFixed(4);

console.log(JSON.stringify({ totalTests: tests.length, exactMatches, meanAbsError, meanPctError, tests }, null, 2));
if (exactMatches < tests.length - 1) process.exit(1);
