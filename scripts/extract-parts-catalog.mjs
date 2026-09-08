import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read the supplied catalog strictly as text. Never evaluate its embedded scripts.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.resolve(process.argv[2] || 'C:/Users/bigza/Downloads/catalog_lite.html');
const outputPath = path.join(root, 'data', 'parts-catalog.json');
const bytes = await readFile(sourcePath);
const source = bytes.toString('utf8');
const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

function text(value = '') {
  return value.replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);|&#(?:x[\da-f]+|\d+);/gi, entity => {
      const known = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
      if (known[entity.toLowerCase()] !== undefined) return known[entity.toLowerCase()];
      const number = entity.slice(2, -1);
      return String.fromCodePoint(number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number));
    }).replace(/\s+/g, ' ').trim();
}

function classContent(markup, className, tag = 'span') {
  const expression = new RegExp(`<${tag}\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return markup.match(expression)?.[1] ?? null;
}

function normalizeName(name) {
  return name.replace(/^Sport:\s*/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function parsePrice(raw) {
  if (raw === null) throw new Error('Missing catalog price cell');
  const value = text(raw);
  if (value.includes('ห้ามจำหน่าย')) {
    return { raw: value, status: 'not_for_sale', price: null, installation: null, garage: null };
  }
  const maintenance = value.match(/^ใส่:\s*([\d,]+)\s*\|\s*อู่:\s*([\d,]+)$/);
  if (maintenance) {
    return {
      raw: value, status: 'priced', price: null,
      installation: Number(maintenance[1].replaceAll(',', '')),
      garage: Number(maintenance[2].replaceAll(',', '')),
    };
  }
  const fixed = value.match(/^([\d,]+)\s+Yen$/i);
  if (!fixed) throw new Error(`Unrecognized price text: ${value}`);
  return { raw: value, status: 'priced', price: Number(fixed[1].replaceAll(',', '')), installation: null, garage: null };
}

const categoryIds = ['engine_na', 'engine_turbo', 'handling_drivetrain', 'tires', 'maintenance'];
const categories = [];
const items = [];
const packages = [];
const warnings = [];
// String scanning is only for literal alternate names present in the source, not recipes or executable code.
const sportNames = [...new Set([...source.matchAll(/"(Sport:\s*[^"\r\n]+)"\s*[:,\]]/g)].map(match => text(match[1])))];

for (const sectionMatch of html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)) {
  const section = sectionMatch[1];
  const rows = [...section.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)];
  if (!rows.length) continue;
  const categoryId = categoryIds[categories.length];
  if (!categoryId) throw new Error('Unexpected catalog category');
  const categoryName = text(section.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
  const countRaw = text(classContent(section, 'section-badge'));
  const declaredCount = Number(countRaw.match(/\d+/)?.[0]);
  if (declaredCount !== rows.length) throw new Error(`Category count mismatch: ${categoryName}`);
  const category = { id: categoryId, name: categoryName, declared_count: declaredCount, item_ids: [] };
  const header = classContent(section, 'col-header', 'div');
  category.price_headers = [...header.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].slice(2).map(match => text(match[1]));
  categories.push(category);

  for (const rowMatch of rows) {
    const row = rowMatch[1];
    const summary = row.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1];
    if (!summary) throw new Error('Catalog row has no summary');
    const name = text(classContent(summary, 'part-name'));
    if (!name) throw new Error('Catalog row has no name');
    const normalizedName = normalizeName(name);
    const id = `${categoryId}:${normalizedName.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const bareName = name.replace(/^Sport:\s*/i, '');
    const aliases = [...new Set([name, bareName, ...sportNames.filter(candidate => normalizeName(candidate) === normalizedName)])];
    const standard = parsePrice(classContent(summary, 'price-std'));
    const supercar = parsePrice(classContent(summary, 'price-sc'));
    if (standard.status !== supercar.status) throw new Error(`Asymmetric availability: ${name}`);
    const item = {
      id, category_id: categoryId, source_name: name, name: bareName, normalized_name: normalizedName, aliases,
      description: text(classContent(summary, 'part-sub')),
      source_row_number: Number(text(classContent(summary, 'num'))),
      prices: { standard, supercar },
      catalog_status: standard.status,
    };
    items.push(item);
    category.item_ids.push(id);
  }

  const packageBlock = classContent(section, 'section-pkg', 'div');
  if (packageBlock) {
    const rows = [...packageBlock.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)];
    if (rows.length !== 2) throw new Error(`Unexpected package rows: ${categoryName}`);
    const raw = rows.map(match => text(match[1]));
    const prices = Object.fromEntries(rows.map((match, index) => {
      const price = parsePrice(match[1].match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i)?.[1]);
      return [index === 0 ? 'standard' : 'supercar', price];
    }));
    const categoryItems = items.filter(item => item.category_id === categoryId && item.catalog_status === 'priced');
    const sums = Object.fromEntries(['standard', 'supercar'].map(vehicleClass => [vehicleClass, categoryItems.reduce((sum, item) => sum + item.prices[vehicleClass].price, 0)]));
    const packageKind = raw[0].includes('ราคาเหมา') ? 'package' : 'informational_sum';
    packages.push({
      id: `${categoryId}:${packageKind}`, category_id: categoryId, kind: packageKind,
      raw, prices, item_ids: categoryItems.map(item => item.id), item_price_sums: sums,
      matches_item_sums: ['standard', 'supercar'].every(vehicleClass => sums[vehicleClass] === prices[vehicleClass].price),
    });
  }
}

