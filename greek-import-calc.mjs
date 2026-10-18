/**
 * Comprehensive Multi-Category Greek Vehicle Import & Customs Tax Calculator
 * (Επιβατικά, Supercars, Αυτοκινούμενα Τροχόσπιτα, Μοτοσικλέτες, ATV/Τετράκυκλα,
 *  Αγροτικά Pick-up, Κλειστά Van, Βαρέα Φορτηγά, Λεωφορεία, Ταξί, Πολύτεκνοι, Ιστορικά >30 ετών, Μ.Ο.Ι.Κ.)
 *
 * Primary Statutory Framework (Verified October 2026):
 * 1. ν. 5222/2025 (Εθνικός Τελωνειακός Κώδικας, ΦΕΚ Α΄ 134/2025) Μέρος Δ΄ Άρθρα 135–158 (replaces ν. 2960/2001 Άρθρα 120–141):
 *    - Άρθρο 136 §1, §2α, §3α/β, §5, §6: Επιβατικά Ι.Χ. & Supercars (Δ.Κ. 87.03)
 *    - Άρθρο 136 §3γ & §7: Αυτοκινούμενα Τροχόσπιτα / Motorhomes (Δ.Κ. 87.03 — 75% απαλλαγή)
 *    - Άρθρο 136 §2β & §5ε: Επιβατικά Τρίκυκλα / Τετράκυκλα / ATV / Microcars Κανονισμού (ΕΕ) 168/2013
 *    - Άρθρο 136 §10: Μεμονωμένα Οχήματα Ιδιαίτερης Κατασκευής (Μ.Ο.Ι.Κ. — €500 έως €1.500)
 *    - Άρθρο 138: Επιβατικά Δημόσιας Χρήσης Ε.Δ.Χ. Ταξί (13% του τέλους ταξινόμησης)
 *    - Άρθρο 139 §1–§6: Φορτηγά >3,5τ (5%), Ανοικτά ≤3,5τ (8%), Κλειστά Van ≤3,5τ (10%), Διπλοκάμπινα Pick-up (8%), Βάσεις (5%)
 *    - Άρθρο 140 §1–§2: Μοτοσικλέτες (Δ.Κ. 87.11 — 0% έως 25% βάσει κυβισμού, απομείωση 14%–46% με κατώφλι τιμολογίου)
 *    - Άρθρο 141 §1: Λεωφορεία / Minibus >9 θέσεων (Δ.Κ. 87.02 — Τέλος Ταξινόμησης = 1 έτος Τέλη Κυκλοφορίας, €0 ηλεκτρικά)
 *    - Άρθρο 142: Φορολογητέα αξία επιβατικών (ΛΤΠΦ + Προαιρετικός Εξοπλισμός Extras - Απομείωση ηλικίας & χιλιομέτρων, πλαφόν 95%)
 *    - Άρθρο 149: Απαλλαγή Τρίτεκνων / Πολύτεκνων (100% έως 2.000 cc, 50% άνω των 2.000 cc)
 * 2. ΑΑΔΕ Α.1203/2019 (ΦΕΚ Β΄ 1933), Α.1016/2025 (ΦΕΚ Β΄ 527) & Α.1043/2025 (ΦΕΚ Β΄ 1257):
 *    - Δήλωση Εξοπλισμού και Αξίας (Υπόδειγμα 1 & 2) βάσει 17-ψήφιου VIN / Κάρτας Εξοπλισμού (Eurotax / DAT / PartsLink)
 * 3. ΑΑΔΕ Α.1108/2025: Τραπεζική εξόφληση >50% & κωδικός 2021 για μεταχειρισμένα Ε.Ε. καθεστώτος περιθωρίου κέρδους (Άρθρο 52)
 * 4. ν. 4710/2020 Άρθρο 5 + Ε.2114/2020 + Ε.2020/2022:
 *    - Περιβαλλοντικό τέλος €1.000 (Euro 5a/5b) & €3.000 (Euro 4) σε επιβατικά και ελαφρά φορτηγά ≤3,5τ
 *    - Απαγόρευση ταξινόμησης Euro 3, 2, 1 (εξαιρούνται τα Ιστορικά Οχήματα >30 ετών Δ.Κ. 97.05)
 * 5. ν. 5177/2025 Βιβλίο 10 Άρθρα 53–56 & ν. 4850/2021 Άρθρο 36: Ετήσια Τέλη Κυκλοφορίας όλων των κατηγοριών
 */

import { inferUniversalSpecsFromText } from './universal-vehicle-specs.mjs';
import {
  FACTORY_OPTIONS_CATALOG,
  estimateFactoryExtras,
  MODEL_PROFILES,
  GREEK_IMPORTER_LTPF_CATALOG,
  GREEK_IMPORTER_PORTALS,
  lookupGreekImporterLtpf,
  invertGreekRetailToLtpf,
  computeGreekRetailFromLtpf,
  convertDutchRdwToNetLtpf,
} from './greek-ltpf-catalog.mjs';
import {
  invertGreekRetailByYear,
  buildMultiTrimGreekSchedule,
  decodeVinManufacturingYear,
  auditStatutoryCliffsAndVinMy,
  parseOemBuildSheetToGreekExtras,
  searchGreekImporterPricelists,
} from './greek-ltpf-auditor.mjs';

export {
  FACTORY_OPTIONS_CATALOG,
  estimateFactoryExtras,
  MODEL_PROFILES,
  GREEK_IMPORTER_LTPF_CATALOG,
  GREEK_IMPORTER_PORTALS,
  lookupGreekImporterLtpf,
  invertGreekRetailToLtpf,
  computeGreekRetailFromLtpf,
  convertDutchRdwToNetLtpf,
  invertGreekRetailByYear,
  buildMultiTrimGreekSchedule,
  decodeVinManufacturingYear,
  auditStatutoryCliffsAndVinMy,
  parseOemBuildSheetToGreekExtras,
  searchGreekImporterPricelists,
};

export const LAW_VERSION =
  'ν. 5222/2025 Άρθ. 135–158 • ν. 5313/2026 Άρθ. 10–11 • ΑΑΔΕ Α.1203/2019–Α.1019/2026 • Ε.2036 & Ε.2039/2026 • ν. 5177/2025';

export const VEHICLE_CATEGORIES = [
  {
    id: 'passenger',
    label: 'Passenger Car / Supercar (Ε.Ι.Χ. Επιβατικό — Δ.Κ. 87.03)',
    shortLabel: 'Passenger / Supercar (87.03)',
    tariffCode: '87.03',
    lawRef: 'ν. 5222/2025 Άρθ. 136 §1–6 & Άρθ. 142',
  },
  {
    id: 'motorhome',
    label: 'Motorhome / Camper Van (Αυτοκινούμενο Τροχόσπιτο — 75% Relief)',
    shortLabel: 'Motorhome / Camper (87.03)',
    tariffCode: '87.03',
    lawRef: 'ν. 5222/2025 Άρθ. 136 §3γ & §7 (75% Απαλλαγή)',
  },
  {
    id: 'motorcycle',
    label: 'Motorcycle / Scooter (Μοτοσικλέτα — Δ.Κ. 87.11)',
    shortLabel: 'Motorcycle (87.11)',
    tariffCode: '87.11',
    lawRef: 'ν. 5222/2025 Άρθ. 140 §1–4 (0%–25% by cc)',
  },
  {
    id: 'quadricycle',
    label: 'ATV / Quad / Buggy / Microcar (Τρίκυκλο/Τετράκυκλο L-Cat Επιβατικό)',
    shortLabel: 'ATV / Quad / Microcar (L-Cat)',
    tariffCode: '87.03 (L-Cat)',
    lawRef: 'ν. 5222/2025 Άρθ. 136 §2β (0% / 4% / 7% / 11% by cc)',
  },
  {
    id: 'quadricycle_cargo',
    label: 'Utility Cargo Quad / Trike (Φορτηγό Τρίκυκλο/Τετράκυκλο L-Cat)',
    shortLabel: 'Cargo Quad / Trike (L-Cat)',
    tariffCode: '87.04 (L-Cat)',
    lawRef: 'ν. 5222/2025 Άρθ. 139 §1στ (0% / 3% / 6% / 10% by cc)',
  },
  {
    id: 'truck_double_cab',
    label: 'Double-Cab Pickup ≤3.5t (Διπλοκάμπινο Αγροτικό Pick-up — Δ.Κ. 87.03)',
    shortLabel: 'Double-Cab Pickup ≤3.5t (8%)',
    tariffCode: '87.03 / 87.04',
    lawRef: 'ν. 5222/2025 Άρθ. 139 §1ε & §3 (8% Euro 6)',
  },
  {
    id: 'truck_pickup_open',
    label: 'Light Open Truck / Single-Cab Pickup ≤3.5t (Ανοικτό Φορτηγό — Δ.Κ. 87.04)',
    shortLabel: 'Open Pickup / Truck ≤3.5t (8%)',
    tariffCode: '87.04',
    lawRef: 'ν. 5222/2025 Άρθ. 139 §1β & §3 (8% Euro 6)',
  },
  {
    id: 'truck_van_closed',
    label: 'Closed Panel Van ≤3.5t (Κλειστό Φορτηγό Van — Δ.Κ. 87.04)',
    shortLabel: 'Closed Panel Van ≤3.5t (10%)',
    tariffCode: '87.04',
    lawRef: 'ν. 5222/2025 Άρθ. 139 §1γ & §3 (10% Euro 6)',
  },
  {
    id: 'truck_van_from_passenger',
    label: 'Van Converted from Passenger Car (Κλειστό Φορτηγό από Μετατροπή Ε.Ι.Χ. — 30%)',
    shortLabel: 'Converted Passenger Van (30%)',
    tariffCode: '87.04 (ex-87.03)',
    lawRef: 'ν. 5222/2025 Άρθ. 139 §2 (3×10% = 30% επί Φορ. Αξίας Επιβατικού)',
  },
  {
    id: 'truck_heavy',
    label: 'Heavy Truck >3.5t / Tractor Unit (Βαρύ Φορτηγό / Τράκτορας — Δ.Κ. 87.04/87.01)',
    shortLabel: 'Heavy Truck >3.5t / Tractor (5%)',
    tariffCode: '87.04 / 87.01',
    lawRef: 'ν. 5222/2025 Άρθ. 139 §1α & §4 (5% Euro VI)',
  },
  {
    id: 'truck_chassis',
    label: 'Truck Chassis-Cab (Βάση Φορτηγού — Δ.Κ. 87.04)',
    shortLabel: 'Truck Chassis-Cab (5%)',
    tariffCode: '87.04',
    lawRef: 'ν. 5222/2025 Άρθ. 139 §1δ (5% Euro 6)',
  },
  {
    id: 'bus',
    label: 'Bus / Minibus / Coach >9 Seats (Λεωφορείο — Δ.Κ. 87.02)',
    shortLabel: 'Bus / Coach >9 Seats (87.02)',
    tariffCode: '87.02',
    lawRef: 'ν. 5222/2025 Άρθ. 141 §1 (Τέλος Ταξινόμησης = 1 έτος Τέλη Κυκλοφορίας)',
  },
  {
    id: 'taxi',
    label: 'Public-Use Taxi (Ε.Δ.Χ. Ταξί — 13% of Passenger Tax)',
    shortLabel: 'Taxi Ε.Δ.Χ. (87% Exempt)',
    tariffCode: '87.03 (Ε.Δ.Χ.)',
    lawRef: 'ν. 5222/2025 Άρθ. 138 (Καταβάλλει το 13% του τέλους Ε.Ι.Χ.)',
  },
  {
    id: 'multichild',
    label: 'Multi-Child Family Car (Τρίτεκνοι / Πολύτεκνοι — 100% ≤2000cc / 50% >2000cc)',
    shortLabel: 'Multi-Child Family (Άρθ. 149)',
    tariffCode: '87.03',
    lawRef: 'ν. 5222/2025 Άρθ. 149 (100% απαλλαγή ≤2000cc, 50% >2000cc)',
  },
  {
    id: 'disabled_amea',
    label: 'Disabled Persons ΑμεΑ (Ανάπηροι Πολίτες — 100% ≤1650cc / 80% >1650cc)',
    shortLabel: 'Disabled ΑμεΑ (Άρθ. 148 §2–4)',
    tariffCode: '87.03 (Απαλλαγή ΑμεΑ)',
    lawRef: 'ν. 5222/2025 Άρθ. 148 §2–4 & ν. 490/1976 (100% ≤1.650cc, €0 Τέλη)',
  },
  {
    id: 'repatriation',
    label: 'Transfer of Residence / Repatriation (Μετοικεσία — 80% Relief ≤2000cc)',
    shortLabel: 'Repatriation / Μετοικεσία (80% Off)',
    tariffCode: '87.03 (Μετοικούντες)',
    lawRef: 'ν. 5222/2025 Άρθ. 148 §3α & Άρθ. 157 / Δ.245/1988 (80% Απαλλαγή ≤2.000cc)',
  },
  {
    id: 'emergency_special',
    label: 'Ambulance / Hearse / Civil Protection (Ασθενοφόρο / Νεκροφόρα / ΕΚΑΒ)',
    shortLabel: 'Ambulance / Hearse / Civil Prot.',
    tariffCode: '87.03 / 87.05',
    lawRef: 'ν. 5222/2025 Άρθ. 141 §1 (€53) & Άρθ. 148 §10–13 (0% ΕΚΑΒ/Πολ. Προστασία)',
  },
  {
    id: 'historic',
    label: 'Historic / Antique Vehicle ≥30 Years (Ιστορικό Όχημα / Αντίκα — Δ.Κ. 97.05)',
    shortLabel: 'Historic ≥30 yrs (0% Tax & Duty)',
    tariffCode: '97.05 (9705.10.00)',
    lawRef: 'Δ.Κ. 97.05 ΚΕΔ & ν. 4850/2021 Άρθ. 36 (0% Τέλος Ταξινόμησης & 0% Δασμός)',
  },
  {
    id: 'moik',
    label: 'Individually Approved Custom/Kit Car (Μ.Ο.Ι.Κ. — Flat €500–€1,500)',
    shortLabel: 'Custom / Kit Car (Μ.Ο.Ι.Κ.)',
    tariffCode: '87.03 (Μ.Ο.Ι.Κ.)',
    lawRef: 'ν. 5222/2025 Άρθ. 136 §10 (€500–€1.500 βάσει cc)',
  },
];

