require('dotenv').config({ path: '.env.local' });

const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function main() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  const host = process.env.APG_FTP_HOST;
  const user = process.env.APG_FTP_USER;
  const password = process.env.APG_FTP_PASSWORD;
  const port = Number(process.env.APG_FTP_PORT || 21);

  if (!host || !user || !password) {
    throw new Error('Missing APG_FTP_HOST, APG_FTP_USER, or APG_FTP_PASSWORD in .env.local');
  }

  const outDir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });

  const remoteFile = 'ItemExport.zip';
  const localZip = path.join(outDir, remoteFile);

  try {
    await client.access({ host, user, password, port, secure: false });
    console.log('✅ Connected to APG FTP');

    console.log(`Downloading ${remoteFile}...`);
    await client.downloadTo(localZip, remoteFile);
    console.log(`✅ Downloaded to: ${localZip} (${fs.statSync(localZip).size.toLocaleString()} bytes)`);

    console.log('Extracting...');
    const zip = new AdmZip(localZip);
    const entries = zip.getEntries();
    const csvEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.csv'));
    if (!csvEntry) {
      throw new Error(
        `No .csv entry inside ${remoteFile}; entries: ${entries.map((e) => e.entryName).join(', ')}`
      );
    }
    const csvName = path.basename(csvEntry.entryName);
    zip.extractEntryTo(csvEntry, outDir, /* maintainEntryPath */ false, /* overwrite */ true);
    const csvPath = path.join(outDir, csvName);
    console.log(`✅ Extracted ${csvName} (${csvEntry.header.size.toLocaleString()} bytes) → ${csvPath}`);

    fs.unlinkSync(localZip);
    console.log(`Removed ${localZip}`);

    console.log(`Final CSV path: ${csvPath}`);
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