if (categories.length !== 5 || items.length !== 48) throw new Error(`Unexpected catalog shape: ${categories.length} categories, ${items.length} rows`);
if (new Set(items.map(item => item.normalized_name)).size !== items.length) throw new Error('Ambiguous normalized item names');
const header = text(html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i)?.[1]);
const footer = text(html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i)?.[1]);
const declaredTotal = Number(footer.match(/ทั้งหมด\s*(\d+)\s*รายการ/)?.[1]);
if (declaredTotal !== items.length) warnings.push({ code: 'stale_footer_count', detail: `Footer says ${declaredTotal} items; actual sections contain ${items.length}.` });
warnings.push(
  { code: 'different_display_versions', detail: 'Header says v2.6 while footer says v2.7.' },
  { code: 'maintenance_price_basis', detail: 'Maintenance explicitly labels separate ใส่ and อู่ prices; they are preserved independently and not added together. The catalog does not define the commercial meaning of ใส่.' },
  { code: 'catalog_not_for_sale', detail: 'Seven tire rows have no numeric price and say ห้ามจำหน่าย. A business decision is needed before changing existing POS availability.' },
  { code: 'repair_kits_absent', detail: 'Engine Repair Kit and Full Repair Kit are absent from this catalog; preserve existing prices and the user-authorized free benefit for active members in both vehicle classes.' },
  { code: 'turbo_name_variant', detail: 'The displayed Bolt-On Upgrade Turbo (BPU) differs from the crafting literal Sport: Bolt-On Upgrade Turbo BPU. Parenthesis removal is not included in automatic normalization.' },
);
const result = {
  schema_version: 1,
  source: { filename: path.basename(sourcePath), sha256: createHash('sha256').update(bytes).digest('hex'), byte_length: bytes.length, title: text(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]), header, footer, declared_footer_count: declaredTotal, extraction: 'Static text extraction; embedded scripts are never evaluated.' },
  currency: 'JPY',
  name_matching: 'Case-insensitive with collapsed whitespace and optional leading Sport:. No punctuation or fuzzy substitutions.',
  counts: { categories: categories.length, items: items.length, priced_items: items.filter(item => item.catalog_status === 'priced').length, not_for_sale_items: items.filter(item => item.catalog_status === 'not_for_sale').length, maintenance_items: items.filter(item => item.category_id === 'maintenance').length, packages: packages.filter(item => item.kind === 'package').length, informational_sums: packages.filter(item => item.kind === 'informational_sum').length },
  categories, items, packages, warnings,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output: outputPath, sha256: result.source.sha256, counts: result.counts, categories: categories.map(category => ({ id: category.id, count: category.item_ids.length })) }, null, 2));