/**
 * Automatically infers the Greek Customs Vehicle Category from free text / model title / year.
 */
export function inferVehicleCategory(text = '', regYear = null) {
  const s = String(text).toLowerCase();
  const currentYear = new Date().getFullYear();

  if (/\b(ασθενοφόρο|νεκροφόρα|ambulance|krankenwagen|rettungswagen|leichwagen|hearse|bestattungswagen|πυροσβεστικ|feuerwehr)\b/i.test(s)) {
    return 'emergency_special';
  }
  if (/\b(μετοικεσία|μετοικούντ|repatriation|transfer\s+of\s+residence)\b/i.test(s)) {
    return 'repatriation';
  }
  if (/\b(αμεα|ανάπηρ|αναπηρικ|disabled\s+exemption)\b/i.test(s)) {
    return 'disabled_amea';
  }
  if (/\b(πολύτεκν|τρίτεκν|multichild)\b/i.test(s)) {
    return 'multichild';
  }
  if (/\b(ταξί|taxi\b|ε\.?δ\.?χ\.?)\b/i.test(s)) {
    return 'taxi';
  }
  if (/\b(wohnmobil|camper|motorhome|τροχόσπιτο|hymer|knaus|weinsberg|adria\s+twin|ducato\s+camper|california\s+ocean|pössl|carado|bürstner|dethleffs|chausson|rapido|laika|westfalia|marco\s+polo\s+horizon)\b/i.test(s)) {
    return 'motorhome';
  }
  if (/\b(omnibus|reisebus|linienbus|minibus|autobus|λεωφορείο|πούλμαν|setra\b|tourismo|travego|citaro|irizar|neoplan|vanhool|lion'?s\s+coach|crossway|sprinter\s+transfer|sprinter\s+travel)\b/i.test(s)) {
    return 'bus';
  }
  if (/\b(actros|arocs|atego|sattelzugmaschine|scania\s+[rgsp]\s*\d{3}|volvo\s+fh|volvo\s+fm|man\s+tgx|man\s+tgs|man\s+tgm|daf\s+xf|daf\s+xg|daf\s+cf|iveco\s+s-way|iveco\s+stralis|iveco\s+eurocargo|renault\s+t\s*\d{3}|τράκτορας)\b/i.test(s)) {
    return 'truck_heavy';
  }
  if (/\b(raptor|hilux|amarok|navara|l200|ranger\s+(?:wildtrak|xlt|limited|platinum|raptor)|d-?max|f-?150|ram\s+1500|gladiator|doppelkabine|double\s*cab|crew\s*cab|διπλοκάμπινο)\b/i.test(s)) {
    return 'truck_double_cab';
  }
  if (/\b(pritsche|single\s*cab|king\s*cab|ανοικτό\s+φορτηγό|pick-?up\s+single|flatbed)\b/i.test(s)) {
    return 'truck_pickup_open';
  }
  if (/\b(μετατροπή\s+επιβατικ|van\s+converted\s+from\s+passenger|pkw\s+umbau\s+lkw|furgone\s+da\s+autovettura)\b/i.test(s)) {
    return 'truck_van_from_passenger';
  }
  if (/\b(fahrgestell|chassis\s*cab|βάση\s+φορτηγού)\b/i.test(s)) {
    return 'truck_chassis';
  }
  if (/\b(kastenwagen|panel\s+van|furgone|fourgon|κλειστό\s+φορτηγό|sprinter\s+\d{3}|vito\s+kasten|crafter|transporter\s+t[567]|ducato\s+kasten|ford\s+transit\s+(?:custom|connect|courier|350)|iveco\s+daily\s+35|peugeot\s+(?:boxer|expert|partner\s+cargo)|renault\s+(?:master|trafic\s+furgon|kangoo\s+rapid)|citro[eë]n\s+(?:jumper|jumpy|berlingo\s+van)|opel\s+(?:vivaro|movano|combo\s+cargo)|vw\s+caddy\s+cargo|caddy\s+kasten)\b/i.test(s)) {
    return 'truck_van_closed';
  }
  if (/\b(cargo\s+quad|utility\s+quad|utv\s+cargo|φορτηγό\s+τετράκυκλο|polaris\s+ranger|can-?am\s+defender|can-?am\s+traxter|john\s+deere\s+gator|piaggio\s+ape)\b/i.test(s)) {
    return 'quadricycle_cargo';
  }
  if (/\b(quad|atv|buggy|utv|can-?am|polaris\s+sportsman|polaris\s+rzr|cf\s*moto|cfmoto|microcar|aixam|ligier|citro[eë]n\s+ami|fiat\s+topolino|mobilize\s+duo|microlino|yamaha\s+(?:grizzly|kodiak|raptor\s+700)|honda\s+trx)\b/i.test(s)) {
    return 'quadricycle';
  }
  if (
    /\b(motorrad|motorcycle|μοτοσικλέτα|scooter|ducati|panigale|multistrada|monster\b|scrambler|diavel|streetfighter|hypermotard|harley-?davidson|yamaha\s+(?:mt|yzf|r1|r6|r7|r3|tenere|ténéré|tmax|xmax|nmax|tracer|xsr)|honda\s+(?:cbr|cb\d{3,4}|crf|africa\s+twin|nc750|forza|sh\s*\d{3}|pcx|adv\s*350|x-?adv|goldwing|transalp|hornet)|kawasaki\s+(?:ninja|z\s*\d{3,4}|versys|vulcan|zx)|suzuki\s+(?:gsx|v-?strom|hayabusa|sv\s*650|burgman)|ktm\s+(?:\d{3,4}\s*duke|adventure|super\s+duke|rc\s*\d{3}|exc)|triumph\s+(?:tiger|street\s+triple|speed\s+triple|bonneville|trident|rocket\s+3|scrambler)|bmw\s+(?:r\s*1200\s*gs|r\s*1250\s*gs|r\s*1300\s*gs|r\s*nine\s*t|s\s*1000\s*rr|s\s*1000\s*xr|s\s*1000\s*r|m\s*1000|f\s*900|f\s*850\s*gs|f\s*800\s*gs|f\s*750\s*gs|c\s*400|ce\s*04)|piaggio|vespa|aprilia\s+(?:rsv4|tuono|tuareg|rs\s*660)|moto\s+guzzi|husqvarna|royal\s+enfield|indian\s+(?:scout|chief|challenger)|sym\b|kymco|benelli|mv\s+agusta)\b/i.test(
      s
    )
  ) {
    return 'motorcycle';
  }
  if (regYear && currentYear - regYear >= 30 && /\b(historic|oldtimer|classic|αντίκα|ιστορικό|h-?kennzeichen|asi\b)\b/i.test(s)) {
    return 'historic';
  }
  return 'passenger';
}

export const DEPRECIATION_COLUMNS = ['suv', 'hatchback', 'sedan', 'cabrio', 'coupe', 'mpv'];
export const DEPRECIATION_TABLE = [
  [0,0,0,0,0,0],[2,2,3,2,2,2],[4,3,5,4,4,3],[5,5,8,6,6,5],[7,6,10,7,8,6],[9,8,13,9,10,8],[11,9,15,11,12,9],[13,11,17,13,14,11],[14,13,20,15,16,12],[16,14,22,17,18,14],[18,16,25,18,20,16],[20,17,27,20,22,17],[22,19,30,22,25,19],
  [22,19,30,22,25,19],[22,19,30,22,25,19],[22,20,30,22,25,19],[22,22,30,23,25,21],[24,23,31,25,25,22],[25,24,33,26,25,23],[25,24,33,26,25,23],[25,24,33,26,25,23],[25,24,33,26,25,24],[26,25,33,28,26,25],[28,26,35,29,27,26],[29,28,36,30,29,27],
  [29,28,36,30,29,28],[30,28,36,30,29,29],[31,29,36,30,29,30],[33,30,37,31,30,31],[34,31,38,32,31,32],[35,32,40,33,32,33],[35,32,40,33,32,33],[35,33,40,33,32,33],[35,34,40,33,33,33],[35,35,41,34,34,34],[36,36,42,35,35,35],[37,37,43,36,36,36],
  [39,38,44,37,36,37],[40,39,45,38,37,38],[41,40,47,39,38,39],[42,41,48,40,39,40],[43,42,49,41,40,41],[44,43,50,42,41,43],[45,44,51,43,42,44],[46,45,53,44,43,45],[47,46,54,45,44,46],[48,47,55,46,45,47],[49,48,56,47,46,48],[50,49,57,48,47,49],
  [51,50,58,49,48,50],[52,51,60,50,49,51],[53,52,61,51,50,52],[54,53,62,52,51,53],[55,54,63,53,52,54],[56,55,64,54,53,55],[57,56,66,55,54,56],[58,57,67,56,55,57],[59,58,68,57,56,58],[60,59,69,58,57,59],[61,60,70,59,58,60],[62,61,72,60,59,61],
  [62,61,72,60,59,61],[62,61,72,60,59,61],[63,61,72,61,60,61],[64,62,72,62,61,62],[65,63,73,63,62,63],[66,64,74,64,63,64],[66,64,74,64,63,64],[66,64,74,64,63,64],[66,64,74,64,63,64],[66,65,74,65,64,65],[67,66,75,66,65,66],[68,67,76,67,66,67],
  [68,67,76,67,66,67],[68,67,76,67,66,67],[68,67,76,67,66,67],[69,68,76,67,67,68],[70,69,77,68,67,69],[71,70,78,69,68,70],[71,70,78,69,68,70],[71,70,78,69,68,70],[71,70,78,69,68,70],[71,71,78,70,69,71],[72,71,79,71,70,71],[73,72,80,72,71,72],
  [73,72,80,72,71,72],[73,72,80,72,71,72],[73,72,80,72,71,72],[74,73,80,72,71,73],[74,74,80,73,72,74],[75,74,81,74,73,75],[75,74,81,74,73,75],[75,74,81,74,73,75],[75,74,81,74,73,75],[76,75,81,74,74,75],[76,76,82,75,74,76],[77,76,83,76,75,77],
  [77,76,83,76,75,77],[77,76,83,76,75,77],[77,76,83,76,75,77],[77,77,83,76,75,77],[78,77,83,77,76,78],[79,78,84,78,77,78],[79,78,84,78,77,78],[79,78,84,78,77,78],[79,78,84,78,77,78],[79,78,84,78,77,79],[80,79,84,79,78,79],[80,80,85,79,79,80],
  [80,80,85,79,79,80],[80,80,85,79,79,80],[80,80,85,79,79,80],[80,80,85,79,79,80],[81,80,85,80,79,81],[82,81,86,81,80,82],[82,81,86,81,80,82],[82,81,86,81,80,82],[82,81,86,81,80,82],[82,81,86,81,80,82],[82,82,86,81,81,82],[83,83,87,82,82,83],
  [83,83,87,82,82,83],[83,83,87,82,82,83],[83,83,87,82,82,83],[83,83,87,82,82,83],[83,83,87,83,82,84],[84,83,88,83,83,84],[84,83,88,83,83,84],[84,83,88,83,83,84],[84,83,88,83,83,84],[84,83,88,83,83,84],[84,84,88,84,83,85],[85,84,89,84,84,85],
  [85,84,89,84,84,85],[85,84,89,84,84,85],[85,84,89,84,84,85],[85,84,89,84,84,85],[85,85,89,85,84,86],[86,85,89,85,85,86],[86,85,89,85,85,86],[86,85,89,85,85,86],[86,85,89,85,85,86],[86,85,89,85,85,86],[86,86,89,86,85,87],[87,86,90,86,86,87],
  [87,86,90,86,86,87],[87,86,90,86,86,87],[87,86,90,86,86,87],[87,86,90,86,86,87],[87,87,90,86,86,87],[88,87,90,87,87,88],[88,87,90,87,87,88],[88,87,90,87,87,88],[88,87,90,87,87,88],[88,87,90,87,87,88],[88,87,90,87,87,88],[88,88,90,88,87,89],
  [88,88,90,88,87,89],[88,88,90,88,87,89],[88,88,90,88,87,89],[88,88,90,88,87,89],[88,88,90,88,87,89],[89,89,91,88,88,89],[89,89,91,88,88,89],[89,89,91,88,88,89],[89,89,91,88,88,89],[89,89,91,88,88,89],[89,89,91,88,88,89],[90,89,91,89,89,90],
  [90,89,91,89,89,90],[90,89,91,89,89,90],[90,89,91,89,89,90],[90,89,91,89,89,90],[90,89,91,89,89,90],[90,90,91,89,89,91],[90,90,91,89,89,91],[90,90,91,89,89,91],[90,90,91,89,89,91],[90,90,91,89,89,91],[90,90,91,89,89,91],[90,90,91,90,89,91],
  [90,90,91,90,89,91],[90,90,91,90,89,91],[90,90,91,90,89,91],[90,90,91,90,89,91],[90,90,91,90,89,91],[90,90,91,90,89,91],[93,93,93,93,93,93],[93,93,93,93,93,93],[94,94,94,94,94,94],[94,94,94,94,94,94],[95,95,95,95,95,95],[95,95,95,95,95,95],
];

export const PROGRESSIVE_SCALE = [
  { upTo: 14000, rate: 0.04 },
  { upTo: 17000, rate: 0.26 },
  { upTo: 20000, rate: 0.53 },
  { upTo: 25000, rate: 0.62 },
  { upTo: 30000, rate: 0.71 },
  { upTo: Infinity, rate: 0.30 },
];

export function progressiveTax(value) {
  let tax = 0;
  let lower = 0;
  for (const band of PROGRESSIVE_SCALE) {
    if (value > lower) tax += (Math.min(value, band.upTo) - lower) * band.rate;
    lower = band.upTo;
    if (value <= band.upTo) break;
  }
  return tax;
}

export const CO2_LADDER = {
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

export const ROAD_TAX_NEDC = [
  { max: 90, perGram: 0 },
  { max: 100, perGram: 0.90 },
  { max: 120, perGram: 0.98 },
  { max: 140, perGram: 1.20 },
  { max: 160, perGram: 1.85 },
  { max: 180, perGram: 2.45 },
  { max: 200, perGram: 2.78 },
  { max: 250, perGram: 3.05 },
  { max: Infinity, perGram: 3.72 },
];

export const ROAD_TAX_WLTP = [
  { max: 122, perGram: 0 },
  { max: 139, perGram: 0.64 },
  { max: 166, perGram: 0.70 },
  { max: 208, perGram: 0.85 },
  { max: 224, perGram: 1.87 },
  { max: 240, perGram: 2.20 },
  { max: 260, perGram: 2.50 },
  { max: 280, perGram: 2.70 },
  { max: Infinity, perGram: 2.85 },
];

/**
 * Annual Road Tax by Engine Displacement (cc) for Motorcycles, Motorhomes, MOIK & Pre-11/2010 Cars
 * (ν. 5177/2025 Άρθρο 55 Πίνακας Ι — Εγχειρίδιο ΑΑΔΕ 1132/2026)
 */
export function roadTaxByCc(cc = 1000, regYear = 2018, isMotorcycle = false, isEV = false) {
  if (isEV || cc <= 0) return 0;
  if (isMotorcycle && cc <= 50) return 12; // Μοτοποδήλατα ≤50 cc
  const era = regYear <= 2000 ? 0 : regYear <= 2005 ? 1 : 2;
  const bands = [
    { max: 300, fee: [22, 22, 22] },
    { max: 785, fee: [55, 55, 55] },
    { max: 1071, fee: [120, 120, 120] },
    { max: 1357, fee: [135, 135, 135] },
    { max: 1548, fee: [225, 240, 255] },
    { max: 1738, fee: [250, 265, 280] },
    { max: 1928, fee: [280, 300, 320] },
    { max: 2357, fee: [615, 630, 690] },
    { max: 3000, fee: [820, 840, 920] },
    { max: 4000, fee: [1025, 1050, 1150] },
    { max: Infinity, fee: [1230, 1260, 1380] },
  ];
  const b = bands.find((x) => cc <= x.max) || bands[bands.length - 1];
  return b.fee[era];
}

/**
 * Annual Road Tax for Commercial Trucks by Gross Vehicle Weight (Μικτό Βάρος kg — ν. 5177/2025 Άρθρο 56)
 */
export function roadTaxForTruck(gvwKg = 3000, isEV = false) {
  if (isEV) return 0;
  if (gvwKg <= 1500) return 75;
  if (gvwKg <= 3500) return 105;
  if (gvwKg <= 10000) return 300;
  if (gvwKg <= 20000) return 600;
  if (gvwKg <= 30000) return 940;
  if (gvwKg <= 40000) return 1320;
  return 1490;
}

/**
 * Annual Road Tax for Buses by Seat Count (Θέσεις Καθημένων — ν. 5177/2025 Άρθρο 56)
 * Note: Under ν. 5222/2025 Άρθρο 141 §1, the Customs Registration Tax for a Bus (Δ.Κ. 87.02)
 * is ALSO equal to 1 year of its Annual Road Tax!
 */
export function roadTaxForBus(seats = 50, isEV = false) {
  if (isEV) return 0;
  if (seats <= 33) return 210;
  if (seats <= 50) return 410;
  return 510;
}

/**
 * Historic Vehicle Annual Road Tax (ν. 4850/2021 Άρθρο 36 & ν. 5177/2025 Άρθρο 53 §2)
 */
export function roadTaxForHistoric(cc = 1998, ageYears = 32, isMotorcycle = false) {
  if (ageYears >= 45) return 0; // Απαλλαγή άνω των 45 ετών
  if (isMotorcycle) return cc <= 250 ? 25 : 50;
  if (cc <= 999) return 50;
  if (cc <= 1999) return 100;
  return 200;
}

export const COUNTRY_CONFIG = {
  GR: { name: 'Greece', vat: 0.24, shipping: 0, eu: true },
  BG: { name: 'Bulgaria', vat: 0.20, shipping: 600, eu: true },
  IT: { name: 'Italy', vat: 0.22, shipping: 700, eu: true },
  RO: { name: 'Romania', vat: 0.21, shipping: 750, eu: true },
  HR: { name: 'Croatia', vat: 0.25, shipping: 800, eu: true },
  SI: { name: 'Slovenia', vat: 0.22, shipping: 900, eu: true },
  HU: { name: 'Hungary', vat: 0.27, shipping: 900, eu: true },
  SK: { name: 'Slovakia', vat: 0.23, shipping: 1000, eu: true },
  AT: { name: 'Austria', vat: 0.20, shipping: 1100, eu: true },
  CZ: { name: 'Czechia', vat: 0.21, shipping: 1100, eu: true },
  DE: { name: 'Germany', vat: 0.19, shipping: 1200, eu: true },
  PL: { name: 'Poland', vat: 0.23, shipping: 1200, eu: true },
  BE: { name: 'Belgium', vat: 0.21, shipping: 1400, eu: true },
  LU: { name: 'Luxembourg', vat: 0.17, shipping: 1400, eu: true },
  NL: { name: 'Netherlands', vat: 0.21, shipping: 1500, eu: true },
  FR: { name: 'France', vat: 0.20, shipping: 1500, eu: true },
  DK: { name: 'Denmark', vat: 0.25, shipping: 1500, eu: true },
  LT: { name: 'Lithuania', vat: 0.21, shipping: 1600, eu: true },
  ES: { name: 'Spain', vat: 0.21, shipping: 1700, eu: true },
  SE: { name: 'Sweden', vat: 0.25, shipping: 1800, eu: true },
  LV: { name: 'Latvia', vat: 0.21, shipping: 1800, eu: true },
  EE: { name: 'Estonia', vat: 0.24, shipping: 1900, eu: true },
  PT: { name: 'Portugal', vat: 0.23, shipping: 2000, eu: true },
  FI: { name: 'Finland', vat: 0.255, shipping: 2000, eu: true },
  IE: { name: 'Ireland', vat: 0.23, shipping: 2200, eu: true },
  // Non-EU / Third-Country Origins (Δασμός ΚΕΔ + ΦΠΑ Εισαγωγής 24%)
  CH: { name: 'Switzerland (Non-EU)', vat: 0.081, shipping: 1300, eu: false },
  NO: { name: 'Norway (EEA/Non-Customs Union)', vat: 0.25, shipping: 2000, eu: false },
  UK: { name: 'United Kingdom (Non-EU)', vat: 0.20, shipping: 2300, eu: false },
  US: { name: 'United States (Non-EU)', vat: 0.0, shipping: 2800, eu: false },
  JP: { name: 'Japan (Non-EU)', vat: 0.10, shipping: 2600, eu: false },
  AE: { name: 'UAE / Dubai (Non-EU)', vat: 0.05, shipping: 2400, eu: false },
  EU: { name: 'European Union', vat: 0.19, shipping: 1200, eu: true },
};

const COUNTRY_NAME_TO_CODE = {
  GREECE: 'GR', GR: 'GR',
  BULGARIA: 'BG', BG: 'BG',
  ITALY: 'IT', ITALIA: 'IT', IT: 'IT',
  ROMANIA: 'RO', RO: 'RO',
  CROATIA: 'HR', HR: 'HR',
  SLOVENIA: 'SI', SI: 'SI',
  HUNGARY: 'HU', HU: 'HU',
  SLOVAKIA: 'SK', SK: 'SK',
  AUSTRIA: 'AT', AT: 'AT',
  CZECHIA: 'CZ', 'CZECH REPUBLIC': 'CZ', CZ: 'CZ',
  GERMANY: 'DE', DEUTSCHLAND: 'DE', DE: 'DE',
  POLAND: 'PL', POLSKA: 'PL', PL: 'PL',
  BELGIUM: 'BE', BELGIQUE: 'BE', BE: 'BE',
  LUXEMBOURG: 'LU', LU: 'LU',
  NETHERLANDS: 'NL', NEDERLAND: 'NL', HOLLAND: 'NL', NL: 'NL',
  FRANCE: 'FR', FR: 'FR',
  DENMARK: 'DK', DK: 'DK',
  LITHUANIA: 'LT', LT: 'LT',
  SPAIN: 'ES', ESPANA: 'ES', ESPAÑA: 'ES', ES: 'ES',
  SWEDEN: 'SE', SE: 'SE',
  LATVIA: 'LV', LV: 'LV',
  ESTONIA: 'EE', EE: 'EE',
  PORTUGAL: 'PT', PT: 'PT',
  FINLAND: 'FI', FI: 'FI',
  IRELAND: 'IE', IE: 'IE',
  SWITZERLAND: 'CH', SUISSE: 'CH', CH: 'CH',
  NORWAY: 'NO', NO: 'NO',
  'UNITED KINGDOM': 'UK', UK: 'UK', GB: 'UK',
  USA: 'US', 'UNITED STATES': 'US', US: 'US',
  JAPAN: 'JP', JP: 'JP',
  UAE: 'AE', DUBAI: 'AE', AE: 'AE',
};

export function resolveCountryCode(rawCountry) {
  if (!rawCountry) return 'DE';
  const up = String(rawCountry).trim().toUpperCase();
  if (COUNTRY_NAME_TO_CODE[up]) return COUNTRY_NAME_TO_CODE[up];
  const two = up.slice(0, 2);
  return COUNTRY_CONFIG[two] ? two : 'EU';
}

/**
 * Common Customs Tariff (Δασμός ΚΕΔ / TARIC) for Non-EU Third-Country Imports
 */
export function thirdCountryTaricDutyRate(category = 'passenger', cc = 1998, fuel = 'petrol') {
  if (category === 'historic') return 0; // TARIC 9705.10.00: 0% customs duty
  if (category === 'motorcycle') return cc <= 250 ? 0.08 : 0.06; // 87.11: 8% ≤250cc, 6% >250cc
  if (category === 'bus') {
    // 87.02: 16% for diesel ≥2500cc or petrol ≥2800cc, else 10%
    if ((fuel === 'diesel' && cc >= 2500) || (fuel !== 'diesel' && cc >= 2800)) return 0.16;
    return 0.10;
  }
  if (category.startsWith('truck_')) {
    // 87.04: 22% for large-displacement trucks/pickups (diesel ≥2500cc or petrol ≥2800cc, e.g. US F-150/RAM), else 10%
    if ((fuel === 'diesel' && cc >= 2500) || (fuel !== 'diesel' && cc >= 2800)) return 0.22;
    return 0.10;
  }
  return 0.10; // 87.03 Passenger cars, supercars, motorhomes, ATVs: 10%
}

const RHO = [
  [0, 1.19], [12, 0.93], [24, 0.785], [36, 0.69], [48, 0.62], [60, 0.55], [72, 0.476],
  [96, 0.37], [120, 0.286], [144, 0.226], [180, 0.167], [240, 0.119], [300, 0.09],
];

function rho(months, vatRate = 0.19) {
  const scale = (1 + vatRate) / 1.19;
  if (months <= 0) return RHO[0][1] * scale;
  for (let i = 1; i < RHO.length; i++) {
    if (months <= RHO[i][0]) {
      const [m0, r0] = RHO[i - 1];
      const [m1, r1] = RHO[i];
      return (r0 + ((r1 - r0) * (months - m0)) / (m1 - m0)) * scale;
    }
  }
  return RHO[RHO.length - 1][1] * scale;
}

export function normalizeFuelType(rawText = '') {
  const s = String(rawText).toLowerCase().trim();
  if (!s) return 'petrol';
  if (/wasserstoff|hydrogen|fuel.?cell/.test(s)) return 'hydrogen';
  // Explicit pure-electric check FIRST when no petrol/diesel/hybrid co-occurs
  if (
    /(?:\b(?:elektro|elektrisch|electric|elettrica|elettrico|eléctrico|elektryczny|électrique|electrique|elektromotor|elektrické|strom|bev)\b|ηλεκτρικ|full\s*electric|100%\s*electric|\b(?:taycan|tesla|mustang\s+mach-?e|mach-?e|ioniq\s*[56]|kia\s*ev[369]|polestar\s*[234]|bmw\s*(?:i3|i4|ix|ix1|ix2|ix3|i5|i7))\b)/i.test(s) &&
    !/benzin|petrol|essence|gasolina|diesel|hybrid|hybryd|ibrid|híbrid|plug.?in|\bphev\b|\bi8\b|\btfsi\s*e\b/i.test(s)
  ) {
    return 'electric';
  }
  if (/plug.?in|\bphev\b|enchufable|\btfsi\s*e\b|\bgte\b|e-?hybrid|\bi8\b|296\s*gt[bs]|sf90|urus\s+se\b|(?:bmw\s*(?:330e|530e|545e|745e|x3\s*xdrive30e|x5\s*xdrive45e|x5\s*xdrive50e))/.test(s)) {
    return 'plugin_hybrid';
  }
  if (/mild.?hybrid|\bmhev\b|48\s?v|\betsi\b|eq\s?boost/.test(s)) return 'mild_hybrid';
  if (/hybrid|hybryda|ibrida|híbrido|υβριδικ|t-?hybrid|elektr.*\/.*benz|benz.*\/.*elektr|elektr.*\/.*dies|dies.*\/.*elektr/.test(s)) return 'hybrid';
  if (/\b(lpg|cng|autogas|erdgas|gpl|metano|eco-?g|tgi|g-?tec|bi-?fuel|υγραέριο|φυσικό\s+αέριο)\b/.test(s)) return 'lpg_cng';
  if (/diesel|πετρέλαιο|\bon\b|\btdi\b|\bcdi\b|\bdci\b|\bbluehdi\b/.test(s)) return 'diesel';
  return 'petrol';
}

export function inferBodyClass(text = '') {
  const s = String(text).toLowerCase();
  if (/cabrio|roadster|convertible|spyder|spider|targa/.test(s)) return 'cabrio';
  // Per ΔΕΦΚΦΔ 1192035 ΕΞ 2017 (ΦΕΚ Β΄ 4618), Station Wagon / Combi / Touring / Avant / Estate / Variant is classified under ΣΕΝΤΑΝ ('sedan')
  if (/\b(station\s*wagon|kombi|κομπί|touring|avant|estate|variant|allroad|sw)\b/.test(s)) return 'sedan';
  if (/\b(suv|4x4|geländewagen|crossover|pick-?up|atv|quad|allstreet)\b/.test(s)) return 'suv';
  if (/\b(hatchback|sportback|kleinwagen|compact)\b/.test(s)) return 'hatchback';
  if (/\bcoupe\b|coupé|\b(deportivo|supercar|fastback)\b/.test(s)) return 'coupe';
  if (/\b(mpv|van|minivan|wohnmobil|camper|bus|kasten)\b/.test(s)) return 'mpv';
  return 'sedan';
}

function parseRegYearMonth(regStr, fallbackYear) {
  const currentYear = new Date().getFullYear();
  if (regStr) {
    const s = String(regStr).trim();
    // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
    let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (m) return { year: Number(m[3]), month: Number(m[2]), day: Number(m[1]), monthAssumed: false };
    // YYYY-MM-DD or YYYY/MM/DD
    m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), monthAssumed: false };
    // MM/YYYY or MM-YYYY
    m = s.match(/^(\d{1,2})[./-](\d{4})$/);
    if (m) return { year: Number(m[2]), month: Number(m[1]), day: null, monthAssumed: false };
    // YYYY-MM
    m = s.match(/^(\d{4})[./-](\d{1,2})/);
    if (m) return { year: Number(m[1]), month: Number(m[2]), day: null, monthAssumed: false };
  }
  const y = fallbackYear && fallbackYear >= 1950 && fallbackYear <= currentYear + 1 ? Number(fallbackYear) : 2018;
  return { year: y, month: 6, day: null, monthAssumed: true };
}

