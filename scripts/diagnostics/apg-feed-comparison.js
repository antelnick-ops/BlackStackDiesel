require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const AdmZip = require('adm-zip');
const { parse } = require('csv-parse');

const TMP = path.join(process.cwd(), 'tmp');
const OUT_PATH = path.join(TMP, 'apg-feed-comparison.json');
const FILES = [
  { remote: 'ItemExport.zip', label: 'itemExport' },
  { remote: 'premier_data_feed_master.zip', label: 'masterFeed' }
];

async function ensureDownloaded(remoteName) {
  const localPath = path.join(TMP, remoteName);
  if (fs.existsSync(localPath)) {
    const sz = fs.statSync(localPath).size;
    console.log(`  ✓ ${remoteName} already present (${sz.toLocaleString()} bytes)`);
    return localPath;
  }
  console.log(`  Downloading ${remoteName} from FTP...`);
  const client = new ftp.Client();
  try {
    await client.access({
      host: process.env.APG_FTP_HOST,
      user: process.env.APG_FTP_USER,
      password: process.env.APG_FTP_PASSWORD,
      port: Number(process.env.APG_FTP_PORT || 21),
      secure: false
    });
    await client.downloadTo(localPath, remoteName);
  } finally {
    client.close();
  }
  console.log(`  ✓ Downloaded ${remoteName} (${fs.statSync(localPath).size.toLocaleString()} bytes)`);
  return localPath;
}

function extractCsv(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const csvEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.csv'));
  if (!csvEntry) {
    throw new Error(`No CSV entry in ${path.basename(zipPath)}; entries: ${entries.map((e) => e.entryName).join(', ')}`);
  }
  const csvName = path.basename(csvEntry.entryName);
  const csvPath = path.join(TMP, csvName);
  const expectedSize = csvEntry.header.size;

  if (fs.existsSync(csvPath) && fs.statSync(csvPath).size === expectedSize) {
    console.log(`  ✓ ${csvName} already extracted (${expectedSize.toLocaleString()} bytes)`);
  } else {
    console.log(`  Extracting ${csvName} (${expectedSize.toLocaleString()} bytes)...`);
    zip.extractEntryTo(csvEntry, TMP, false, true);
  }
  return { csvPath, csvName, uncompressedSize: expectedSize };
}

