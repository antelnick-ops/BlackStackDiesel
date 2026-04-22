require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const APG_VENDOR_ID = '013cd9a7-171e-45fe-9421-0320319dce33';
const FEED_PATH = path.join(process.cwd(), 'tmp', 'premier_data_feed_master.csv');
const IMPORT_LIMIT = 0; // 0 = no limit
const DRY_RUN = false;   // set false to actually write to Supabase

// ---------- DIESEL FILTER ----------
const DIESEL_ENGINE_SIGNATURES = [
  // Cummins
  /\bcummins\b/i, /\b5\.?9l?\b/i, /\b6\.?7l?\b.*cummins/i, /\b12v\b/i, /\b24v\b/i,
  // Power Stroke / Ford
  /\bpower.?stroke\b/i, /\bpowerstroke\b/i, /\b7\.?3l?\b/i, /\b6\.?0l?\b/i, /\b6\.?4l?\b/i,
  /\b6\.?9l?\b/i, /\b6\.?7l?\b.*ford/i, /\bIDI\b/,
  // Duramax
  /\bduramax\b/i, /\b6\.?6l?\b/i, /\bLB7\b/i, /\bLLY\b/i, /\bLBZ\b/i, /\bLMM\b/i, /\bLML\b/i, /\bL5P\b/i,
  // Generic diesel
  /\bdiesel\b/i, /\bturbo.?diesel\b/i
];

const DIESEL_TRUCK_MODELS = [
  /\bF-?250\b/i, /\bF-?350\b/i, /\bF-?450\b/i, /\bF-?550\b/i, /\bsuper.?duty\b/i, /\bexcursion\b/i,
  /\bram\s*2500\b/i, /\bram\s*3500\b/i, /\bram\s*4500\b/i, /\bram\s*5500\b/i,
  /\bsilverado\s*2500\b/i, /\bsilverado\s*3500\b/i,
  /\bsierra\s*2500\b/i, /\bsierra\s*3500\b/i,
  /\bE-?series\b/i, /\bsprinter\b/i
];

// Universal categories relevant to diesel owners (included even without engine match)
const UNIVERSAL_CATEGORIES = new Set([
  'Accessories and Fluids',
  'Tools and Equipment',
  'Chemicals',
  'Apparel',
  'Hardware',
  'Shop Supplies',
  'Electrical Lighting and Body',
  'Tire and Wheel',
  'Fluids, Cleaners, Chemicals',
  'Garage Equipment',
  'Recovery'
]);

// Hard exclusions — not relevant to diesel truck owners
const EXCLUDE_PATTERNS = [
  // Japanese passenger cars
  /\bHonda\b/i, /\bToyota\b/i, /\bNissan\b/i, /\bSubaru\b/i, /\bHyundai\b/i, /\bKia\b/i,
  /\bMazda\b/i, /\bLexus\b/i, /\bAcura\b/i, /\bInfiniti\b/i, /\bMitsubishi\b/i,
  // Euro passenger cars (NOT including Sprinter - handled separately below)
  /\bBMW\b/i, /\bAudi\b/i, /\bVolkswagen\b/i, /\s+VW\s+/i, /\bPorsche\b/i,
  /\bMercedes-Benz\b/i, /\bJaguar\b/i, /\bLand\s*Rover\b/i, /\bRange\s*Rover\b/i,
  /\bMini\s*Cooper\b/i, /\bFiat\b/i, /\bVolvo\b/i, /\bSaab\b/i,
  // Euro car models (catch by name even without make mention)
  /\bGolf\b/i, /\bJetta\b/i, /\bPassat\b/i, /\bTouareg\b/i, /\bAmarok\b/i, /\bBeetle\b/i,
  /\bCayenne\b/i, /\bMacan\b/i, /\bPanamera\b/i, /\bE-?Class\b/i, /\bC-?Class\b/i,
  // Light-duty gas trucks (NOT diesel HD trucks)
  /\bRanger\b/i, /\bS-?10\b/i, /\bColorado\b/i, /\bCanyon\b/i, /\bDakota\b/i,
  /\bFrontier\b/i, /\bTacoma\b/i, /\bTundra\b/i, /\bTitan\b/i, /\bRidgeline\b/i,
  // Power sports (not diesel trucks)
  /\bmotorcycle\b/i, /\bATV\b/i, /\bUTV\b/i, /\bsnowmobile\b/i, /\bside-?by-?side\b/i
];