/**
 * Evaluates a single statutory Greek customs scenario across ALL 15 vehicle categories.
 */
function runSingleStatutoryScenario({
  category = 'passenger',
  purchaseEur,
  geo,
  regYear,
  regMonth,
  regDay = null,
  clearanceYear,
  clearanceMonth,
  clearanceDay = null,
  clearanceIso,
  effectiveKm,
  body,
  fuel,
  co2,
  cc = 1998,
  gvwKg = 3000,
  seats = 50,
  listPriceEur,
  extrasEur,
  customShippingEur,
  vatRegime = 'auto', // 'auto' | 'margin_scheme' | 'eu_net_b2b' | 'new_transport' | 'non_eu_cif'
  euroCharacter = null, // Optional CoC #48 / V.9 character (e.g. 'A','F','Q','W','AD','EA')
}) {
  // Per ΑΑΔΕ Ε.2125/2020 Παράρτημα ΙΙ & Εγχειρίδιο Τελωνειακών Εφαρμογών, any partial month (>0 extra days) rounds UP to the next full month
  const baseMonths = (clearanceYear - regYear) * 12 + (clearanceMonth - regMonth);
  const extraMonthFromDays = regDay != null && clearanceDay != null && clearanceDay > regDay ? 1 : 0;
  const ageMonths = Math.max(1, baseMonths + extraMonthFromDays);
  const ageYears = ageMonths / 12;
  const regKey = regYear * 10000 + regMonth * 100 + (regDay != null ? regDay : 15);
  const co2Cycle = regKey <= 20201231 ? 'nedc' : 'wltp';
  const isEV = fuel === 'electric' || fuel === 'hydrogen';

  const shippingEur = customShippingEur != null ? Number(customShippingEur) : geo.shipping;

  // Non-EU Common Customs Tariff Duty (Δασμός ΚΕΔ / TARIC) on CIF (Purchase + Transport to EU border)
  const isHistoric30 = category === 'historic' || (ageYears >= 30 && category === 'passenger' && regYear <= clearanceYear - 30);
  const isNonEu = !geo.eu || vatRegime === 'non_eu_cif';
  const dutyRate = isNonEu ? thirdCountryTaricDutyRate(isHistoric30 ? 'historic' : category, cc, fuel) : 0;
  const customsDutyEur = isNonEu ? Math.round((purchaseEur + shippingEur) * dutyRate) : 0;

  let baseValueEur = listPriceEur + extrasEur;
  let ageDepPct = 0;
  let kmDepPct = 0;
  let taxableEur = baseValueEur;
  let priceBandRate = 0;
  let co2BandAdj = 0;
  let euroSurcharge = 0;
  let envLevyFull = 0;
  let euroLabel = 'Euro 6d-TEMP / 6d (Post-09/2018, 0% surcharge)';
  let effectiveRate = 0;
  let exemptionShare = 0;
  let exemptionLabel = '0% Exemption (Standard Rate)';
  let registrationTaxEur = 0;
  let registrationTaxExactEur = 0;
  let envLevyEur = 0;
  let roadTaxEur = 0;
  let registrationBanned = false;

  // ============================================================================
  // CATEGORY BRANCHING (ν. 5222/2025 Άρθρα 136–149)
  // ============================================================================

  if (category === 'historic' || (ageYears >= 30 && category === 'passenger' && regYear <= clearanceYear - 30)) {
    // 1. HISTORIC / ANTIQUE VEHICLES ≥30 YEARS (Δ.Κ. 97.05 & ν. 4850/2021 Άρθρο 36)
    baseValueEur = purchaseEur;
    taxableEur = purchaseEur;
    euroLabel = 'Historic Collector Vehicle ≥30 Years (TARIC 9705.10.00 — Exempt from Euro Ban)';
    exemptionShare = 1.0;
    exemptionLabel = '100% Exempt (Δ.Κ. 97.05 Historic Vehicle — €0 Registration Tax & 0% Duty)';
    registrationTaxEur = 0;
    envLevyEur = 0;
    roadTaxEur = roadTaxForHistoric(cc, ageYears, false);
  } else if (category === 'bus') {
    // 2. BUSES / MINIBUSES / COACHES >9 SEATS (Δ.Κ. 87.02 — ν. 5222/2025 Άρθρο 141 §1)
    // Statutory Rule: Registration Tax = 1 Year of Annual Road Tax (€0 for pure electric/hydrogen)
    baseValueEur = purchaseEur;
    taxableEur = purchaseEur;
    const oneYearBusTax = roadTaxForBus(seats, isEV);
    registrationTaxExactEur = isEV ? 0 : oneYearBusTax;
    registrationTaxEur = registrationTaxExactEur;
    roadTaxEur = oneYearBusTax;
    euroLabel = regYear >= 2015 ? 'Euro VI Bus/Coach Homologation' : 'Euro V / IV Bus Homologation';
    exemptionShare = isEV ? 1.0 : 0;
    exemptionLabel = isEV
      ? '100% Exempt Electric Bus (Άρθρο 141 §1 εδ. β΄)'
      : `Statutory Flat Bus Tax = 1 Year Road Tax (${seats} seats → €${oneYearBusTax}, Άρθρο 141 §1)`;
  } else if (category === 'emergency_special') {
    // 2B. AMBULANCES, HEARSES & CIVIL PROTECTION VEHICLES (ν. 5222/2025 Άρθρο 141 §1 & Άρθρο 148 §10–13)
    baseValueEur = purchaseEur;
    taxableEur = purchaseEur;
    registrationTaxExactEur = isEV ? 0 : 53;
    registrationTaxEur = registrationTaxExactEur;
    roadTaxEur = isEV ? 0 : 53;
    euroLabel = 'Special Purpose Ambulance / Hearse / Civil Protection (Δ.Κ. 87.03 / 87.05)';
    exemptionShare = isEV ? 1.0 : 0;
    exemptionLabel = isEV
      ? '100% Exempt Electric Special Purpose Vehicle (Άρθρο 141 §1)'
      : 'Flat Statutory Special Vehicle Tax €53 (= 1 Year Road Tax, Άρθρο 141 §1 • €0 for EKAB/Civil Protection under Άρθρο 148 §10–13)';
  } else if (category === 'motorcycle') {
    // 3. MOTORCYCLES & SCOOTERS (Δ.Κ. 87.11 — ν. 5222/2025 Άρθρο 140 §1–4)
    const isNewMoto = ageMonths < 6 && effectiveKm < 6000;
    if (isNewMoto) {
      ageDepPct = 0;
      baseValueEur = purchaseEur;
      taxableEur = purchaseEur + customsDutyEur + Math.min(shippingEur, 500);
    } else {
      // Statutory Wholesale Age Depreciation (Άρθρο 140 §2α):
      if (ageMonths < 12) ageDepPct = 0;
      else if (ageMonths <= 24) ageDepPct = 14;
      else if (ageMonths <= 36) ageDepPct = 21;
      else if (ageMonths <= 48) ageDepPct = 25;
      else if (ageMonths <= 60) ageDepPct = 32;
      else if (ageMonths <= 72) ageDepPct = 35;
      else if (ageMonths <= 84) ageDepPct = 39;
      else if (ageMonths <= 96) ageDepPct = 42;
      else ageDepPct = 46;

      baseValueEur = listPriceEur;
      const depreciatedWholesale = baseValueEur * (1 - ageDepPct / 100);
      // Statutory Floor (Άρθρο 140 §2α εδ. γ΄): Cannot be lower than actual purchase invoice + duty + transport!
      taxableEur = Math.max(depreciatedWholesale, purchaseEur) + customsDutyEur + Math.min(shippingEur, 500);
    }

    if (isEV || cc <= 125) priceBandRate = 0;
    else if (cc <= 249) priceBandRate = 0.02;
    else if (cc <= 900) priceBandRate = 0.07;
    else if (cc <= 1400) priceBandRate = 0.12;
    else if (cc <= 1600) priceBandRate = 0.14;
    else if (cc <= 1800) priceBandRate = 0.17;
    else priceBandRate = 0.25;

    // Άρθρο 140 §4: +30% surcharge for older motorcycles not meeting Directive 2002/51/EC (<2004)
    if (!isEV && cc > 125 && regYear < 2004) {
      euroSurcharge = 0.30;
    }

    effectiveRate = priceBandRate * (1 + euroSurcharge);
    registrationTaxExactEur = Number((taxableEur * effectiveRate).toFixed(2));
    registrationTaxEur = Math.round(registrationTaxExactEur);
    euroLabel = `Motorcycle ${cc} cc (Άρθρο 140 §1 — ${(effectiveRate * 100).toFixed(1).replace(/\.0$/, '')}% rate${euroSurcharge > 0 ? ' incl. +30% pre-2002/51/EC surcharge' : ''})`;
    exemptionShare = isEV || cc <= 125 ? 1.0 : 0;
    exemptionLabel =
      isEV || cc <= 125
        ? '100% Exempt (≤125 cc or Pure Electric Motorcycle — Άρθρο 140/141)'
        : `${(effectiveRate * 100).toFixed(1).replace(/\.0$/, '')}% Motorcycle Rate (${cc} cc) • Max 46% wholesale age dep. with invoice floor`;
    roadTaxEur = roadTaxByCc(cc, regYear, true, isEV);
  } else if (category === 'quadricycle' || category === 'quadricycle_cargo') {
    // 4. L-CATEGORY TRICYCLES / QUADRICYCLES / ATVs / BUGGIES / MICROCARS (Κανονισμός 168/2013)
    // Depreciated using column 'suv' (4x4 suv-atv) per ΑΑΔΕ Α.1203/2019 Άρθρο 11 §2α
    const colIdx = DEPRECIATION_COLUMNS.indexOf('suv');
    ageDepPct = ageMonths >= 192 ? 95 : (DEPRECIATION_TABLE[ageMonths]?.[colIdx] ?? 70);
    taxableEur = Math.max(baseValueEur * 0.05, baseValueEur * (1 - ageDepPct / 100));

    const isCargo = category === 'quadricycle_cargo';
    if (isEV || cc < 50) priceBandRate = 0;
    else if (cc <= 500) priceBandRate = isCargo ? 0.03 : 0.04;
    else if (cc <= 900) priceBandRate = isCargo ? 0.06 : 0.07;
    else priceBandRate = isCargo ? 0.10 : 0.11;

    effectiveRate = priceBandRate;
    registrationTaxExactEur = Number((taxableEur * effectiveRate).toFixed(2));
    registrationTaxEur = Math.round(registrationTaxExactEur);
    euroLabel = `EU Reg. 168/2013 L-Category (${cc} cc)`;
    exemptionLabel = isCargo
      ? `Cargo L-Category Rate ${Math.round(priceBandRate * 100)}% (Άρθρο 139 §1στ)`
      : `Passenger L-Category Rate ${Math.round(priceBandRate * 100)}% (Άρθρο 136 §2β)`;
    roadTaxEur = roadTaxByCc(cc, regYear, true, isEV);
  } else if (category.startsWith('truck_')) {
    // 5. COMMERCIAL TRUCKS, PICKUPS, VANS, CONVERTED VANS & HEAVY TRUCKS (Δ.Κ. 87.04 / 87.03 / 87.01 — Άρθρο 139)
    const isHeavy = category === 'truck_heavy';
    const isChassis = category === 'truck_chassis';
    const isClosedVan = category === 'truck_van_closed';
    const isConvertedVan = category === 'truck_van_from_passenger';

    // Base Euro 6 / VI Rate (Άρθρο 139 §1α–ε & §2)
    if (isEV) {
      priceBandRate = 0; // Άρθρο 139 §6: Pure electric & hydrogen trucks are 0%
    } else if (isConvertedVan) {
      priceBandRate = 0.30; // Άρθρο 139 §2: Closed van converted from passenger car = 3 × 10% = 30% on Passenger Taxable Value!
    } else if (isHeavy || isChassis) {
      priceBandRate = 0.05; // 5% for heavy trucks >3.5t (§1α) and chassis-cabs (§1δ)
    } else if (isClosedVan) {
      priceBandRate = 0.10; // 10% for closed panel vans ≤3.5t (§1γ)
    } else {
      priceBandRate = 0.08; // 8% for open pickups ≤3.5t (§1β) and double-cab pickups ≤3.5t (§1ε)
    }

    // Euro Emission Surcharge for Trucks (Άρθρο 139 §1στ, ΠΑΡΑΡΤΗΜΑ III B.5) & Environmental Levy (ν. 4710/2020 Άρθρο 5 §2)
    // Heavy trucks (>3.5t) entered mandatory Euro VI on 31/12/2013 (regYear >= 2014); light N1 trucks on 01/09/2015–2016
    if ((isHeavy && regYear >= 2014) || regYear >= 2016 || (regYear === 2015 && regMonth >= 9)) {
      euroSurcharge = 0;
      euroLabel = 'Euro 6 / Euro VI Commercial (0% surcharge)';
    } else if (regYear >= 2009) {
      euroSurcharge = 0.30; // +30% for Euro 5 / V
      envLevyFull = isHeavy ? 0 : 1000; // €1,000 levy applies ONLY to light trucks ≤3.5t (περ. β, γ, ε)
      euroLabel = `Euro 5 / V Commercial (+30% surcharge${isHeavy ? '' : ' + €1,000 Env. Levy'})`;
    } else if (regYear >= 2005) {
      euroSurcharge = 1.00; // +100% for Euro 4 / IV
      envLevyFull = isHeavy ? 0 : 3000; // €3,000 levy applies ONLY to light trucks ≤3.5t
      euroLabel = `Euro 4 / IV Commercial (+100% surcharge${isHeavy ? '' : ' + €3,000 Env. Levy'})`;
    } else {
      euroSurcharge = 1.00;
      registrationBanned = true;
      euroLabel = 'PROHIBITED: Euro 3 or older Truck (ν. 4710/2020 Άρθρο 5 — Απαγορεύεται η ταξινόμηση)';
    }

    if (isHeavy) {
      // Heavy trucks >3.5t (Άρθρο 139 §4): Assessed value cannot be lower than purchase invoice + duty + transport
      baseValueEur = purchaseEur;
      taxableEur = purchaseEur + customsDutyEur + shippingEur;
      ageDepPct = 0;
      kmDepPct = 0;
    } else {
      // Light trucks / vans / pickups ≤3.5t (Άρθρο 139 §3) & Converted Vans (Άρθρο 139 §2): Depreciated ΛΤΠΦ + Extras
      const colName = isConvertedVan ? body : isClosedVan ? 'mpv' : 'suv';
      const colIdx = Math.max(0, DEPRECIATION_COLUMNS.indexOf(colName));
      ageDepPct = ageMonths >= 192 ? 95 : (DEPRECIATION_TABLE[ageMonths]?.[colIdx] ?? 70);
      const allowanceKm = (15000 * ageMonths) / 12;
      const excessKm = Math.max(0, effectiveKm - allowanceKm);
      kmDepPct = Math.min(10, (excessKm / 500) * 0.10);
      const totalDepPct849 = Math.min(95, Math.round((ageDepPct + kmDepPct - (ageDepPct * kmDepPct) / 100) * 10) / 10);
      taxableEur = Number((baseValueEur * (1 - totalDepPct849 / 100)).toFixed(2));
    }

    effectiveRate = priceBandRate * (1 + euroSurcharge);
    registrationTaxExactEur = isEV ? 0 : Number((taxableEur * effectiveRate).toFixed(2));
    registrationTaxEur = Math.round(registrationTaxExactEur);
    envLevyEur = isEV || fuel === 'hybrid' || fuel === 'plugin_hybrid' || fuel === 'mild_hybrid' ? 0 : envLevyFull;
    exemptionShare = isEV ? 1.0 : 0;
    exemptionLabel = isEV
      ? '100% Exempt Electric/Hydrogen Commercial Truck (Άρθρο 139 §6)'
      : isConvertedVan
        ? `Converted Passenger Van 3×10% = 30% × ${(1 + euroSurcharge).toFixed(2)} = ${(effectiveRate * 100).toFixed(1)}% on Passenger Taxable Value (Άρθρο 139 §2)`
        : `Commercial Truck Base ${(priceBandRate * 100).toFixed(0)}% × ${(1 + euroSurcharge).toFixed(2)} Euro factor = ${(effectiveRate * 100).toFixed(2)}%`;
    roadTaxEur = roadTaxForTruck(isHeavy ? Math.max(12000, gvwKg) : Math.min(3500, gvwKg), isEV);
  } else if (category === 'moik') {
    // 6. INDIVIDUALLY APPROVED CUSTOM / KIT CARS (Μ.Ο.Ι.Κ. — Άρθρο 136 §10)
    baseValueEur = purchaseEur;
    taxableEur = purchaseEur;
    if (cc <= 1000) registrationTaxEur = 500;
    else if (cc <= 1400) registrationTaxEur = 700;
    else if (cc <= 1600) registrationTaxEur = 900;
    else if (cc <= 1800) registrationTaxEur = 1100;
    else if (cc <= 2000) registrationTaxEur = 1300;
    else registrationTaxEur = 1500;
    registrationTaxExactEur = registrationTaxEur;
    euroLabel = `Μ.Ο.Ι.Κ. Individual Approval (${cc} cc — Άρθρο 136 §10)`;
    exemptionLabel = `Flat Statutory Tax €${registrationTaxEur} by Engine Displacement`;
    roadTaxEur = roadTaxByCc(cc, 2000, false, isEV);
  } else {
    // 7. PASSENGER CARS, SUPERCARS, MOTORHOMES, TAXIS, MULTI-CHILD, DISABLED ΑμεΑ & REPATRIATION (Δ.Κ. 87.03 — Άρθρα 136, 138, 142, 148, 149)
    const effectiveBody = category === 'motorhome' ? 'mpv' : body;
    const colIdx = Math.max(0, DEPRECIATION_COLUMNS.indexOf(effectiveBody));
    ageDepPct = ageMonths >= 192 ? 95 : (DEPRECIATION_TABLE[ageMonths]?.[colIdx] ?? 70);

    const allowanceKm = (15000 * ageMonths) / 12;
    const excessKm = Math.max(0, effectiveKm - allowanceKm);
    // Per ΑΑΔΕ Ε.2125/2020 Παράρτημα ΙΙ: exact division (excessKm / 500) * 0.10, and ICISnet Πεδίο 849 rounds combined Γ to 1 decimal place
    kmDepPct = Math.min(10, (excessKm / 500) * 0.10);
    const totalDepPct849 = Math.min(95, Math.round((ageDepPct + kmDepPct - (ageDepPct * kmDepPct) / 100) * 10) / 10);

    // Per ν. 5222/2025 Άρθρο 142 §1 & ΑΑΔΕ Α.1203/2019 Άρθρο 2 §6, ΛΤΠΦ already includes customs duty; never add customsDutyEur into taxableEur.
    taxableEur = Number((baseValueEur * (1 - totalDepPct849 / 100)).toFixed(2));

    // Progressive Scale on PRE-depreciation baseValueEur (Άρθρο 136 §2α)
    const scaleTax = progressiveTax(baseValueEur);
    priceBandRate = scaleTax / baseValueEur;

    // Euro Standard Surcharge (Άρθρο 136 §5, Ε.2125/2020 Παράρτημα ΙΙΙ) & Environmental Levy (ν. 4710/2020 Άρθρο 5 + Ε.2020/2022)
    const charCode = euroCharacter ? String(euroCharacter).trim().toUpperCase() : '';
    const postEnvLevyLaw = String(clearanceIso) >= '2020-08-01';
    if (charCode && /^(AD|AG|BG|CG|DG|AJ|AM|AP|EA|EB|EC)$/.test(charCode)) {
      euroSurcharge = 0;
      envLevyFull = 0;
      euroLabel = `Euro 6c / 6d-TEMP / 6d / 6e (CoC #48 Char ${charCode}, Κωδ. 1001: 0% surcharge)`;
    } else if (charCode && /^(W|BA|ZA|ZD|AA|ZG|ZJ)$/.test(charCode)) {
      euroSurcharge = 0.50;
      envLevyFull = 0;
      euroLabel = `Euro 6b/c (CoC #48 Char ${charCode}, Κωδ. 1002: +50% surcharge)`;
    } else if (charCode && /^(Q|T)$/.test(charCode)) {
      euroSurcharge = 1.00;
      envLevyFull = 0;
      euroLabel = `Early Euro 6b (CoC #48 Char ${charCode}, Κωδ. 1003: +100% surcharge, €0 Env. Levy)`;
    } else if (charCode === 'N') {
      euroSurcharge = 2.00;
      envLevyFull = 0;
      euroLabel = `Early Euro 6a (CoC #48 Char N, Κωδ. 1004: +200% surcharge, €0 Env. Levy)`;
    } else if (charCode && /^(F|G|J|K|L|M)$/.test(charCode)) {
      euroSurcharge = 1.00;
      envLevyFull = postEnvLevyLaw ? 1000 : 0;
      euroLabel = `Euro 5b (CoC #48 Char ${charCode}, Κωδ. 1014: +100% surcharge${envLevyFull ? ' + €1,000 Env. Levy' : ''})`;
    } else if (charCode && /^(A|B|C|D|E)$/.test(charCode)) {
      euroSurcharge = 2.00;
      envLevyFull = 1000;
      euroLabel = `Euro 5a (CoC #48 Char ${charCode}, Κωδ. 1015: +200% surcharge + €1,000 Env. Levy)`;
    } else if (regKey < 20050101) {
      euroSurcharge = 2.00;
      envLevyFull = 3000;
      registrationBanned = true;
      euroLabel = 'PROHIBITED: Euro 3 / 2 / 1 (<2005) — Απαγορεύεται η ταξινόμηση (unless ≥30 yrs Historic)';
    } else if (regKey < 20180901 && regKey >= 20150901) {
      euroSurcharge = 0.50;
      euroLabel = 'Euro 6b/c (Pre-09/2018, Κωδ. 1002: +50% surcharge)';
    } else if (regKey < 20150901 && regKey >= 20130101) {
      euroSurcharge = 1.00;
      envLevyFull = postEnvLevyLaw ? 1000 : 0;
      euroLabel = postEnvLevyLaw
        ? 'Euro 5b / Early Euro 6 (Κωδ. 1014/1003: +100% surcharge + €1,000 Env. Levy if Euro 5b)'
        : 'Euro 5b / Early Euro 6 (Κωδ. 1003: +100% surcharge)';
    } else if (regKey < 20130101) {
      euroSurcharge = 2.00;
      const isEuro4 = charCode === 'EURO4' || (charCode !== 'EURO5' && regKey < 20110101);
      envLevyFull = isEuro4 ? 3000 : 1000;
      euroLabel = isEuro4
        ? 'Euro 4 (Κωδ. 1016: +200% surcharge + €3,000 Env. Levy)'
        : 'Euro 5a (Κωδ. 1015: +200% surcharge + €1,000 Env. Levy)';
    }

    // CO2 Multiplier (§3α/β for Passenger/Supercar/Taxi/Multichild vs §3γ for Motorhome)
    let co2Factor = 1.0;
    if (category === 'motorhome') {
      // Άρθρο 136 §3γ: Motorhomes have +10% (Euro 6), +30% (Euro 5b), or +60% (Euro 5a/Euro 4) instead of the CO2 ladder
      if (euroSurcharge >= 2.0) co2BandAdj = 0.60;
      else if (euroSurcharge >= 1.0) co2BandAdj = 0.30;
      else co2BandAdj = 0.10;
      co2Factor = 1 + co2BandAdj;
    } else {
      const ladder = CO2_LADDER[co2Cycle];
      const co2Band = ladder.find((b) => co2 <= b.max) || ladder[ladder.length - 1];
      co2BandAdj = co2Band.adj;
      co2Factor = 1 + co2BandAdj;
    }

    effectiveRate = priceBandRate * co2Factor * (1 + euroSurcharge);
    const rawRegTax = isEV ? 0 : taxableEur * effectiveRate;

    // Statutory Exemptions (BEV 100%, Hybrids ≤50g 75% V34/V35, ≥51g 50% V32/V33, Motorhome 75%, Taxi 87%, Multi-Child 100%/50%, Disabled ΑμεΑ 100%/80%, Repatriation 80%)
    if (isEV) {
      exemptionShare = 1.0;
      exemptionLabel = '100% Exempt (Pure Electric BEV / Hydrogen — V30/V31)';
    } else if (category === 'motorhome') {
      exemptionShare = 0.75;
      exemptionLabel = '75% Statutory Motorhome Exemption (ν. 5222/2025 Άρθρο 136 §7 — pays 25%)';
    } else if (category === 'taxi') {
      exemptionShare = 0.87;
      exemptionLabel = '87% Statutory Taxi Exemption (ν. 5222/2025 Άρθρο 138 — pays 13%)';
    } else if (category === 'multichild') {
      if (cc <= 2000) {
        exemptionShare = 1.0;
        exemptionLabel = `100% Multi-Child Family Exemption (${cc} cc ≤ 2,000 cc — Άρθρο 149)`;
      } else {
        exemptionShare = 0.50;
        exemptionLabel = `50% Multi-Child Family Exemption (${cc} cc > 2,000 cc — Άρθρο 149)`;
      }
    } else if (category === 'disabled_amea') {
      if (cc <= 1650) {
        exemptionShare = 1.0;
        exemptionLabel = `100% Disabled ΑμεΑ Exemption (${cc} cc ≤ 1,650 cc — Άρθρο 148 §2 & ν. 490/1976)`;
      } else {
        exemptionShare = 0.80;
        exemptionLabel = `80% Disabled ΑμεΑ Partial Relief (${cc} cc > 1,650 cc — Άρθρο 148 §3α, or 100% if paraplegia ≤3,650 cc)`;
      }
    } else if (category === 'repatriation') {
      if (cc <= 2000) {
        exemptionShare = 0.80;
        exemptionLabel = `80% Repatriation / Μετοικεσία Exemption (${cc} cc ≤ 2,000 cc — Άρθρο 148 §3α & Δ.245/1988, pays 20%)`;
      } else {
        exemptionShare = Math.min(0.80, Number(((0.80 * 2000) / cc).toFixed(4)));
        exemptionLabel = `${(exemptionShare * 100).toFixed(1)}% Repatriation / Μετοικεσία Proportional Relief (${cc} cc > 2,000 cc — Άρθρο 148 §3α)`;
      }
    } else if (fuel === 'plugin_hybrid' || fuel === 'hybrid' || fuel === 'mild_hybrid') {
      if (clearanceIso < '2027-01-01' && co2 <= 50) {
        exemptionShare = 0.75;
        exemptionLabel = '75% Hybrid Exemption (≤50 g/km CO₂ until 31/12/2026, V34/V35 — ν. 5222/2025 Άρθ. 136 §6 & Ε.2039/2026)';
      } else if (clearanceIso >= '2025-11-01' && clearanceIso <= '2026-05-31' && co2 >= 51 && co2 <= 75) {
        exemptionShare = 0.75;
        exemptionLabel = '75% Transitional Hybrid Exemption (51–75 g/km CO₂ until 31/05/2026, V38/V39 — Άρθ. 136 §6α & Ε.2039/2026)';
      } else {
        exemptionShare = 0.50;
        exemptionLabel =
          fuel === 'mild_hybrid'
            ? '50% Mild Hybrid (MHEV 48V) Exemption (V32/V33 — ν. 5222/2025 Άρθ. 136 §6 & Ε.2039/2026)'
            : '50% Hybrid Exemption (V32/V33 — ν. 5222/2025 Άρθ. 136 §6 & ν. 5313/2026 Άρθ. 10)';
      }
    } else if (fuel === 'lpg_cng') {
      exemptionShare = 0;
      exemptionLabel = 'Bi-Fuel LPG / CNG (Assessed on Gas CO₂ Emissions — ν. 5222/2025 Άρθ. 136 §4)';
    }

    registrationTaxExactEur = Number((rawRegTax * (1 - exemptionShare)).toFixed(2));
    registrationTaxEur = Math.round(registrationTaxExactEur);
    // Per ν. 4710/2020 Άρθρο 5 §3 & ΑΑΔΕ Ε.2123/2020: Hybrid, Electric, and Disabled ΑμεΑ vehicles are 100% exempt (€0) from the €1,000 / €3,000 Environmental Levy; pure ICE Euro 5/4 pay the full flat fee
    const isEnvLevyExempt =
      isEV ||
      fuel === 'hybrid' ||
      fuel === 'plugin_hybrid' ||
      fuel === 'mild_hybrid' ||
      category === 'disabled_amea' ||
      exemptionShare >= 1.0;
    envLevyEur = isEnvLevyExempt ? 0 : envLevyFull;

    // Annual Road Tax (Τέλη Κυκλοφορίας)
    if (isEV || category === 'disabled_amea') {
      roadTaxEur = 0;
    } else if (category === 'motorhome' || regKey < 20101101) {
      roadTaxEur = roadTaxByCc(cc, regYear, false, false);
    } else {
      const rtTable = co2Cycle === 'wltp' ? ROAD_TAX_WLTP : ROAD_TAX_NEDC;
      const rtBand = rtTable.find((b) => co2 <= b.max) || rtTable[rtTable.length - 1];
      roadTaxEur = Math.round(co2 * rtBand.perGram);
    }
  }

  // ============================================================================
  // VAT & CUSTOMS DUTY REGIME (Intra-EU Margin Scheme vs New Transport <6,000km vs Non-EU CIF)
  // ============================================================================
  const isNewTransport =
    vatRegime === 'new_transport' ||
    (vatRegime === 'auto' && (ageMonths < 6 || (effectiveKm < 6000 && ageMonths < 36)));

  let vatEur = 0;
  let foreignVatCreditEur = 0;
  let vatRegimeLabel = 'EU Art. 52 Margin Scheme (Differenzbesteuerung — €0 Greek VAT)';

  if (isNonEu) {
    // Non-EU Third Country Import: 24% Greek Import VAT on (Purchase + Shipping + Customs Duty)
    vatEur = Math.round((purchaseEur + shippingEur + customsDutyEur) * 0.24);
    vatRegimeLabel = `Non-EU Import: ${(dutyRate * 100).toFixed(0)}% TARIC Duty (€${customsDutyEur.toLocaleString()}) + 24% Import VAT (€${vatEur.toLocaleString()})`;
  } else if (vatRegime === 'eu_net_b2b') {
    // Net Intra-Community Acquisition: Remove origin VAT if gross, pay 24% Greek VAT at customs
    const netPrice = Math.round(purchaseEur / (1 + geo.vat));
    foreignVatCreditEur = purchaseEur - netPrice;
    vatEur = Math.round((netPrice + shippingEur) * 0.24);
    vatRegimeLabel = `EU Net Acquisition: -${Math.round(geo.vat * 100)}% Origin VAT + 24% Greek Customs VAT`;
  } else if (isNewTransport) {
    // New Means of Transport (<6 months OR <6,000 km — ν. 5144/2024 Art. 11 §4): Owes 24% Greek VAT!
    const netPrice = Math.round(purchaseEur / (1 + geo.vat));
    foreignVatCreditEur = purchaseEur - netPrice;
    vatEur = Math.round((netPrice + shippingEur) * 0.24);
    vatRegimeLabel = 'New Means of Transport (<6m or <6,000 km — ν. 5144/2024: 24% Greek VAT due at Customs)';
  }

  const adminFeesEur = 600;
  const totalImportExtrasEur =
    registrationTaxEur +
    customsDutyEur +
    envLevyEur +
    shippingEur +
    adminFeesEur +
    roadTaxEur +
    vatEur -
    foreignVatCreditEur;
  const totalLandedGreeceEur = purchaseEur + totalImportExtrasEur;

  const totalDepPct = Number(
    Math.min(95, Math.round((ageDepPct + kmDepPct - (ageDepPct * kmDepPct) / 100) * 10) / 10).toFixed(1)
  );
  if (!registrationTaxExactEur) {
    registrationTaxExactEur = registrationTaxEur;
  }

  return {
    category,
    ageMonths,
    regDay,
    regMonth,
    regYear,
    co2,
    cc,
    co2Cycle: co2Cycle.toUpperCase(),
    co2AdjPct: Math.round(co2BandAdj * 100),
    euroLabel,
    euroSurchargePct: Math.round(euroSurcharge * 100),
    registrationBanned,
    listPriceEur: Math.round(listPriceEur),
    extrasEur: Math.round(extrasEur),
    baseValueEur: Math.round(baseValueEur),
    ageDepPct,
    kmDepPct: Number(kmDepPct.toFixed(2)),
    totalDepPct,
    taxableEur: Math.round(taxableEur),
    taxableExactEur: Number(taxableEur.toFixed(2)),
    priceBandRatePct: Number((priceBandRate * 100).toFixed(2)),
    effectiveRatePct: Number((effectiveRate * (1 - exemptionShare) * 100).toFixed(2)),
    exemptionShare,
    exemptionLabel,
    registrationTaxEur,
    registrationTaxExactEur,
    customsDutyEur,
    dutyRatePct: Math.round(dutyRate * 100),
    envLevyEur,
    shippingEur,
    adminFeesEur,
    roadTaxEur,
    vatEur,
    foreignVatCreditEur,
    vatRegimeLabel,
    totalImportExtrasEur,
    totalLandedGreeceEur,
  };
}