function findSkuColumn(headers) {
  const exact = [
    'Premier Part Number', 'Item Number', 'Part Number', 'SKU',
    'Part #', 'PartNumber', 'PartNo', 'ItemNumber', 'ItemID',
    'Mfg Part Number'
  ];
  for (const c of exact) {
    if (headers.includes(c)) return c;
  }
  for (const h of headers) {
    if (/^(sku|part\s*#|part\s*number|item\s*number)$/i.test(h)) return h;
  }
  for (const h of headers) {
    if (/sku|part\s*number|item\s*number/i.test(h)) return h;
  }
  return null;
}

function sniffDelimiter(csvPath) {
  // Read enough bytes to capture the header line, then count common
  // delimiter chars. Whichever appears most in the first line wins.
  const fd = fs.openSync(csvPath, 'r');
  try {
    const buf = Buffer.alloc(8192);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    const text = buf.slice(0, n).toString('utf8');
    const nlIdx = text.indexOf('\n');
    const headerLine = nlIdx >= 0 ? text.slice(0, nlIdx) : text;
    const counts = {
      ',': (headerLine.match(/,/g) || []).length,
      '|': (headerLine.match(/\|/g) || []).length,
      '\t': (headerLine.match(/\t/g) || []).length,
      ';': (headerLine.match(/;/g) || []).length
    };
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { delimiter: best[1] > 0 ? best[0] : ',', counts };
  } finally {
    fs.closeSync(fd);
  }
}

async function analyzeCsv(csvPath, label) {
  console.log(`\n  --- ${label}: ${path.basename(csvPath)} ---`);
  const t0 = Date.now();

  const { delimiter, counts } = sniffDelimiter(csvPath);
  const printableDelim = delimiter === '\t' ? '\\t' : delimiter;
  console.log(`  delimiter='${printableDelim}' (header counts: ${JSON.stringify(counts)})`);

  const stream = fs.createReadStream(csvPath);
  const parser = parse({
    columns: true,
    delimiter,
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    quote: false
  });
  stream.pipe(parser);

  let headers = null;
  let count = 0;
  let firstRow = null;
  let lastRow = null;
  const checkpoints = [];
  let skuCol = null;
  const skus = new Set();

  for await (const row of parser) {
    if (!headers) {
      headers = Object.keys(row);
      skuCol = findSkuColumn(headers);
      firstRow = row;
    }
    if (skuCol) {
      const sku = row[skuCol];
      if (sku) skus.add(String(sku).trim());
    }
    if (count % 1000 === 0) checkpoints.push({ idx: count, row });
    lastRow = row;
    count++;
  }

  const middleIdx = Math.floor(count / 2);
  let middleRow = checkpoints[0]?.row || null;
  let bestDelta = Infinity;
  for (const cp of checkpoints) {
    const d = Math.abs(cp.idx - middleIdx);
    if (d < bestDelta) {
      bestDelta = d;
      middleRow = cp.row;
    }
  }

  const elapsedMs = Date.now() - t0;
  console.log(`  ${count.toLocaleString()} rows | ${headers.length} cols | ${skus.size.toLocaleString()} unique SKUs (col='${skuCol}') | ${(elapsedMs / 1000).toFixed(1)}s`);

  return {
    fileName: path.basename(csvPath),
    rowCount: count,
    columnCount: headers.length,
    columns: headers,
    skuColumn: skuCol,
    skuCount: skus.size,
    skus,
    sampleRows: { first: firstRow, middle: middleRow, last: lastRow }
  };
}

function truncateRow(row, maxFieldLen = 200) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && v.length > maxFieldLen) {
      out[k] = v.slice(0, maxFieldLen) + '…';
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function main() {
  if (!process.env.APG_FTP_HOST || !process.env.APG_FTP_USER || !process.env.APG_FTP_PASSWORD) {
    throw new Error('Missing APG_FTP_HOST / APG_FTP_USER / APG_FTP_PASSWORD in .env.local');
  }
  fs.mkdirSync(TMP, { recursive: true });

  console.log('=== APG feed comparison ===\n');
  console.log('STEP 1: Ensure both zips are present locally');
  const downloaded = {};
  for (const f of FILES) {
    const localPath = await ensureDownloaded(f.remote);
    downloaded[f.label] = {
      remote: f.remote,
      localPath,
      compressedSize: fs.statSync(localPath).size
    };
  }

  console.log('\nSTEP 2: Extract CSVs from zips');
  for (const f of FILES) {
    const { csvPath, csvName, uncompressedSize } = extractCsv(downloaded[f.label].localPath);
    downloaded[f.label].csvPath = csvPath;
    downloaded[f.label].csvName = csvName;
    downloaded[f.label].uncompressedSize = uncompressedSize;
  }

  console.log('\nSTEP 3: Analyze each CSV');
  const analysis = {};
  for (const f of FILES) {
    analysis[f.label] = await analyzeCsv(downloaded[f.label].csvPath, f.label);
  }

  console.log('\nSTEP 4: Compute overlap');
  const ieCols = new Set(analysis.itemExport.columns);
  const mfCols = new Set(analysis.masterFeed.columns);
  const sharedColumns = analysis.itemExport.columns.filter((c) => mfCols.has(c));
  const uniqueToItemExport = analysis.itemExport.columns.filter((c) => !mfCols.has(c));
  const uniqueToMaster = analysis.masterFeed.columns.filter((c) => !ieCols.has(c));

  let skuOverlapCount = 0;
  const ieSkus = analysis.itemExport.skus;
  const mfSkus = analysis.masterFeed.skus;
  const [smaller, larger] = ieSkus.size <= mfSkus.size ? [ieSkus, mfSkus] : [mfSkus, ieSkus];
  for (const sku of smaller) {
    if (larger.has(sku)) skuOverlapCount++;
  }
  const skuOverlapPct = smaller.size > 0 ? (skuOverlapCount / smaller.size) * 100 : 0;

  const masterOnlySkus = [];
  let masterOnlyCount = 0;
  for (const sku of mfSkus) {
    if (!ieSkus.has(sku)) {
      if (masterOnlySkus.length < 10) masterOnlySkus.push(sku);
      masterOnlyCount++;
    }
  }
  const itemExportOnlySkus = [];
  let itemExportOnlyCount = 0;
  for (const sku of ieSkus) {
    if (!mfSkus.has(sku)) {
      if (itemExportOnlySkus.length < 10) itemExportOnlySkus.push(sku);
      itemExportOnlyCount++;
    }
  }

  console.log('\nSTEP 5: Save analysis to', OUT_PATH);
  const out = {
    runAt: new Date().toISOString(),
    itemExport: {
      remote: downloaded.itemExport.remote,
      csvName: downloaded.itemExport.csvName,
      compressedBytes: downloaded.itemExport.compressedSize,
      uncompressedBytes: downloaded.itemExport.uncompressedSize,
      rowCount: analysis.itemExport.rowCount,
      columnCount: analysis.itemExport.columnCount,
      columns: analysis.itemExport.columns,
      skuColumn: analysis.itemExport.skuColumn,
      skuCount: analysis.itemExport.skuCount,
      sampleRows: {
        first: truncateRow(analysis.itemExport.sampleRows.first),
        middle: truncateRow(analysis.itemExport.sampleRows.middle),
        last: truncateRow(analysis.itemExport.sampleRows.last)
      }
    },
    masterFeed: {
      remote: downloaded.masterFeed.remote,
      csvName: downloaded.masterFeed.csvName,
      compressedBytes: downloaded.masterFeed.compressedSize,
      uncompressedBytes: downloaded.masterFeed.uncompressedSize,
      rowCount: analysis.masterFeed.rowCount,
      columnCount: analysis.masterFeed.columnCount,
      columns: analysis.masterFeed.columns,
      skuColumn: analysis.masterFeed.skuColumn,
      skuCount: analysis.masterFeed.skuCount,
      sampleRows: {
        first: truncateRow(analysis.masterFeed.sampleRows.first),
        middle: truncateRow(analysis.masterFeed.sampleRows.middle),
        last: truncateRow(analysis.masterFeed.sampleRows.last)
      }
    },
    overlap: {
      sharedColumnCount: sharedColumns.length,
      sharedColumns,
      uniqueToItemExport,
      uniqueToMaster,
      skuOverlapCount,
      skuOverlapPct: Number(skuOverlapPct.toFixed(2)),
      masterOnlySkuCount: masterOnlyCount,
      masterOnlySkuSamples: masterOnlySkus,
      itemExportOnlySkuCount: itemExportOnlyCount,
      itemExportOnlySkuSamples: itemExportOnlySkus
    }
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  console.log('\n=== SUMMARY ===\n');
  for (const label of ['itemExport', 'masterFeed']) {
    const a = out[label];
    console.log(`${label === 'itemExport' ? 'ItemExport' : 'Master Feed'}:`);
    console.log(`  file:       ${a.remote} → ${a.csvName}`);
    console.log(`  size:       ${a.compressedBytes.toLocaleString()} bytes zip → ${a.uncompressedBytes.toLocaleString()} bytes csv`);
    console.log(`  rows:       ${a.rowCount.toLocaleString()}`);
    console.log(`  columns:    ${a.columnCount}`);
    console.log(`  SKU column: ${a.skuColumn}  (${a.skuCount.toLocaleString()} unique)`);
    console.log('');
  }

  console.log('Overlap:');
  console.log(`  shared columns:      ${sharedColumns.length}`);
  console.log(`  unique to ItemExport: ${uniqueToItemExport.length}`);
  console.log(`  unique to Master:     ${uniqueToMaster.length}`);
  console.log(`  SKU overlap:          ${skuOverlapCount.toLocaleString()} (${skuOverlapPct.toFixed(1)}% of smaller set)`);
  console.log(`  SKUs only in Master:     ${masterOnlyCount.toLocaleString()}`);
  console.log(`  SKUs only in ItemExport: ${itemExportOnlyCount.toLocaleString()}`);
  console.log(`\n  Full JSON: ${OUT_PATH}`);

  console.log('\n=== INTERPRETATION ===');
  const ieR = out.itemExport.rowCount;
  const mfR = out.masterFeed.rowCount;
  const ieC = out.itemExport.columnCount;
  const mfC = out.masterFeed.columnCount;

  if (mfC > ieC * 1.5) {
    console.log(`Master has ${mfC - ieC} more columns — likely the rich/extended catalog feed (descriptions, fitment, multi-tier pricing).`);
  } else if (ieC > mfC * 1.5) {
    console.log(`ItemExport has ${ieC - mfC} more columns — likely the rich feed; Master is the slim variant.`);
  } else {
    console.log(`Column counts within 50% of each other — neither is dramatically richer.`);
  }
  if (Math.abs(mfR - ieR) / Math.max(mfR, ieR) > 0.1) {
    console.log(`Row counts differ by >10% (${mfR.toLocaleString()} vs ${ieR.toLocaleString()}) — different SKU universes, not the same data in two formats.`);
  } else {
    console.log(`Row counts within 10% of each other (${mfR.toLocaleString()} vs ${ieR.toLocaleString()}).`);
  }
  if (skuOverlapPct > 95) {
    console.log(`SKU overlap >95% — files cover essentially the same SKU set.`);
  } else if (skuOverlapPct < 50) {
    console.log(`SKU overlap <50% — files cover meaningfully different parts of Premier's catalog.`);
  } else {
    console.log(`SKU overlap ${skuOverlapPct.toFixed(0)}% — partial; one is likely a subset or a different filter.`);
  }

  console.log('\nWhen to use which:');
  console.log('  → premier_data_feed_master.csv: full product enrichment (consumed by import-apg-feed.js).');
  console.log('  → ItemExport.csv: see column list in JSON to decide; common shape is inventory/price-only snapshot,');
  console.log('    useful for fast price/stock refreshes without re-parsing the heavy master feed.');
}

main().catch((err) => {
  console.error('❌', err.message);
  console.error(err.stack);
  process.exit(1);
});
