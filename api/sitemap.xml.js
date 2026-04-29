import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const SITE = 'https://black-stack-diesel.com';
const PAGE_SIZE = 1000;
const MAX_PAGES = 100; // safety cap; current catalog is ~50 pages

function isSafeSku(sku) {
  return typeof sku === 'string' && sku.length > 0 && !/[/?#&%+\s]/.test(sku);
}

function escapeXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
  );

  const skus = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('products')
      .select('sku, updated_at')
      .eq('status', 'active')
      .eq('is_visible', true)
      .eq('has_margin', true)
      .not('sku', 'is', null)
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) {
      console.error('[BSD] Sitemap query failed:', error.message);
      return new Response('<error>sitemap query failed</error>', {
        status: 500,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' }
      });
    }
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (isSafeSku(row.sku)) skus.push({ sku: row.sku, lastmod: row.updated_at });
    }
    if (data.length < PAGE_SIZE) break;
  }

  const urls = [
    `<url><loc>${SITE}/app/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`
  ];
  for (const { sku, lastmod } of skus) {
    const u = SITE + '/products/' + encodeURIComponent(sku);
    const lm = lastmod ? `<lastmod>${escapeXml(String(lastmod).slice(0, 10))}</lastmod>` : '';
    urls.push(`<url><loc>${escapeXml(u)}</loc>${lm}<changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
