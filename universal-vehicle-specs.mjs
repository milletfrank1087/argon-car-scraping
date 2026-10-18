/**
 * Universal Vehicle Specification & Homologation Inference Engine
 * Works across all 19 Greek Customs Categories (ν. 5222/2025 Άρθρα 135–158):
 * - Passenger cars (city cars, hatchbacks, sedans, SUVs, MPVs, sports cars, supercars, hypercars)
 * - Rotary Wankel engines (ν. 5222/2025 Άρθρο 143: 2× nominal chamber displacement)
 * - Motorcycles & Scooters (Δ.Κ. 87.11 — 50cc to 2,500cc)
 * - ATVs / Quads / Buggies / Microcars / Utility UTVs (Κανονισμός 168/2013 L-Cat)
 * - Pickups (Double-Cab & Open Single-Cab ≤3.5t), Closed Vans ≤3.5t, Converted Passenger Vans
 * - Heavy Trucks & Tractors >3.5t, Chassis-Cabs, Buses >9 seats, Motorhomes, Taxis, Ambulances/Hearses
 */

const EXPLICIT_MAKE_MODEL_SPECS = [
  // Rotary Wankel (ν. 5222/2025 Άρθρο 143: Statutory cc = 2 × nominal 1,308 cc = 2,616 cc)
  { re: /\bmazda\b.*\brx-?8\b/i, cc: 2616, co2: 284, lp: 26500, body: 'coupe', fuel: 'petrol', wankel: true, label: 'Mazda RX-8 Renesis Wankel (Άρθ. 143: 2×1,308 = 2,616 cc)' },
  { re: /\bmazda\b.*\brx-?7\b/i, cc: 2616, co2: 275, lp: 31000, body: 'coupe', fuel: 'petrol', wankel: true, label: 'Mazda RX-7 Twin-Turbo Wankel (Άρθ. 143: 2×1,308 = 2,616 cc)' },

  // Supercars & Exotics not already in primary MODEL_PROFILES
  { re: /\bmclaren\b.*\b(720s|750s|765lt|senna)\b/i, cc: 3994, co2: 276, lp: 215000, body: 'coupe', fuel: 'petrol', label: 'McLaren Super Series 4.0L V8 Twin-Turbo (3,994 cc)' },
  { re: /\bmclaren\b.*\b(540c|570s|570gt|600lt|650s|mp4-12c|gt\b)\b/i, cc: 3799, co2: 249, lp: 158000, body: 'coupe', fuel: 'petrol', label: 'McLaren Sports Series 3.8L V8 Twin-Turbo (3,799 cc)' },
  { re: /\bmclaren\b.*\bartura\b/i, cc: 2993, co2: 104, lp: 182000, body: 'coupe', fuel: 'plugin_hybrid', label: 'McLaren Artura 3.0L V6 PHEV (2,993 cc · 104 g/km)' },
  { re: /\baston\s+martin\b.*\b(db11|db12|vantage|dbs)\b/i, cc: 3982, co2: 262, lp: 168000, body: 'coupe', fuel: 'petrol', label: 'Aston Martin 4.0L V8 Bi-Turbo (3,982 cc)' },
  { re: /\baston\s+martin\b.*\bdbx\b/i, cc: 3982, co2: 323, lp: 165000, body: 'suv', fuel: 'petrol', label: 'Aston Martin DBX 4.0L V8 SUV (3,982 cc)' },
  { re: /\bmaserati\b.*\bmc20\b/i, cc: 2992, co2: 261, lp: 185000, body: 'coupe', fuel: 'petrol', label: 'Maserati MC20 3.0L V6 Nettuno (2,992 cc)' },
  { re: /\bmaserati\b.*\b(granturismo|grancabrio)\b/i, cc: 2992, co2: 230, lp: 145000, body: 'coupe', fuel: 'petrol', label: 'Maserati GranTurismo (2,992 cc)' },
  { re: /\bmaserati\b.*\bgrecale\b/i, cc: 1995, co2: 198, lp: 64000, body: 'suv', fuel: 'mild_hybrid', label: 'Maserati Grecale 2.0L MHEV (1,995 cc)' },
  { re: /\bmaserati\b.*\b(levante|ghibli)\b/i, cc: 2979, co2: 245, lp: 74000, body: 'suv', fuel: 'petrol', label: 'Maserati 3.0L V6 (2,979 cc)' },
  { re: /\bbentley\b.*\b(continental|flying\s+spur|bentayga)\b/i, cc: 3996, co2: 288, lp: 178000, body: 'coupe', fuel: 'petrol', label: 'Bentley 4.0L V8 / 6.0L W12 (3,996 cc)' },
  { re: /\brolls-?royce\b.*\b(cullinan|ghost|wraith|dawn|phantom)\b/i, cc: 6749, co2: 348, lp: 275000, body: 'sedan', fuel: 'petrol', label: 'Rolls-Royce 6.75L V12 (6,749 cc)' },
  { re: /\bnissan\b.*\bgt-?r\b/i, cc: 3799, co2: 275, lp: 96000, body: 'coupe', fuel: 'petrol', label: 'Nissan GT-R R35 3.8L V6 Twin-Turbo (3,799 cc)' },
  { re: /\bchevrolet\b.*\bcorvette\b/i, cc: 6162, co2: 277, lp: 78000, body: 'coupe', fuel: 'petrol', label: 'Chevrolet Corvette 6.2L V8 (6,162 cc)' },
  { re: /\bford\b.*\bmustang\s+gt\b/i, cc: 5038, co2: 270, lp: 46000, body: 'coupe', fuel: 'petrol', label: 'Ford Mustang GT 5.0L V8 (5,038 cc)' },

  // Popular European Passenger Cars, Hatchbacks, Sedans & SUVs
  { re: /\btoyota\b.*\byaris\s+cross\b/i, cc: 1490, co2: 101, lp: 19200, body: 'suv', fuel: 'hybrid', label: 'Toyota Yaris Cross 1.5L Hybrid (1,490 cc · 101 g/km)' },
  { re: /\btoyota\b.*\byaris\b.*\bgr\b|\bgr\s+yaris\b/i, cc: 1618, co2: 186, lp: 34500, body: 'hatchback', fuel: 'petrol', label: 'Toyota GR Yaris 1.6L Turbo (1,618 cc)' },
  { re: /\btoyota\b.*\byaris\b/i, cc: 1490, co2: 88, lp: 16400, body: 'hatchback', fuel: 'hybrid', label: 'Toyota Yaris 1.5L Hybrid (1,490 cc · 88 g/km)' },
  { re: /\btoyota\b.*\b(c-?hr|corolla)\b/i, cc: 1798, co2: 103, lp: 22800, body: 'suv', fuel: 'hybrid', label: 'Toyota C-HR / Corolla 1.8L Hybrid (1,798 cc · 103 g/km)' },
  { re: /\btoyota\b.*\brav\s*4\b/i, cc: 2487, co2: 126, lp: 31500, body: 'suv', fuel: 'hybrid', label: 'Toyota RAV4 2.5L Hybrid (2,487 cc · 126 g/km)' },
  { re: /\btoyota\b.*\baygo\b/i, cc: 998, co2: 109, lp: 12800, body: 'hatchback', fuel: 'petrol', label: 'Toyota Aygo / Aygo X 1.0L (998 cc)' },
  { re: /\bfiat\b.*\b500e\b/i, cc: 0, co2: 0, lp: 24500, body: 'hatchback', fuel: 'electric', label: 'Fiat 500e Pure Electric (0 g/km)' },
  { re: /\bfiat\b.*\b(500|panda)\b/i, cc: 999, co2: 106, lp: 13200, body: 'hatchback', fuel: 'mild_hybrid', label: 'Fiat 500 / Panda 1.0L Hybrid MHEV (999 cc)' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b.*\b(gti|r\b)\b/i, cc: 1984, co2: 168, lp: 33500, body: 'hatchback', fuel: 'petrol', label: 'VW Golf GTI / R 2.0L TSI (1,984 cc)' },
  { re: /\b(vw|volkswagen)\b.*\bgolf\b/i, cc: 1498, co2: 124, lp: 21500, body: 'hatchback', fuel: 'petrol', label: 'VW Golf 1.5 TSI / eTSI (1,498 cc)' },
  { re: /\b(vw|volkswagen)\b.*\b(polo|t-?cross|taigo)\b/i, cc: 999, co2: 118, lp: 16800, body: 'hatchback', fuel: 'petrol', label: 'VW Polo / T-Cross 1.0 TSI (999 cc)' },
  { re: /\b(vw|volkswagen)\b.*\b(tiguan|t-?roc|passat)\b/i, cc: 1498, co2: 142, lp: 27500, body: 'suv', fuel: 'petrol', label: 'VW Tiguan / T-Roc / Passat (1,498 cc)' },
  { re: /\b(vw|volkswagen)\b.*\btouareg\b/i, cc: 2967, co2: 208, lp: 58000, body: 'suv', fuel: 'diesel', label: 'VW Touareg 3.0 V6 TDI (2,967 cc)' },
  { re: /\bpeugeot\b.*\b(208|2008)\b/i, cc: 1199, co2: 115, lp: 17500, body: 'hatchback', fuel: 'petrol', label: 'Peugeot 208 / 2008 1.2 PureTech (1,199 cc)' },
  { re: /\bpeugeot\b.*\b(308|3008|5008)\b/i, cc: 1499, co2: 128, lp: 25800, body: 'suv', fuel: 'diesel', label: 'Peugeot 308 / 3008 / 5008 1.5 BlueHDi / 1.2 Hybrid' },
  { re: /\brenault\b.*\b(clio|captur)\b/i, cc: 999, co2: 114, lp: 16200, body: 'hatchback', fuel: 'petrol', label: 'Renault Clio / Captur 1.0 TCe (999 cc)' },
  { re: /\brenault\b.*\b(arkana|austral|kadjar|megane)\b/i, cc: 1332, co2: 126, lp: 23500, body: 'suv', fuel: 'mild_hybrid', label: 'Renault 1.3 TCe Mild Hybrid (1,332 cc)' },
  { re: /\bdacia\b.*\b(duster|sandero|jogger)\b/i, cc: 999, co2: 112, lp: 14800, body: 'suv', fuel: 'lpg_cng', label: 'Dacia Duster / Sandero 1.0 ECO-G LPG (999 cc)' },
  { re: /\bhyundai\b.*\b(i10|i20|bayon)\b/i, cc: 998, co2: 115, lp: 14500, body: 'hatchback', fuel: 'petrol', label: 'Hyundai i10 / i20 1.0 T-GDI (998 cc)' },
  { re: /\bhyundai\b.*\b(tucson|kona)\b/i, cc: 1598, co2: 132, lp: 24500, body: 'suv', fuel: 'hybrid', label: 'Hyundai Tucson / Kona 1.6 Hybrid (1,598 cc)' },
  { re: /\bkia\b.*\b(picanto|rio|stonic)\b/i, cc: 998, co2: 116, lp: 14200, body: 'hatchback', fuel: 'petrol', label: 'Kia Picanto / Rio / Stonic (998 cc)' },
  { re: /\bkia\b.*\b(sportage|niro|ceed|xceed)\b/i, cc: 1598, co2: 130, lp: 24200, body: 'suv', fuel: 'hybrid', label: 'Kia Sportage / Niro / XCeed 1.6 (1,598 cc)' },
  { re: /\bnissan\b.*\b(qashqai|juke|x-?trail)\b/i, cc: 1332, co2: 138, lp: 23800, body: 'suv', fuel: 'mild_hybrid', label: 'Nissan Qashqai / Juke 1.3 DIG-T MHEV (1,332 cc)' },
  { re: /\bford\b.*\b(fiesta|puma|focus|kuga)\b/i, cc: 999, co2: 120, lp: 18900, body: 'suv', fuel: 'mild_hybrid', label: 'Ford Fiesta / Puma / Focus 1.0 EcoBoost mHEV (999 cc)' },
  { re: /\bopel\b.*\b(corsa|mokka|astra|crossland|grandland)\b/i, cc: 1199, co2: 118, lp: 17400, body: 'hatchback', fuel: 'petrol', label: 'Opel Corsa / Mokka / Astra 1.2 Turbo (1,199 cc)' },
  { re: /\bskoda\b.*\b(fabia|kamiq|scala|octavia|karoq|kodiaq)\b/i, cc: 1498, co2: 126, lp: 20800, body: 'hatchback', fuel: 'petrol', label: 'Skoda 1.0 / 1.5 TSI (1,498 cc)' },
  { re: /\b(seat|cupra)\b.*\b(ibiza|arona|leon|ateca|formentor)\b/i, cc: 1498, co2: 134, lp: 23500, body: 'suv', fuel: 'petrol', label: 'SEAT / Cupra 1.5 TSI / eTSI (1,498 cc)' },
  { re: /\bvolvo\b.*\b(xc40|xc60|xc90)\b/i, cc: 1969, co2: 148, lp: 42500, body: 'suv', fuel: 'mild_hybrid', label: 'Volvo XC40 / XC60 / XC90 2.0L B4/B5 MHEV / T6/T8 PHEV (1,969 cc)' },
  { re: /\b(land\s+rover|range\s+rover)\b.*\b(evoque|velar|sport|defender)\b/i, cc: 1997, co2: 185, lp: 58000, body: 'suv', fuel: 'diesel', label: 'Range Rover / Land Rover 2.0L / 3.0L (1,997 cc)' },
  { re: /\bjeep\b.*\b(renegade|compass|avenger)\b/i, cc: 1332, co2: 134, lp: 22500, body: 'suv', fuel: 'hybrid', label: 'Jeep Renegade / Compass / Avenger (1,332 cc)' },
  { re: /\bjeep\b.*\bwrangler\b/i, cc: 1995, co2: 215, lp: 48000, body: 'suv', fuel: 'petrol', label: 'Jeep Wrangler 2.0L Turbo / 4xe (1,995 cc)' },
  { re: /\balfa\s+romeo\b.*\b(tonale|giulia|stelvio)\b/i, cc: 1995, co2: 162, lp: 38500, body: 'suv', fuel: 'petrol', label: 'Alfa Romeo Tonale / Giulia / Stelvio (1,995 cc)' },
  { re: /\bmini\b.*\b(cooper|countryman|clubman)\b/i, cc: 1499, co2: 130, lp: 22500, body: 'hatchback', fuel: 'petrol', label: 'MINI Cooper / Countryman 1.5L / 2.0L (1,499 cc)' },

  // Motorcycles & Scooters (Δ.Κ. 87.11 — Wholesale Price when new)
  { re: /\bhonda\b.*\b(pcx\s*125|sh\s*125)\b|\byamaha\b.*\b(nmax\s*125|xmax\s*125)\b|\bsym\b.*\b125\b|\bvespa\b.*\b125\b/i, category: 'motorcycle', cc: 125, co2: 52, lp: 2850, body: 'coupe', fuel: 'petrol', label: '125cc Scooter (Δ.Κ. 87.11 — 0% Exempt ≤125 cc)' },
  { re: /\bhonda\b.*\b(sh\s*150|pcx\s*150)\b|\bvespa\b.*\b150\b/i, category: 'motorcycle', cc: 150, co2: 58, lp: 3200, body: 'coupe', fuel: 'petrol', label: '150cc Scooter (Δ.Κ. 87.11 — 2% Bracket 126–249 cc)' },
  { re: /\bhonda\b.*\b(sh\s*350|forza\s*350|adv\s*350)\b|\byamaha\b.*\bxmax\s*300\b|\bvespa\b.*\bgts\s*300\b|\bbmw\b.*\bc\s*400\b/i, category: 'motorcycle', cc: 330, co2: 79, lp: 4950, body: 'coupe', fuel: 'petrol', label: '300–400cc Maxi-Scooter (Δ.Κ. 87.11 — 7% Bracket 250–900 cc)' },
  { re: /\byamaha\b.*\bt-?max\s*(500|530|560)?\b/i, category: 'motorcycle', cc: 562, co2: 112, lp: 9800, body: 'coupe', fuel: 'petrol', label: 'Yamaha TMAX 560 (Δ.Κ. 87.11 — 7% Bracket 250–900 cc)' },
  { re: /\bhonda\b.*\b(x-?adv|nc\s*750|transalp|hornet\s*750|cb\s*650|cbr\s*650)\b|\byamaha\b.*\b(mt-?07|tenere\s*700|ténéré\s*700|tracer\s*7|r7|yzf-?r6)\b|\bsuzuki\b.*\b(v-?strom\s*650|v-?strom\s*800|sv\s*650|gsx-?8s)\b|\bkawasaki\b.*\b(z\s*650|ninja\s*650|versys\s*650)\b/i, category: 'motorcycle', cc: 689, co2: 100, lp: 6800, body: 'coupe', fuel: 'petrol', label: 'Middleweight Motorcycle 650–800cc (Δ.Κ. 87.11 — 7% Bracket 250–900 cc)' },
  { re: /\byamaha\b.*\b(mt-?09|tracer\s*9)\b|\bktm\b.*\b(790|890)\b|\bbmw\b.*\b(f\s*750\s*gs|f\s*800\s*gs|f\s*850\s*gs|f\s*900)\b|\btriumph\b.*\b(tiger\s*850|tiger\s*900|street\s*triple)\b|\bducati\b.*\b(monster|hypermotard|multistrada\s*v2|panigale\s*v2|scrambler\s*800)\b/i, category: 'motorcycle', cc: 890, co2: 115, lp: 9600, body: 'coupe', fuel: 'petrol', label: '800–900cc Motorcycle (Δ.Κ. 87.11 — 7% Bracket 250–900 cc)' },
  { re: /\bhonda\b.*\b(africa\s+twin|crf\s*1000|crf\s*1100|cbr\s*1000|cb\s*1000)\b|\byamaha\b.*\b(mt-?10|yzf-?r1|r1\b)\b|\bkawasaki\b.*\b(z\s*900|z\s*1000|ninja\s*1000|versys\s*1000|zx-?10r)\b|\bsuzuki\b.*\b(gsx-?r\s*1000|gsx-?s\s*1000|v-?strom\s*1050|hayabusa)\b|\bducati\b.*\b(panigale\s*v4|multistrada\s*v4|streetfighter\s*v4|diavel)\b|\bktm\b.*\b(1290|1390)\b/i, category: 'motorcycle', cc: 1103, co2: 145, lp: 15200, body: 'coupe', fuel: 'petrol', label: '1,000–1,400cc Superbike / Adventure (Δ.Κ. 87.11 — 12% Bracket 901–1400 cc)' },
  { re: /\bharley-?davidson\b|\bindian\b.*\b(chief|challenger|roadmaster)\b|\bhonda\b.*\bgoldwing\b|\bbmw\b.*\br\s*18\b|\btriumph\b.*\brocket\s*3\b/i, category: 'motorcycle', cc: 1868, co2: 148, lp: 18500, body: 'coupe', fuel: 'petrol', label: 'Heavy Cruiser >1,800cc (Δ.Κ. 87.11 — 25% Bracket >1,800 cc)' },

  // ATVs, Quads, Buggies & Microcars (Κανονισμός 168/2013 L-Cat)
  { re: /\b(citro[eë]n\s+ami|fiat\s+topolino|mobilize\s+duo|microlino)\b/i, category: 'quadricycle', cc: 0, co2: 0, lp: 7200, body: 'suv', fuel: 'electric', label: 'Electric Microcar L6e/L7e (0% Registration Tax)' },
  { re: /\b(aixam|ligier|microcar|chatenet)\b/i, category: 'quadricycle', cc: 479, co2: 80, lp: 10800, body: 'suv', fuel: 'diesel', label: 'Diesel Light Quadricycle L6e (479 cc — 4% Bracket 50–500 cc)' },
  { re: /\b(cfmoto|cf\s*moto)\b.*\b(450|520)\b|\byamaha\b.*\bkodiak\s*450\b|\bhonda\b.*\btrx\s*420\b/i, category: 'quadricycle', cc: 495, co2: 145, lp: 5600, body: 'suv', fuel: 'petrol', label: 'ATV 450–500cc (4% L-Cat Bracket 50–500 cc)' },
  { re: /\b(cfmoto|cf\s*moto)\b.*\b(625|850)\b|\byamaha\b.*\b(grizzly\s*700|raptor\s*700)\b|\bpolaris\b.*\bsportsman\s*(570|850)\b|\bcan-?am\b.*\boutlander\s*(650|850)\b/i, category: 'quadricycle', cc: 700, co2: 165, lp: 8800, body: 'suv', fuel: 'petrol', label: 'ATV 501–900cc (7% L-Cat Bracket 501–900 cc)' },
  { re: /\b(cfmoto|cf\s*moto)\b.*\b1000\b|\bcan-?am\b.*\b(maverick|outlander\s*1000|renegade\s*1000)\b|\bpolaris\b.*\b(rzr|sportsman\s*1000|scrambler\s*1000)\b/i, category: 'quadricycle', cc: 976, co2: 185, lp: 14500, body: 'suv', fuel: 'petrol', label: 'ATV / SSV >900cc (11% L-Cat Bracket ≥901 cc)' },

  // Commercial Vans ≤3.5t, Pickups, Heavy Trucks, Buses & Motorhomes
  { re: /\b(isuzu\s+d-?max|nissan\s+navara|mitsubishi\s+l200)\b/i, category: 'truck_double_cab', cc: 1898, co2: 195, lp: 31500, body: 'suv', fuel: 'diesel', label: 'Double-Cab Pickup ≤3.5t (8% Base Rate — Άρθ. 139 §1ε)' },
  { re: /\b(mercedes|mercedes-benz)\b.*\bsprinter\b|\bvw\b.*\bcrafter\b|\bford\b.*\btransit\s+350\b|\biveco\b.*\bdaily\s+35\b|\bfiat\b.*\bducato\s+kasten\b/i, category: 'truck_van_closed', cc: 1995, co2: 198, lp: 33500, body: 'mpv', fuel: 'diesel', label: 'Closed Panel Van ≤3.5t (10% Base Rate — Άρθ. 139 §1γ)' },
  { re: /\b(mercedes|mercedes-benz)\b.*\bvito\s+kasten\b|\bvw\b.*\btransporter\b|\bford\b.*\btransit\s+custom\b|\bpeugeot\b.*\bexpert\b|\brenault\b.*\btrafic\s+furgon\b|\bopel\b.*\bvivaro\b/i, category: 'truck_van_closed', cc: 1995, co2: 182, lp: 28500, body: 'mpv', fuel: 'diesel', label: 'Mid-Size Closed Van ≤3.5t (10% Base Rate — Άρθ. 139 §1γ)' },
  { re: /\bvw\b.*\bcaddy\s+(?:cargo|kasten)\b|\bford\b.*\btransit\s+connect\b|\bpeugeot\b.*\bpartner\s+cargo\b|\brenault\b.*\bkangoo\s+rapid\b|\bcitro[eë]n\b.*\bberlingo\s+van\b/i, category: 'truck_van_closed', cc: 1499, co2: 138, lp: 20500, body: 'mpv', fuel: 'diesel', label: 'Compact Closed Van ≤3.5t (10% Base Rate — Άρθ. 139 §1γ)' },
  { re: /\b(hymer|knaus|weinsberg|adria\s+twin|pössl|carado|bürstner|dethleffs|chausson|rapido|laika)\b/i, category: 'motorhome', cc: 2184, co2: 215, lp: 54000, body: 'mpv', fuel: 'diesel', label: 'Motorhome / Camper Van (75% Statutory Exemption — Άρθ. 136 §3γ & §7)' },
  { re: /\b(actros|scania\s+[rgsp]\s*\d{3}|volvo\s+fh|man\s+tgx|daf\s+xf|daf\s+xg|iveco\s+s-way)\b/i, category: 'truck_heavy', cc: 12800, co2: 0, lp: 85000, body: 'suv', fuel: 'diesel', gvwKg: 18000, label: 'Heavy Truck / Tractor >3.5t (5% on CIF/Invoice — Άρθ. 139 §1α & §4)' },
  { re: /\b(setra\b|tourismo|travego|irizar|neoplan|lion'?s\s+coach)\b/i, category: 'bus', cc: 10677, co2: 0, lp: 165000, body: 'mpv', fuel: 'diesel', seats: 52, label: 'Touring Coach >9 Seats (Δ.Κ. 87.02 — 1-Yr Road Tax — Άρθ. 141 §1)' },
];

/**
 * Extracts engine displacement in cc from free text (e.g. "2.0 TDI", "1.5 TSI", "125cc", "2998 ccm",
 * BMW 320d/530i/X5 40i, Mercedes C 220 d / E 300 / G 63, Audi 35 TFSI / 40 TDI / 55 TFSI).
 */
export function inferDisplacementCcFromText(text = '', category = 'passenger') {
  const s = String(text);

  // Rotary Wankel 2x statutory rule (ν. 5222/2025 Άρθρο 143)
  if (/\b(rx-?8|rx-?7|wankel)\b/i.test(s)) {
    return 2616;
  }

  // 1. Explicit integer cc / ccm (e.g., "1499 ccm", "1.998 cc", "125cc", "2993 cm3")
  const ccMatch = s.match(/\b([1-9]\.\d{3}|\d{2,4})\s*(?:ccm|cc|cm3|cm³|κ\.?ε\.?)\b/i);
  if (ccMatch) {
    const val = Number(ccMatch[1].replace(/\./g, ''));
    if (val >= 49 && val <= 16500) return val;
  }

  // 2. Explicit litre notation (e.g. "1.0 TSI", "1.2 PureTech", "1.4 TFSI", "1.5 dCi", "1.6 TDI", "2.0 BiTDI", "3.0 V6", "4.0 V8", "5.2 V10", "6.5 V12")
  const litreMatch = s.match(/\b([0-8][.,]\d)\s*(?:l\b|λιτρ|tsi|tfsi|tdi|cdi|dci|hdi|bluehdi|puretech|ecoboost|tce|mhev|hybrid|phev|v6|v8|v10|v12|bi-?turbo|twin-?turbo|i\b|d\b)/i);
  if (litreMatch) {
    const litres = Number(litreMatch[1].replace(',', '.'));
    const map = {
      0.9: 898, 1.0: 999, 1.2: 1199, 1.3: 1332, 1.4: 1395, 1.5: 1498, 1.6: 1598,
      1.8: 1798, 1.9: 1896, 2.0: 1995, 2.2: 2184, 2.3: 2261, 2.4: 2387, 2.5: 2487,
      2.7: 2698, 2.8: 2776, 2.9: 2894, 3.0: 2995, 3.2: 3192, 3.5: 3498, 3.6: 3598,
      3.8: 3799, 4.0: 3996, 4.2: 4163, 4.4: 4395, 4.7: 4691, 5.0: 5000, 5.2: 5204,
      5.5: 5461, 6.0: 5998, 6.2: 6162, 6.3: 6208, 6.5: 6498, 6.6: 6592, 6.8: 6749,
    };
    const rounded = Number(litres.toFixed(1));
    if (map[rounded]) return map[rounded];
    if (litres >= 0.5 && litres <= 8.5) return Math.round(litres * 1000);
  }

  // 3. Audi 2-digit power badges (25/30/35/40/45/50/55/60 TFSI/TDI)
  const audiBadge = s.match(/\b(25|30|35|40|45|50|55|60)\s*(tfsi|tdi)\b/i);
  if (audiBadge) {
    const num = Number(audiBadge[1]);
    if (num <= 30) return 999;
    if (num === 35) return /tdi/i.test(audiBadge[2]) ? 1968 : 1498;
    if (num === 40 || num === 45) return 1984;
    if (num === 50 || num === 55) return 2995;
    if (num === 60) return 3996;
  }

  // 4. BMW 3-digit / X-series badges (116i, 118i, 120d, 318i, 320d, 330i, 330e, 340i, 520d, 530d, 540i, M550i, X1/X3/X5 xDrive20d/30d/40i/M50i)
  if (/\bbmw\b/i.test(s) && category !== 'motorcycle') {
    if (/\b(?:116|118|216|218|318|x1\s*(?:sdrive|xdrive)?18|x2\s*(?:sdrive|xdrive)?18)[id]?\b/i.test(s)) return 1499;
    if (/\b(?:120|125|128|220|225|230|320|325|328|330|420|425|428|430|520|525|530|x1\s*(?:sdrive|xdrive)?2[035]|x3\s*(?:sdrive|xdrive)?(?:20|30)|x4\s*xdrive(?:20|30)|z4\s*sdrive(?:20|30))[ide]?\b/i.test(s)) return 1998;
    if (/\b(?:m135|m235)\b/i.test(s)) return 1998;
    if (/\b(?:m140|m240|m340|m440|335|340|435|440|535|540|640|730|740|745|840|x3\s*m40|x4\s*m40|x5\s*xdrive(?:30|40|45)|x6\s*xdrive(?:30|40)|x7\s*xdrive40|z4\s*m40)[ide]?\b/i.test(s)) return 2998;
    if (/\b(?:550|m550|650|750|m760|850|m850|x5\s*m50|x5\s*m60|x6\s*m50|x7\s*m50|x7\s*m60|xm\b)[id]?\b/i.test(s)) return 4395;
  }

  // 5. Mercedes-Benz alphanumeric classes (A/B/C/E/S/CLA/GLA/GLB/GLC/GLE/GLS 160/180/200/220/250/300/350/400/450/500/580/63)
  if (/\b(mercedes|mercedes-benz|amg)\b/i.test(s)) {
    if (/\b(?:a|b|cla|gla|glb)\s*(?:160|180|200)\b/i.test(s) && !/\bd\b|cdi/i.test(s)) return 1332;
    if (/\b(?:c|e)\s*(?:180|200)\b/i.test(s) && !/\bd\b|cdi/i.test(s)) return 1496;
    if (/\b(?:a|b|c|e|cla|gla|glb|glc|gle)\s*(?:200\s*d|220\s*d?|250\s*d?|300\s*[de]?)\b/i.test(s)) return 1993;
    if (/\b(?:c|e|s|cls|glc|gle|gls|g)\s*(?:350|400|450|43|53)\b/i.test(s)) return 2999;
    if (/\b(?:s|gle|gls|g|gt|sl)\s*(?:500|560|580|63)\b/i.test(s)) return 3982;
  }

  // 6. Motorcycle model numbers (e.g., "MT-07", "CBR 600", "R 1250 GS", "Duke 390", "SH 300")
  if (category === 'motorcycle') {
    const motoNum = s.match(/\b(50|110|125|150|200|250|300|310|350|390|400|450|500|530|560|600|650|660|690|700|750|790|800|850|890|900|950|1000|1050|1100|1200|1250|1290|1300|1400|1600|1800)\b/);
    if (motoNum) return Number(motoNum[1]);
  }

  return null;
}

/**
 * Infers universal vehicle specifications from title/query/variant text when explicit metadata is absent.
 */
export function inferUniversalSpecsFromText(text = '', regYear = 2020, category = 'passenger', fuel = 'petrol') {
  const s = String(text);
  for (const spec of EXPLICIT_MAKE_MODEL_SPECS) {
    if (spec.re.test(s)) {
      return {
        cc: spec.cc,
        co2: spec.co2,
        listPriceEur: spec.lp,
        body: spec.body,
        fuel: spec.fuel || fuel,
        category: spec.category || category,
        gvwKg: spec.gvwKg,
        seats: spec.seats,
        wankel: Boolean(spec.wankel),
        label: spec.label,
      };
    }
  }

  const inferredCc = inferDisplacementCcFromText(s, category);
  return {
    cc: inferredCc,
    co2: null,
    listPriceEur: null,
    body: null,
    fuel: null,
    category: null,
    wankel: /\b(rx-?8|rx-?7|wankel)\b/i.test(s),
    label: null,
  };
}