/**
 * Computes a complete, range-aware Greek Customs Valuation (`low`, `mid`, `high`)
 * across all 19 vehicle categories & subcategories.
 */
export function calculateGreekImport(item, query = '', overrides = {}) {
  if (typeof query === 'object' && query !== null) {
    overrides = query;
    query = '';
  }
  if (!item || typeof item.priceEur !== 'number' || item.priceEur <= 500) {
    return null;
  }

  const countryCode = resolveCountryCode(overrides.country || item.country);
  const geo = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.EU;

  if ((countryCode === 'GR' || item.marketplace === 'car.gr') && !overrides.forceImport) {
    return {
      isDomesticGreek: true,
      originCountry: 'GR',
      originCountryName: 'Greece',
      purchaseEur: item.priceEur,
      registrationTaxEur: 0,
      regTaxRange: { low: 0, mid: 0, high: 0 },
      shippingEur: 0,
      adminFeesEur: 0,
      roadTaxEur: 0,
      totalImportExtrasEur: 0,
      totalExtrasRange: { low: 0, mid: 0, high: 0 },
      totalLandedGreeceEur: item.priceEur,
      landedRange: { low: item.priceEur, mid: item.priceEur, high: item.priceEur },
      confidence: 'high',
      exemptionLabel: 'Domestic Greek Registration (Ελληνικής Κυκλοφορίας — €0 Customs)',
    };
  }

  const combinedText = `${query} ${item.title || ''} ${item.variant || ''} ${item.fuelType || ''}`;
  const reg = parseRegYearMonth(overrides.registration || item.registration, overrides.year || item.year);
  const now = overrides.clearanceDate ? new Date(overrides.clearanceDate) : new Date();
  const clearanceYear = now.getUTCFullYear();
  const clearanceMonth = now.getUTCMonth() + 1;
  const clearanceDay = overrides.clearanceDate ? now.getUTCDate() : null;
  const clearanceIso = now.toISOString().slice(0, 10);
  const extraMonthInit = reg.day != null && clearanceDay != null && clearanceDay > reg.day ? 1 : 0;
  const midAgeMonths = Math.max(1, (clearanceYear - reg.year) * 12 + (clearanceMonth - reg.month) + extraMonthInit);

  const rawProfile = MODEL_PROFILES.find((p) => p.matchRe.test(combinedText));
  const vinModelYear = decodeVinManufacturingYear(overrides.vin || item.vin, reg.year);
  const effectivePricelistYear = vinModelYear && vinModelYear < reg.year ? vinModelYear : reg.year;
  const greekImporterEntry = lookupGreekImporterLtpf(combinedText, effectivePricelistYear);
  const multiTrimSchedule = greekImporterEntry
    ? buildMultiTrimGreekSchedule(greekImporterEntry, combinedText, effectivePricelistYear, overrides.greekTrimKey || '')
    : null;
  const isRoadster = rawProfile?.roadsterRe
    ? rawProfile.roadsterRe.test(combinedText)
    : /roadster|cabrio|spyder|spider|convertible|targa|aperta/i.test(combinedText);

  const inferredCategory = inferVehicleCategory(combinedText, reg.year);
  const universalSpec = inferUniversalSpecsFromText(combinedText, reg.year, inferredCategory, 'petrol');

  const explicitItemFuel = item.fuelType ? normalizeFuelType(item.fuelType) : null;
  const rawProfileFuel = rawProfile
    ? typeof rawProfile.fuel === 'function'
      ? rawProfile.fuel(combinedText, effectivePricelistYear)
      : rawProfile.fuel
    : null;
  const fuel =
    overrides.fuel ||
    (rawProfileFuel || explicitItemFuel || greekImporterEntry?.fuel || universalSpec.fuel || normalizeFuelType(combinedText));

  // Only apply a model profile's specs/label if the user didn't explicitly override fuel to an incompatible drivetrain (e.g. switching BMW i8 to Electric BEV)
  const profile =
    rawProfile &&
    (!overrides.fuel ||
      overrides.fuel === rawProfileFuel ||
      (overrides.fuel === 'hybrid' && rawProfileFuel === 'plugin_hybrid'))
      ? rawProfile
      : null;

  const category =
    overrides.category ||
    item.category ||
    (inferredCategory !== 'passenger'
      ? inferredCategory
      : profile?.category || universalSpec.category || inferredCategory);
  const catMeta = VEHICLE_CATEGORIES.find((c) => c.id === category) || VEHICLE_CATEGORIES[0];

  const body =
    overrides.body ||
    (profile
      ? profile.body(isRoadster, combinedText)
      : greekImporterEntry?.body || universalSpec.body || inferBodyClass(combinedText));
  const isPureEvOrH2 = fuel === 'electric' || fuel === 'hydrogen';
  const profileCc = profile
    ? typeof profile.cc === 'function'
      ? profile.cc(combinedText, effectivePricelistYear)
      : profile.cc
    : null;
  let rawCc = isPureEvOrH2
    ? 0
    : Number(
        overrides.cc ||
          item.cc ||
          (profileCc != null
            ? profileCc
            : greekImporterEntry?.cc ||
              universalSpec.cc ||
              (category === 'motorcycle' ? 650 : category === 'quadricycle' || category === 'quadricycle_cargo' ? 500 : category === 'bus' ? 7700 : 1998))
      );
  // Rotary Wankel 2x statutory engine displacement rule (ν. 5222/2025 Άρθρο 143)
  if (!isPureEvOrH2 && universalSpec.wankel && rawCc > 0 && rawCc <= 1600) {
    rawCc = rawCc * 2;
  }
  const cc = rawCc;
  const gvwKg = Number(
    overrides.gvwKg || item.gvwKg || universalSpec.gvwKg || (category === 'truck_heavy' ? 18000 : 3000)
  );
  const seats = Number(
    overrides.seats || item.seats || universalSpec.seats || (category === 'bus' ? 50 : 5)
  );
  const vatRegime =
    overrides.vatRegime ||
    item.vatRegime ||
    (item.vatDeductible ? 'eu_vat_invoice' : item.marginScheme ? 'margin_scheme' : 'auto');

  const allowanceKm = (15000 * midAgeMonths) / 12;
  const rawKm = overrides.mileageKm != null ? Number(overrides.mileageKm) : item.mileageKm;
  const effectiveKm =
    reg.year <= clearanceYear - 3 && rawKm > 0 && rawKm <= 500
      ? rawKm * 1000
      : (rawKm ?? allowanceKm);

  // Determine CO2 Range FIRST so that if `overrides.greekRetailEur` (ΑΠΛΤ) is provided, we can invert it using exact CO2
  const regKeyMid = reg.year * 10000 + reg.month * 100 + 15;
  const co2CycleMid = regKeyMid <= 20201231 ? 'nedc' : 'wltp';
  const hasVerifiedIdentity = Boolean(
    overrides.vin ||
    item.vin ||
    item.licensePlate ||
    overrides.listPriceEur ||
    overrides.greekRetailEur ||
    item.decodedVin?.listPriceEur
  );

  const exactCo2Val =
    overrides.co2 != null && overrides.co2 !== ''
      ? Number(overrides.co2)
      : item.co2 != null
        ? Number(item.co2)
        : item.decodedVin?.co2 != null
          ? Number(item.decodedVin.co2)
          : null;
  let co2Range;
  if (isPureEvOrH2) {
    co2Range = { low: 0, mid: 0, high: 0 };
  } else if (exactCo2Val != null && !Number.isNaN(exactCo2Val)) {
    co2Range = { low: exactCo2Val, mid: exactCo2Val, high: exactCo2Val };
  } else if (profile) {
    const rawCo2 = profile.co2RangeByYear(reg.year, isRoadster, combinedText);
    co2Range = hasVerifiedIdentity ? { low: rawCo2.mid, mid: rawCo2.mid, high: rawCo2.mid } : rawCo2;
  } else if (greekImporterEntry?.co2 != null) {
    const m = greekImporterEntry.co2;
    co2Range = hasVerifiedIdentity ? { low: m, mid: m, high: m } : { low: Math.max(0, m - 6), mid: m, high: m + 8 };
  } else if (universalSpec.co2 != null) {
    const m = universalSpec.co2;
    co2Range = hasVerifiedIdentity ? { low: m, mid: m, high: m } : { low: Math.max(0, m - 8), mid: m, high: m + 8 };
  } else if (fuel === 'plugin_hybrid') {
    co2Range = hasVerifiedIdentity ? { low: 44, mid: 44, high: 44 } : { low: 34, mid: 44, high: 54 };
  } else if (fuel === 'hybrid') {
    const m = co2CycleMid === 'wltp' ? 118 : 105;
    co2Range = hasVerifiedIdentity ? { low: m, mid: m, high: m } : { low: m - 10, mid: m, high: m + 12 };
  } else {
    const litres = cc / 1000;
    const m = Math.round((70 + 45 * litres) * (co2CycleMid === 'wltp' ? 1.08 : 1));
    co2Range = hasVerifiedIdentity
      ? { low: m, mid: m, high: m }
      : { low: Math.round(m * 0.92), mid: m, high: Math.round(m * 1.09) };
  }

  // 1. Greek Base List Price (ΛΤΠΦ / Wholesale Value) Range { low, mid, high } & Provenance
  let listPriceRange;
  let listPriceSource;
  let ltpfProvenance = 'market_backsolved_estimate';
  let hasVerifiedLtpf = false;
  let confidence = 'medium';

  const rdwGross = Number(item.rdwCatalogPriceEur || item.decodedVin?.rdwCatalogPriceEur || 0);
  const rdwBpm = Number(item.brutoBpmEur || item.decodedVin?.brutoBpmEur || 0);

  const isSalvageOrDamaged = Boolean(
    overrides.damaged ||
    item.damaged ||
    /\b(unfallwagen|unfallschaden|unfallfahrzeug|motorschaden|getriebeschaden|hagelschaden|totalschaden|salvage|accident\s+damaged|accidenté|sinistrata|uszkodzony)\b/i.test(
      combinedText
    )
  );
  const salvageCustomsWarning = isSalvageOrDamaged
    ? 'SALVAGE / ACCIDENT DAMAGE CUSTOMS RULE (ν. 5222/2025 Άρθρο 142 & Α.1203/2019 Άρθρο 4): Greek Customs (ΔΙΠΕΑΑ) grants 0% extra depreciation for crash, hail, or engine damage when issuing license plates! Registration Tax is assessed on the FULL undamaged original Greek ΛΤΠΦ minus only statutory age + mileage depreciation.'
    : null;

  if (overrides.listPriceEur && Number(overrides.listPriceEur) >= 500) {
    const manualLp = Number(overrides.listPriceEur);
    listPriceRange = { low: manualLp, mid: manualLp, high: manualLp };
    listPriceSource = `Manual Official Greek ΛΤΠΦ / ΑΑΔΕ Βεβαίωση (€${manualLp.toLocaleString()})`;
    ltpfProvenance = 'manual_override';
    hasVerifiedLtpf = true;
    confidence = 'high';
  } else if (overrides.greekRetailEur && Number(overrides.greekRetailEur) >= 1000) {
    const inv = invertGreekRetailByYear(Number(overrides.greekRetailEur), {
      co2: co2Range.mid,
      cc,
      fuel,
      pricelistYear: effectivePricelistYear,
      pricelistMonth: reg.month,
    });
    const solvedLp = inv?.ltpfEur || Math.round(Number(overrides.greekRetailEur) / 1.35);
    listPriceRange = { low: solvedLp, mid: solvedLp, high: solvedLp };
    listPriceSource = `Mathematically Inverted from Greek Retail Price ΑΠΛΤ €${Number(overrides.greekRetailEur).toLocaleString()} → Official ΛΤΠΦ €${solvedLp.toLocaleString()} (${inv?.regimeLabel || 'ν. 5222/2025 Άρθ. 136'})`;
    ltpfProvenance = 'inverted_greek_aplt';
    hasVerifiedLtpf = true;
    confidence = 'high';
  } else if (item.decodedVin?.listPriceEur && Number(item.decodedVin.listPriceEur) >= 500 && !rdwGross) {
    const vinLp = Number(item.decodedVin.listPriceEur);
    listPriceRange = { low: vinLp, mid: vinLp, high: vinLp };
    listPriceSource = `Exact VIN-Decoded OEM Factory Pre-Tax ΛΤΠΦ (€${vinLp.toLocaleString()})`;
    ltpfProvenance = 'oem_vin_vds';
    hasVerifiedLtpf = true;
    confidence = 'high';
  } else if (rdwGross >= 1500) {
    const netRdwLp = convertDutchRdwToNetLtpf(rdwGross, rdwBpm, fuel);
    listPriceRange = { low: Math.round(netRdwLp * 0.96), mid: netRdwLp, high: Math.round(netRdwLp * 1.04) };
    listPriceSource = `Dutch RDW Netto Catalogusprijs €${netRdwLp.toLocaleString()} (Ex-21% BTW${rdwBpm ? ` & Ex-€${rdwBpm.toLocaleString()} BPM` : ''} from €${rdwGross.toLocaleString()} Gross RDW)`;
    ltpfProvenance = 'dutch_rdw_netto';
    hasVerifiedLtpf = true;
    confidence = 'high';
  } else if (profile) {
    const rawRange = profile.listPriceRangeByYear(effectivePricelistYear, isRoadster, combinedText);
    listPriceRange = hasVerifiedIdentity
      ? { low: rawRange.mid, mid: rawRange.mid, high: rawRange.mid }
      : rawRange;
    listPriceSource = hasVerifiedIdentity ? `${profile.label} (Official Greek ΛΤΠΦ Locked)` : profile.label;
    ltpfProvenance = 'official_greek_importer';
    hasVerifiedLtpf = true;
    confidence = profile.confidence || 'high';
  } else if (greekImporterEntry && category === 'passenger') {
    const midLp = multiTrimSchedule ? multiTrimSchedule.ltpfEur : greekImporterEntry.ltpfEur;
    const trimLocked = Boolean(hasVerifiedIdentity || overrides.greekTrimKey || multiTrimSchedule?.autoDetectedFromText);
    listPriceRange = trimLocked
      ? { low: midLp, mid: midLp, high: midLp }
      : (multiTrimSchedule?.ltpfRange || greekImporterEntry.ltpfRange);
    listPriceSource = multiTrimSchedule
      ? `${greekImporterEntry.label.split('(')[0].trim()} • ${multiTrimSchedule.activeTrimName} (MY${effectivePricelistYear} Official Greek ΛΤΠΦ €${midLp.toLocaleString()} · ΑΠΛΤ €${multiTrimSchedule.apltEur.toLocaleString()})`
      : greekImporterEntry.sourceLabel;
    ltpfProvenance = 'official_greek_importer';
    hasVerifiedLtpf = true;
    confidence = 'high';
  } else if (universalSpec.listPriceEur && !isPureEvOrH2) {
    const midLp = universalSpec.listPriceEur;
    listPriceRange = { low: Math.round(midLp * 0.92), mid: midLp, high: Math.round(midLp * 1.08) };
    listPriceSource = `${universalSpec.label || 'Universal Segment Benchmark'} (Benchmark ΛΤΠΦ €${midLp.toLocaleString()} ±8%)`;
    ltpfProvenance = 'segment_homologation';
    hasVerifiedLtpf = false;
    confidence = 'medium';
  } else if (
    category === 'bus' ||
    category === 'truck_heavy' ||
    category === 'historic' ||
    category === 'moik' ||
    category === 'emergency_special'
  ) {
    listPriceRange = { low: item.priceEur, mid: item.priceEur, high: item.priceEur };
    listPriceSource = `${catMeta.shortLabel} — Assessed on Purchase Invoice / Fixed Scale (${catMeta.lawRef})`;
    ltpfProvenance = 'statutory_fixed_or_invoice';
    hasVerifiedLtpf = true;
    confidence = 'high';
  } else if (category === 'motorcycle') {
    // Motorcycles (ν. 5222/2025 Άρθρο 140 §2α): Assessed on International Wholesale Price when new (~78% of new retail MSRP)
    const motoAgeYears = Math.min(10, midAgeMonths / 12);
    const motoRetention = Math.max(0.38, 1 - motoAgeYears * 0.065);
    const estNewRetailNet = item.priceEur / (1 + geo.vat) / motoRetention;
    const midWholesale = Math.max(item.priceEur, Math.round(estNewRetailNet * 0.78));
    listPriceRange = { low: Math.round(midWholesale * 0.92), mid: midWholesale, high: Math.round(midWholesale * 1.08) };
    listPriceSource = `Motorcycle International Wholesale Value (Τιμή Χονδρικής Πώλησης €${midWholesale.toLocaleString()} — Άρθρο 140 §2α)`;
    ltpfProvenance = 'motorcycle_wholesale';
    hasVerifiedLtpf = true;
    confidence = 'high';
  } else {
    const kmFactor = Math.min(1.25, Math.max(0.80, 1 + (0.0025 * (effectiveKm - allowanceKm)) / 1000));
    const rawRho = rho(midAgeMonths, geo.vat);
    // Supercars & exotics (>€85k asking price or ≥3,800 cc) retain 60%–85% of MSRP rather than depreciating like mass-market sedans
    const isExoticRetention = item.priceEur >= 85000 || cc >= 3800;
    const effectiveRho = isExoticRetention ? Math.max(rawRho, 0.78 * (1 + geo.vat)) : rawRho;
    // Per Α.1203/2019 Άρθρο 4, Greek Customs assesses full undamaged ΛΤΠΦ even on crash/salvage imports; restore undamaged market value (~1.85x) before back-solving ΛΤΠΦ
    const undamagedMarketPriceEur = isSalvageOrDamaged ? Math.round(item.priceEur * 1.85) : item.priceEur;
    // Adjust foreign net MSRP to Greek Importer ΛΤΠΦ (~0.92 factor since Greek importers price pre-tax ΛΤΠΦ slightly lower than DE/IT net MSRP to absorb Greek TT)
    const foreignNetMsrp = (undamagedMarketPriceEur * kmFactor) / effectiveRho;
    const midLp = Math.round(foreignNetMsrp * 0.92);
    // NEVER collapse range or claim "VIN-Locked Pre-Tax ΛΤΠΦ" when back-solving from foreign asking price!
    listPriceRange = {
      low: Math.round(midLp * 0.90),
      mid: midLp,
      high: Math.round(midLp * 1.12),
    };
    listPriceSource = isPureEvOrH2
      ? `Pure Electric BEV Pre-Tax ΛΤΠΦ (€${midLp.toLocaleString()} · 100% Registration Tax Exempt)`
      : `Estimated Benchmark ΛΤΠΦ (€${midLp.toLocaleString()} ±11% back-solved from ${geo.name} asking price — enter Greek Importer ΛΤΠΦ or ΑΠΛΤ for exact ICISnet filing)`;
    ltpfProvenance = isPureEvOrH2 ? 'bev_exempt' : 'market_backsolved_estimate';
    hasVerifiedLtpf = isPureEvOrH2;
    confidence = isPureEvOrH2 ? 'high' : 'medium';
  }

  // 2. Factory Optional Equipment (Πρόσθετος Εξοπλισμός Extras — ΑΑΔΕ Α.1043/2025)
  const rawParsedBuildSheet = overrides.buildSheetText
    ? parseOemBuildSheetToGreekExtras(overrides.buildSheetText, { regYear: effectivePricelistYear })
    : null;
  // Deduplicate `sport_pkg` if the base ΛΤΠΦ is already locked to the `sport` or `flagship` Greek Importer Trim Tier
  const parsedBuildSheet = rawParsedBuildSheet
    ? (() => {
        const isTrimAlreadySport = multiTrimSchedule && (multiTrimSchedule.activeTrimKey === 'sport' || multiTrimSchedule.activeTrimKey === 'flagship');
        const filteredItems = isTrimAlreadySport
          ? rawParsedBuildSheet.detectedItems.filter((it) => it.id !== 'sport_pkg')
          : rawParsedBuildSheet.detectedItems;
        const totalExtrasPreTaxEur = filteredItems.reduce((sum, it) => sum + it.greekPreTaxEur, 0);
        return {
          ...rawParsedBuildSheet,
          detectedItems: filteredItems,
          totalExtrasPreTaxEur,
          itemCount: filteredItems.length,
          summaryLabel:
            filteredItems.length > 0
              ? `Parsed ${filteredItems.length} OEM Factory Options → Total Pre-Tax Extras: €${totalExtrasPreTaxEur.toLocaleString()} (Α.1043/2025)`
              : 'No additional chargeable extras outside selected Greek trim',
        };
      })()
    : null;

  let extrasRange;
  if (overrides.extrasEur != null && overrides.extrasEur !== '') {
    const manualEx = Number(overrides.extrasEur);
    extrasRange = {
      low: manualEx,
      mid: manualEx,
      high: manualEx,
      detectedItems: parsedBuildSheet?.detectedItems || [],
      note: 'Manual Extras Override',
    };
  } else if (parsedBuildSheet && parsedBuildSheet.detectedItems.length > 0) {
    const bsEx = parsedBuildSheet.totalExtrasPreTaxEur;
    extrasRange = {
      low: bsEx,
      mid: bsEx,
      high: bsEx,
      detectedItems: parsedBuildSheet.detectedItems,
      note: parsedBuildSheet.summaryLabel,
    };
  } else {
    const rawExtras = estimateFactoryExtras(
      combinedText,
      listPriceRange.mid,
      overrides.selectedOptionIds || item.detectedOptionIds,
      category
    );
    if (hasVerifiedIdentity && hasVerifiedLtpf) {
      extrasRange = {
        low: rawExtras.mid,
        mid: rawExtras.mid,
        high: rawExtras.mid,
        detectedItems: rawExtras.detectedItems,
        note: rawExtras.detectedItems?.length
          ? `Exact Α.1043/2025 Build-Sheet Extras (${rawExtras.detectedItems.length} options)`
          : 'Exact VIN Equipment Valuation',
      };
    } else {
      extrasRange = rawExtras;
    }
  }

  // 4. Registration Month Uncertainty
  let lowMonth = reg.month;
  let highMonth = reg.month;
  if (reg.monthAssumed && !overrides.registration && !hasVerifiedIdentity) {
    if (reg.year === 2018 || reg.year === 2015) {
      lowMonth = 10;
      highMonth = 5;
    } else {
      lowMonth = 1;
      highMonth = 12;
    }
  }

  const commonArgs = {
    category,
    purchaseEur: item.priceEur,
    geo,
    regYear: reg.year,
    regDay: reg.day,
    clearanceYear,
    clearanceMonth,
    clearanceDay,
    clearanceIso,
    effectiveKm,
    body,
    fuel,
    cc,
    gvwKg,
    seats,
    customShippingEur: overrides.shippingEur,
    vatRegime,
    euroCharacter: overrides.euroCharacter || item.euroCharacter || null,
  };

  const midScenario = runSingleStatutoryScenario({
    ...commonArgs,
    regMonth: reg.month,
    co2: co2Range.mid,
    listPriceEur: listPriceRange.mid,
    extrasEur: extrasRange.mid,
  });

  const lowScenario = runSingleStatutoryScenario({
    ...commonArgs,
    regMonth: lowMonth,
    co2: co2Range.low,
    listPriceEur: listPriceRange.low,
    extrasEur: extrasRange.low,
  });

  const highScenario = runSingleStatutoryScenario({
    ...commonArgs,
    regMonth: highMonth,
    co2: co2Range.high,
    listPriceEur: listPriceRange.high,
    extrasEur: extrasRange.high,
  });

  const regTaxLow = Math.min(lowScenario.registrationTaxEur, midScenario.registrationTaxEur);
  const regTaxHigh = Math.max(highScenario.registrationTaxEur, midScenario.registrationTaxEur);
  const landedLow = Math.min(lowScenario.totalLandedGreeceEur, midScenario.totalLandedGreeceEur);
  const landedHigh = Math.max(highScenario.totalLandedGreeceEur, midScenario.totalLandedGreeceEur);
  const extrasTotalLow = Math.min(lowScenario.totalImportExtrasEur, midScenario.totalImportExtrasEur);
  const extrasTotalHigh = Math.max(highScenario.totalImportExtrasEur, midScenario.totalImportExtrasEur);

  // 5. Sensitivity Drivers
  const plus5kExtras = runSingleStatutoryScenario({
    ...commonArgs,
    regMonth: reg.month,
    co2: co2Range.mid,
    listPriceEur: listPriceRange.mid,
    extrasEur: extrasRange.mid + 5000,
  });
  const sensitivityDrivers = [
    {
      label: 'Category Statutory Framework',
      deltaEur: midScenario.registrationTaxEur,
      note: catMeta.lawRef,
    },
    {
      label: 'Every +€5,000 of VIN factory extras (Πρόσθετος Εξοπλισμός Α.1043/2025)',
      deltaEur: plus5kExtras.registrationTaxEur - midScenario.registrationTaxEur,
    },
  ];

  if (reg.monthAssumed) {
    sensitivityDrivers.push({
      label:
        reg.year === 2018
          ? '2018 Registration Month Cliff (Pre-Sep 2018 Euro 6 +50% vs Post-Sep 0%)'
          : `Registration Month Spread (Jan ${reg.year} vs Dec ${reg.year} depreciation)`,
      deltaEur: Math.abs(highScenario.registrationTaxEur - lowScenario.registrationTaxEur),
    });
  }

  if ((fuel === 'plugin_hybrid' || fuel === 'hybrid') && co2Range.mid <= 50 && category === 'passenger') {
    const post2027 = runSingleStatutoryScenario({
      ...commonArgs,
      clearanceIso: '2027-01-15',
      regMonth: reg.month,
      co2: co2Range.mid,
      listPriceEur: listPriceRange.mid,
      extrasEur: extrasRange.mid,
    });
    sensitivityDrivers.push({
      label: 'Clearance on/after 01 Jan 2027 (ν. 5313/2026: PHEV exemption drops 75% → 50%)',
      deltaEur: post2027.registrationTaxEur - midScenario.registrationTaxEur,
    });
  }

  // 6. Statutory Boundary Cliffs & VIN Model-Year Audit (`auditStatutoryCliffsAndVinMy`)
  const statutoryCliffs = auditStatutoryCliffsAndVinMy({
    vin: overrides.vin || item.vin || '',
    regYear: reg.year,
    regMonth: reg.month,
    co2: co2Range.mid,
    fuel,
    baseLtpfEur: listPriceRange.mid,
    extrasEur: extrasRange.mid,
    taxableEur: midScenario.taxableEur,
    midScenarioTaxEur: midScenario.registrationTaxEur,
    ltpfProvenance,
    availableGreekTrims: multiTrimSchedule?.availableGreekTrims || null,
    activeTrimKey: multiTrimSchedule?.activeTrimKey || null,
    runScenarioFn: (altCo2) =>
      runSingleStatutoryScenario({
        ...commonArgs,
        regMonth: reg.month,
        co2: altCo2,
        listPriceEur: listPriceRange.mid,
        extrasEur: extrasRange.mid,
      }),
  });

  // 7. Legal & Practical Compliance Warnings
  const warnings = [
    `${catMeta.shortLabel} (${catMeta.tariffCode}): Governed by ${catMeta.lawRef}.`,
    'ΑΑΔΕ Α.1043/2025 (ΦΕΚ Β΄ 1257/2025): Exact valuation uses the 17-char VIN Equipment Card (Eurotax / DAT SilverDAT3 / PartsLink / Official Importer) + Δήλωση Εξοπλισμού και Αξίας (Annex I/II).',
    'ν. 5313/2026 Άρθρο 11 & ΑΑΔΕ Ε.2036/2026 (amending ν. 5222/2025 Άρθρο 146 §8): Greek customs requires 100% of the total invoice value to be paid via bank transfer prior to ΔΕΦΚ submission (and customs code 2021 for Art. 52 margin scheme vehicles).',
  ];
  for (const cliffAlert of statutoryCliffs.alerts) {
    warnings.unshift(`${cliffAlert.severity === 'critical' ? 'CRITICAL CLIFF' : 'STATUTORY AUDIT'}: ${cliffAlert.title} — ${cliffAlert.detail}`);
  }
  if (salvageCustomsWarning) {
    warnings.unshift(salvageCustomsWarning);
  }
  if (midScenario.registrationBanned) {
    warnings.unshift(
      'STATUTORY IMPORT BAN (ν. 4710/2020 Άρθρο 5): Euro 3, 2, and 1 passenger cars and trucks (<2005) are PROHIBITED from Greek registration unless ≥30 years old and cleared under Historic Vehicle TARIC 9705.10.00!'
    );
  }
  if (midScenario.vatEur > 0) {
    warnings.unshift(`VAT / CUSTOMS ALERT: ${midScenario.vatRegimeLabel}`);
  }
  if (reg.monthAssumed && reg.year === 2018) {
    warnings.unshift(
      'CRITICAL 2018 EURO 6 CLIFF: Listing only states "2018". If first registered before 01/09/2018 (Euro 6b/c), customs adds a +50% surcharge; if registered from 01/09/2018 onward (Euro 6d-TEMP), surcharge is 0%.'
    );
  }

  return {
    isDomesticGreek: false,
    isSalvageOrDamaged,
    salvageCustomsWarning,
    isExactValuation: Boolean((hasVerifiedIdentity || overrides.greekTrimKey || parsedBuildSheet?.detectedItems?.length) && hasVerifiedLtpf),
    hasVerifiedLtpf,
    ltpfProvenance,
    effectivePricelistYear,
    vinModelYear,
    availableGreekTrims: multiTrimSchedule?.availableGreekTrims || null,
    activeGreekTrimKey: multiTrimSchedule?.activeTrimKey || null,
    activeGreekTrimName: multiTrimSchedule?.activeTrimName || null,
    parsedBuildSheet,
    statutoryCliffs,
    greekImporterPortals: GREEK_IMPORTER_PORTALS,
    category,
    categoryLabel: catMeta.label,
    categoryShortLabel: catMeta.shortLabel,
    tariffCode: catMeta.tariffCode,
    lawRef: catMeta.lawRef,
    originCountry: countryCode,
    originCountryName: geo.name,
    euMember: geo.eu,
    confidence,
    monthAssumed: reg.monthAssumed,
    ageMonths: midScenario.ageMonths,
    body,
    fuel,
    cc,
    gvwKg,
    seats,
    co2: midScenario.co2,
    co2Range,
    co2Cycle: midScenario.co2Cycle,
    euroLabel: midScenario.euroLabel,
    registrationBanned: midScenario.registrationBanned,
    baseListPriceEur: midScenario.listPriceEur,
    listPriceRange,
    listPriceSource,
    extrasEur: midScenario.extrasEur,
    extrasRange,
    baseValueEur: midScenario.baseValueEur,
    ageDepPct: midScenario.ageDepPct,
    kmDepPct: midScenario.kmDepPct,
    totalDepPct: midScenario.totalDepPct,
    taxableEur: midScenario.taxableEur,
    taxableExactEur: midScenario.taxableExactEur,
    priceBandRatePct: midScenario.priceBandRatePct,
    effectiveRatePct: midScenario.effectiveRatePct,
    exemptionShare: midScenario.exemptionShare,
    exemptionLabel: midScenario.exemptionLabel,
    purchaseEur: item.priceEur,
    registrationTaxEur: midScenario.registrationTaxEur,
    registrationTaxExactEur: midScenario.registrationTaxExactEur,
    regTaxRange: { low: regTaxLow, mid: midScenario.registrationTaxEur, high: regTaxHigh },
    customsDutyEur: midScenario.customsDutyEur,
    envLevyEur: midScenario.envLevyEur,
    shippingEur: midScenario.shippingEur,
    adminFeesEur: midScenario.adminFeesEur,
    roadTaxEur: midScenario.roadTaxEur,
    vatEur: midScenario.vatEur,
    vatRegimeLabel: midScenario.vatRegimeLabel,
    totalImportExtrasEur: midScenario.totalImportExtrasEur,
    totalExtrasRange: { low: extrasTotalLow, mid: midScenario.totalImportExtrasEur, high: extrasTotalHigh },
    totalLandedGreeceEur: midScenario.totalLandedGreeceEur,
    landedRange: { low: landedLow, mid: midScenario.totalLandedGreeceEur, high: landedHigh },
    scenarios: { low: lowScenario, mid: midScenario, high: highScenario },
    sensitivityDrivers,
    warnings,
  };
}