// ---------- HELPERS ----------
function clean(value) {
  if (value === null || value === undefined) return null;
  let v = String(value).trim();
  // Strip wrapping double quotes (APG feed artifact)
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    v = v.slice(1, -1).trim();
  }
  return v.length ? v : null;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().replace(/[$,]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toInt(value) {
  const n = toNumber(value);
  return n === null ? 0 : Math.max(0, Math.floor(n));
}

function roundMoney(n) {
  return Number(Number(n).toFixed(2));
}

function totalStock(row) {
  return toInt(row['NV whse']) + toInt(row['KY whse']) + toInt(row['WA whse']) + toInt(row['MFG Invt']);
}

function pickPrice(row) {
  const map = toNumber(row['MAP']);
  const retail = toNumber(row['Retail']);
  const customerPrice = toNumber(row['Customer Price']);
  const jobber = toNumber(row['Jobber']);
  if (map && map > 0) return roundMoney(map);
  if (retail && retail > 0) return roundMoney(retail);
  if (customerPrice && customerPrice > 0) return roundMoney(customerPrice);
  if (jobber && jobber > 0) return roundMoney(jobber * 1.3);
  return 0;
}

function productStatus(row, stockQty) {
  const inventoryStatus = clean(row['Inventory Status'])?.toLowerCase() || '';
  if (inventoryStatus.includes('discontinued')) return 'archived';
  if (stockQty <= 0) return 'out_of_stock';
  return 'active';
}

function matchesAnyPattern(text, patterns) {
  if (!text) return false;
  return patterns.some(p => p.test(text));
}

// Sprinter is a diesel workhorse, but gas Sprinter parts exist too.
// Only keep Sprinter parts that explicitly mention diesel or a Mercedes OM engine.
const SPRINTER_KEYWORDS = [/\bsprinter\b/i, /\bOM642\b/i, /\bOM651\b/i, /\bOM654\b/i];
const DIESEL_MENTION = /\bdiesel\b|\bOM6[45]\d\b|\bCDI\b|\bBlueTEC\b/i;

function isSprinterWithoutDiesel(text) {
  if (!text) return false;
  const mentionsSprinter = SPRINTER_KEYWORDS.some(p => p.test(text));
  if (!mentionsSprinter) return false;
  return !DIESEL_MENTION.test(text);
}

// ---------- FITMENT PARSER ----------
function parseFitment(productName, description) {
  const text = [productName, description].filter(Boolean).join(' ');
  const makes = new Set();
  const engines = new Set();
  const years = new Set();

  // Makes
  if (/\bford\b/i.test(text) || /\bf-?[234]50\b/i.test(text) || /\bexcursion\b/i.test(text)) makes.add('Ford');
  if (/\bram\b/i.test(text)) makes.add('Ram');
  if (/\bdodge\b/i.test(text)) makes.add('Dodge');
  if (/\bchevrolet\b/i.test(text) || /\bchevy\b/i.test(text) || /\bsilverado\b/i.test(text)) makes.add('Chevrolet');
  if (/\bgmc\b/i.test(text) || /\bsierra\b/i.test(text)) makes.add('GMC');

  // Engines
  if (/\b7\.?3l?\b/i.test(text) && (/\bpower.?stroke\b/i.test(text) || /\bford\b/i.test(text) || /\bIDI\b/.test(text))) {
    if (/\bIDI\b/.test(text)) engines.add('7.3L IDI Turbo Diesel');
    else engines.add('7.3L Power Stroke');
  }
  if (/\b6\.?0l?\b/i.test(text) && /\bpower.?stroke\b/i.test(text)) engines.add('6.0L Power Stroke');
  if (/\b6\.?4l?\b/i.test(text) && /\bpower.?stroke\b/i.test(text)) engines.add('6.4L Power Stroke');
  if (/\b6\.?7l?\b/i.test(text) && /\bpower.?stroke\b/i.test(text)) engines.add('6.7L Power Stroke');
  if (/\b5\.?9l?\b/i.test(text) && /\bcummins\b/i.test(text)) {
    if (/\b12v\b/i.test(text) || /\b1994\b|\b1995\b|\b1996\b|\b1997\b|\b1998\b/.test(text)) engines.add('5.9L 12V Cummins');
    else engines.add('5.9L 24V Cummins ISB');
  }
  if (/\b6\.?7l?\b/i.test(text) && /\bcummins\b/i.test(text)) engines.add('6.7L Cummins ISB');
  if (/\bLB7\b/i.test(text)) engines.add('6.6L Duramax LB7');
  if (/\bLLY\b/i.test(text)) engines.add('6.6L Duramax LLY');
  if (/\bLBZ\b/i.test(text)) engines.add('6.6L Duramax LBZ');
  if (/\bLMM\b/i.test(text)) engines.add('6.6L Duramax LMM');
  if (/\bLML\b/i.test(text)) engines.add('6.6L Duramax LML');
  if (/\bL5P\b/i.test(text)) engines.add('6.6L Duramax L5P');

  // Four-digit years 1990-2026
  const fourDigitMatches = text.matchAll(/\b(19[89]\d|20[0-2]\d)\b/g);
  for (const m of fourDigitMatches) {
    const y = parseInt(m[1], 10);
    if (y >= 1990 && y <= 2026) years.add(y);
  }

  // Two-digit ranges like "99-03" or "08-10"
  const rangeMatches = text.matchAll(/\b(\d{2})-(\d{2})\b/g);
  for (const m of rangeMatches) {
    let start = parseInt(m[1], 10);
    let end = parseInt(m[2], 10);
    start = start >= 90 ? 1900 + start : 2000 + start;
    end = end >= 90 ? 1900 + end : 2000 + end;
    if (start >= 1990 && end <= 2026 && end - start < 30) {
      for (let y = start; y <= end; y++) years.add(y);
    }
  }

  return {
    makes: Array.from(makes),
    engines: Array.from(engines),
    years: Array.from(years).sort((a, b) => a - b)
  };
}

// ---------- IMPORT FILTER ----------
function shouldImport(row) {
  const sku = clean(row['Premier Part Number']);
  const productName = clean(row['Long Description']);
  const category = clean(row['Part Category']);
  const subcategory = clean(row['Part Subcategory']);
  const terminology = clean(row['Part Terminology']);
  const approvedLine = clean(row['Approved Line']);

  if (!sku || !productName) return false;
  if (approvedLine && approvedLine.toLowerCase() === 'no') return false;

  const fullText = [productName, category, subcategory, terminology].filter(Boolean).join(' ');

  // Hard exclusions apply EVERYWHERE, including universal categories
  if (matchesAnyPattern(fullText, EXCLUDE_PATTERNS)) return false;

  // Sprinter: only keep if it explicitly mentions diesel
  if (isSprinterWithoutDiesel(fullText)) return false;

  // Universal categories - include if it survived exclusions
  if (category && UNIVERSAL_CATEGORIES.has(category)) return true;

  // Otherwise must mention a diesel engine or HD diesel truck model
  if (matchesAnyPattern(fullText, DIESEL_ENGINE_SIGNATURES)) return true;
  if (matchesAnyPattern(fullText, DIESEL_TRUCK_MODELS)) return true;

  return false;
}

function buildDescription(row) {
  const external = clean(row['External Long Description']);
  const longDesc = clean(row['Long Description']);
  const category = clean(row['Part Category']);
  const subcategory = clean(row['Part Subcategory']);
  const terminology = clean(row['Part Terminology']);
  const brand = clean(row['Brand']);
  const mfgPart = clean(row['Mfg Part Number']);
  const upc = clean(row['Upc']);

  return [
    external,
    !external ? longDesc : null,
    brand ? `Brand: ${brand}` : null,
    mfgPart ? `MFG Part #: ${mfgPart}` : null,
    upc ? `UPC: ${upc}` : null,
    category ? `Category: ${category}` : null,
    subcategory ? `Subcategory: ${subcategory}` : null,
    terminology ? `Type: ${terminology}` : null
  ].filter(Boolean).join('\n');
}

function mapRow(row) {
  const sku = clean(row['Premier Part Number']);
  const productName = clean(row['Long Description']) || sku;
  const brand = clean(row['Brand']);
  const stockQty = totalStock(row);
  const weight = toNumber(row['Weight']);
  const shippingCost = roundMoney((toNumber(row['Freight Cost']) || 0) + (toNumber(row['Drop Ship Fee']) || 0));
  const price = pickPrice(row);
  const status = productStatus(row, stockQty);
  const description = buildDescription(row);

  const fitment = parseFitment(productName, description);

  const fitmentText = [
    clean(row['Part Category']),
    clean(row['Part Subcategory']),
    clean(row['Part Terminology'])
  ].filter(Boolean).join(' | ') || null;

  return {
    vendor_id: APG_VENDOR_ID,
    product_name: productName,
    sku,
    brand,
    price,
    shipping_cost: shippingCost,
    stock_qty: stockQty,
    category: clean(row['Part Category']),
    condition: 'new',
    fitment_text: fitmentText,
    fitment_makes: fitment.makes,
    fitment_engines: fitment.engines,
    fitment_years: fitment.years,
    description,
    image_url: clean(row['ImageURL']),
    weight_lbs: weight,
    source: 'distributor',
    source_ref: sku,
    status
  };
}

// ---------- MAIN ----------
async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  }
  if (!fs.existsSync(FEED_PATH)) {
    throw new Error(`Feed file not found: ${FEED_PATH}`);
  }

  console.log('Reading feed...');
  const csvText = fs.readFileSync(FEED_PATH, 'utf8');

  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true,
    quote: false
  });

  console.log(`Parsed ${rows.length} rows from feed`);

  const filtered = rows.filter(shouldImport);
  console.log(`${filtered.length} rows pass diesel filter (${((filtered.length / rows.length) * 100).toFixed(1)}%)`);

  const limited = IMPORT_LIMIT > 0 ? filtered.slice(0, IMPORT_LIMIT) : filtered;
  const mapped = limited.map(mapRow);

  // Fitment parse stats
  const withMakes = mapped.filter(m => m.fitment_makes.length > 0).length;
  const withEngines = mapped.filter(m => m.fitment_engines.length > 0).length;
  const withYears = mapped.filter(m => m.fitment_years.length > 0).length;
  console.log(`Fitment parsed: ${withMakes} with makes, ${withEngines} with engines, ${withYears} with years`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — no writes to Supabase.');
    console.log('First 3 mapped rows:');
    console.log(JSON.stringify(mapped.slice(0, 3), null, 2));
    console.log(`\nWould import ${mapped.length} products. Set DRY_RUN=false at top of file to actually write.`);
    return;
  }

  console.log(`Prepared ${mapped.length} rows for import`);
  const chunkSize = 500;

  for (let i = 0; i < mapped.length; i += chunkSize) {
    const chunk = mapped.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'vendor_id,sku' });

    if (error) {
      console.error('Upsert failed on chunk starting at row', i, error);
      throw error;
    }

    console.log(`Upserted ${Math.min(i + chunk.length, mapped.length)} / ${mapped.length}`);
  }

  console.log('✅ APG import complete');
}

main().catch((err) => {
  console.error('❌ Import failed:', err.message);
  process.exit(1);
});