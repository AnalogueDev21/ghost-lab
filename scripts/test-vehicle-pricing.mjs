import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';
import * as pricing from '../recovered-production/assets/vehicle-pricing.js';
import * as membership from '../recovered-production/assets/membership-BI3ZslQk.js';

const catalog = JSON.parse(await readFile(new URL('../data/parts-catalog.json', import.meta.url), 'utf8'));
const source = await readFile(new URL('../recovered-production/assets/POSPage-CxiIf3bD.js', import.meta.url), 'utf8');
const { code } = await transform(source + '\nexport { Le, Be, ze, Ie };', { format: 'cjs', target: 'es2022' });
const member = tier => ({ id: 'member-test', tier, membership_expires_at: '2099-01-01T00:00:00Z', total_spent: 0, visits: 0 });
const services = [
  { id: 'fluid', name: 'Brake Fluid', price: 4000, category: 'service' },
  { id: 'engine', name: 'Engine Repair Kit', price: 800, category: 'Tools & Repair' },
  { id: 'full', name: 'Full Repair Kit', price: 1500, category: 'Tools & Repair' },
  { id: 'filter', name: 'Sport : Drop-In Filter', price: 35000, category: 'N/A (Standard)' },
  { id: 'unknown', name: 'Custom Dashboard', price: 5000, category: 'Interior' },
];
const flatten = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(flatten).join('') : typeof node === 'object' ? flatten(node.props?.children) : String(node);
function nodes(root, predicate) {
  const found = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (predicate(node)) found.push(node);
    walk(node.props?.children);
  }
  walk(root);
  return found;
}
function harness(branchKey = 'garage') {
  const state = [], writes = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const key = cursor++;
      if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial;
      return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value; }];
    },
    useRef(initial) { const key = cursor++; return state[key] ||= { current: initial }; },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const database = { from(table) {
    const chain = {
      insert(payload) { writes.push({ table, payload }); return chain; },
      update(payload) { writes.push({ table, payload }); return chain; },
      select() { return chain; }, eq() { return chain; },
      single() { return Promise.resolve({ data: { id: 'bill-test' }, error: null }); },
      then(resolve) { return Promise.resolve({ error: null }).then(resolve); },
    };
    return chain;
  } };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, console, URLSearchParams,
    setTimeout: () => 0, clearTimeout() {},
    window: { location: { search: '' }, confirm: () => true },
    require(name) {
      if (name.includes('index-va')) return { r: hooks, j: { jsx, jsxs: jsx, Fragment: 'Fragment' }, s: database };
      if (name.includes('membership-')) return membership;
      if (name.includes('vehicle-pricing')) return pricing;
      throw new Error(`Unexpected import ${name}`);
    },
  });
  let tree;
  const render = () => { cursor = 0; tree = module.exports.Le({ branch: { id: 'branch-test', key: branchKey, commission_flat: 3000 }, title: 'LOCAL TEST', staff: { id: 'staff-test' }, restaurantMode: branchKey === 'chill' }); return tree; };
  render(); state[0] = services; render();
  const button = label => nodes(tree, node => node.type === 'button' && flatten(node) === label)[0];
  const add = id => { nodes(tree, node => node.props?.role === 'button' && flatten(node).includes(services.find(s => s.id === id).name))[0].props.onClick(); render(); };
  const select = key => { button(pricing.vehicleLabels[key]).props.onClick(); render(); };
  const setMember = value => { state[11] = !!value; state[18] = value; render(); };
  const total = () => flatten(nodes(tree, node => Array.isArray(node.props?.children) && flatten(node.props.children[0]) === 'TOTAL')[0]);
  return { state, writes, render, add, select, setMember, total, button, exports: module.exports, tree: () => tree };
}

test('all 41 explicit catalog prices resolve for both classes, using garage maintenance prices', () => {
  for (const item of catalog.items.filter(item => item.catalog_status === 'priced' || item.prices.standard.status === 'priced')) {
    for (const vehicle of ['standard', 'supercar']) {
      const result = pricing.priceService({ name: item.source_name, price: 1 }, vehicle);
      assert.equal(result.price, item.prices[vehicle].garage ?? item.prices[vehicle].price, `${item.name} ${vehicle}`);
      assert.equal(result.pricingError, '');
    }
  }
  assert.equal(catalog.counts.priced_items, 41);
});
test('explicit legacy aliases and three packages are mapped; unrelated parts are not guessed', () => {
  assert.equal(pricing.priceService({ name: ' Sport : High-Flow Fuel Pump ', price: 1 }, 'supercar').price, 70000);
  assert.equal(pricing.priceService({ name: 'Sport : Iridium Spark Plug', price: 1 }, 'supercar').price, 70000);
  for (const [name, price] of [['เหมา N/A (Standard)', 840000], ['เหมา Turbo Set !!', 1045000], ['เหมา Handing', 600000]]) {
    assert.equal(pricing.priceService({ name, price: 1 }, 'supercar').price, price);
  }
  assert.equal(pricing.priceService({ name: 'Sport : Upgraded Cables', price: 37500 }, 'supercar').price, null);
});
test('unpriced and not-for-sale items never become a free Super Car line; Standard stays intact', () => {
  for (const item of catalog.items.filter(item => item.prices.standard.status === 'not_for_sale')) {
    assert.equal(pricing.priceService({ name: item.source_name, price: 3500 }, 'supercar').price, null);
    assert.equal(pricing.priceService({ name: item.source_name, price: 3500 }).price, 3500);
  }
  assert.equal(pricing.priceService(services[4], 'supercar').price, null);
  for (const price of [null, undefined, -1, NaN, Infinity, '5000']) assert.ok(pricing.priceService({ name: 'Unknown', price }).pricingError);
});
test('actual POS reprices every unit immediately and adding units does not retain stale prices', () => {
  const app = harness(); app.add('fluid'); app.add('fluid'); app.add('fluid');
  assert.equal(app.total(), 'TOTAL¥12,000');
  app.select('supercar'); assert.equal(app.total(), 'TOTAL¥24,000');
  const plus = nodes(app.tree(), node => node.props?.['aria-label'] === 'เพิ่มจำนวน Brake Fluid')[0];
  plus.props.onClick(); app.render(); assert.equal(app.total(), 'TOTAL¥32,000');
  app.select('standard'); assert.equal(app.total(), 'TOTAL¥16,000');
});
test('all active member tiers: only both repair kits are free in both classes', () => {
  for (const tier of ['regular', 'silver', 'gold']) for (const vehicle of ['standard', 'supercar']) {
    const app = harness(); app.select(vehicle); app.setMember(member(tier));
    app.add('engine'); app.add('full'); assert.equal(app.total(), 'TOTAL¥0');
    app.add('fluid'); app.add('fluid'); app.add('fluid');
    assert.equal(app.total(), vehicle === 'standard' ? 'TOTAL¥12,000' : 'TOTAL¥24,000');
    app.setMember({ ...member(tier), membership_expires_at: '2000-01-01' });
    assert.equal(app.total(), vehicle === 'standard' ? 'TOTAL¥14,300' : 'TOTAL¥26,300');
    app.setMember(null);
    assert.equal(app.total(), vehicle === 'standard' ? 'TOTAL¥14,300' : 'TOTAL¥26,300');
  }
});
test('discount threshold applies after free kits, and Chill is not repriced', () => {
  const app = harness(); app.setMember(member('gold')); app.select('supercar');
  app.add('engine'); app.add('filter'); assert.equal(app.total(), 'TOTAL¥66,500');
  const chill = harness('chill'); chill.add('fluid'); assert.equal(chill.total(), 'TOTAL¥4,000');
  assert.equal(chill.button('Super Car'), undefined);
  assert.equal(pricing.repairKitDiscount(services, true, 'chill'), 0);
});
test('unknown-price cart blocks both button and submit handler without database writes', async () => {
  const app = harness(); app.add('unknown'); app.select('supercar');
  assert.equal(app.total(), 'TOTALยังคำนวณไม่ได้');
  assert.equal(app.button('▸ SUBMIT BILL').props.disabled, true);
  await app.button('▸ SUBMIT BILL').props.onClick(); assert.equal(app.writes.length, 0);
  app.select('standard'); assert.equal(app.total(), 'TOTAL¥5,000');
  assert.equal(app.button('▸ SUBMIT BILL').props.disabled, false);
});
test('actual submit freezes class and prices into bill and item snapshots, then resets class', async () => {
  const app = harness(); app.setMember(member('gold')); app.select('supercar'); app.add('fluid'); app.add('engine');
  await app.button('▸ SUBMIT BILL').props.onClick();
  const bill = app.writes.find(write => write.table === 'bills').payload;
  const items = app.writes.find(write => write.table === 'bill_items').payload;
  assert.equal(bill.subtotal, 8800); assert.equal(bill.total, 8000); assert.equal(bill.commission, 3000);
  assert.equal(items[0].price_snapshot, 8000); assert.equal(items[1].price_snapshot, 800);
  const notes = app.exports.ze(bill.notes);
  assert.equal(notes.vehicleClass, 'supercar'); assert.equal(notes.items[0].price_snapshot, 8000);
  assert.equal(app.state[22], 'standard'); assert.equal(app.state[3].length, 0);
  assert.equal(app.exports.ze('old note').note, 'old note');
  assert.equal(app.exports.ze('[ghost-lab-bill]{"items":[]}').vehicleClass, null);
  assert.equal(app.exports.ze('[ghost-lab-bill]{"vehicle_class":"invalid"}').vehicleClass, null);
});
