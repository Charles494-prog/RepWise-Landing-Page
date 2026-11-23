// Static checks on the landing page and the calculator. No dependencies — Node's built-in test runner.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const all = (re, s = html) => [...s.matchAll(re)].map(m => m[1]);

// Tiny fake DOM: just enough for main.js (elements by id, listeners, hidden, classList).
function page(values = {}, ua = '') {
  const els = {}, ids = new Set(all(/\bid="([^"]+)"/g));
  for (const [, id, body] of html.matchAll(/<select id="([^"]+)">([\s\S]*?)<\/select>/g))
    if (!(id in values)) values[id] = ((body.match(/value="([^"]+)" selected/) || body.match(/value="([^"]+)"/)) || [])[1];
  const el = id => {
    if (els[id]) return els[id];
    const v = values[id] ?? (html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`)) || [])[1] ?? '';
    const e = { id, value: String(v), textContent: '', hidden: false, on: {}, classes: new Set(),
      setAttribute(k, val) { this[k] = val; }, addEventListener(t, f) { (this.on[t] = this.on[t] || []).push(f); }, parentNode: { prepend() {} } };
    e.classList = { add: c => e.classes.add(c) };
    return (els[id] = e);
  };
  const doc = { getElementById: id => ids.has(id) ? el(id) : null, querySelectorAll: () => [] };
  new Function('navigator', 'location', 'document', fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'))({ userAgent: ua, platform: '', maxTouchPoints: 0 }, { hash: '' }, doc);
  const set = (id, v) => { el(id).value = String(v); (el(id).on.input || []).forEach(f => f()); };
  return { el, set, out: id => el(id).textContent };
}

test('every in-page link points at a section that exists', () => {
  const ids = new Set(all(/\bid="([^"]+)"/g));
  assert.deepEqual([...new Set(all(/href="#([^"]+)"/g).filter(h => !ids.has(h)))], []);
});

test('ids are unique', () => {
  const ids = all(/\bid="([^"]+)"/g);
  assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), []);
});

test('every local image, script, stylesheet and og:image exists', () => {
  const refs = [...all(/(?:src|href)="(\/[^"#?]*)"/g), ...all(/content="(\/[^"]+)"/g), ...all(/url\(["']?(\/[^"')]+)/g, css)];
  assert.deepEqual([...new Set(refs)].filter(r => !fs.existsSync(path.join(ROOT, r))), []);
});

test('images have alt text (empty only when decorative) and a size to avoid layout shift', () => {
  const imgs = html.match(/<img\b[^>]*>/g);
  assert.ok(imgs.length > 10);
  assert.deepEqual(imgs.filter(t => !/\balt="/.test(t)), [], 'missing alt');
  assert.deepEqual(imgs.filter(t => !/\bwidth="\d+"/.test(t) || !/\bheight="\d+"/.test(t)), [], 'missing width/height');
});

test('downloads use the rolling "latest" release assets the CI publishes', () => {
  const dl = all(/href="(https:\/\/github\.com\/[^"]*\/download\/[^"]+)"/g);
  assert.ok(dl.some(u => u.endsWith('/releases/latest/download/RepWise.apk')));
  assert.ok(dl.some(u => u.endsWith('/releases/latest/download/RepWise-unsigned.ipa')));
});

test('links opened in a new tab are rel="noopener"', () => {
  assert.deepEqual((html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []).filter(t => !/rel="[^"]*noopener/.test(t)), []);
});

test('head: title, description, viewport, social preview', () => {
  for (const re of [/<title>[^<]{10,70}<\/title>/, /<meta name="description" content="[^"]{50,}"/, /<meta name="viewport"/, /<meta property="og:image"/, /<html lang="en">/]) assert.match(html, re);
});

test('requirements section: menu link, minimum and recommended, computer puns, above Ranks', () => {
  assert.match(html, /<a href="#requirements">/);
  const sec = html.slice(html.indexOf('id="requirements"'), html.indexOf('<!-- RANKS -->'));
  for (const s of ['Minimum', 'Recommended', 'A phone', 'A tape measure', 'A scale', 'Something to eat', 'Power supply', 'Cooling system']) assert.ok(sec.includes(s), s);
  assert.ok(html.indexOf('id="requirements"') < html.indexOf('id="ranks"'));
});

test('numbers section: TDEE, calories, protein and body fat cards', () => {
  const sec = html.slice(html.indexOf('id="numbers"'), html.indexOf('id="calc"'));
  for (const s of ['Auto TDEE', 'Calorie tracker', 'Auto protein', 'Body fat']) assert.ok(sec.includes(`<h3>${s}</h3>`), s);
});

// Expected values are the app's own targets() / bodyFat() results for the same inputs (see the app's test/e2e/numbers.test.js).
test('calculator: defaults match the app (Mifflin-St Jeor × activity − 500, protein 2 g/kg)', () => {
  const p = page();
  assert.equal(p.out('o-tdee'), '2,327'); // 25 y male, 170 cm, 75 kg: BMR 1692.5 × 1.375
  assert.equal(p.out('o-kcal'), '1,827');
  assert.equal(p.out('o-p'), '150');
  assert.equal(p.out('o-w'), '2.8'); // 35 ml/kg in 250 ml glasses: 2,750 ml
  assert.equal(p.out('o-bf'), '20.7%');
});

test('calculator: goals, female and the 1,200 kcal floor', () => {
  const p = page();
  p.set('c-goal', 'bulk'); assert.equal(p.out('o-kcal'), '2,627'); assert.equal(p.out('o-p'), '135');
  p.set('c-goal', 'maintain'); assert.equal(p.out('o-kcal'), '2,327');
  p.set('c-sex', 'f'); assert.equal(p.out('o-tdee'), '2,099');
  p.set('c-goal', 'cut'); p.set('c-w', 40); p.set('c-h', 145); p.set('c-age', 70); p.set('c-act', 1.2);
  assert.equal(p.out('o-kcal'), '1,200');
});

test('calculator: blank or zero inputs keep the last result instead of NaN', () => {
  const p = page();
  p.set('c-w', ''); assert.equal(p.out('o-kcal'), '1,827');
  p.set('c-age', 0); assert.doesNotMatch(p.out('o-bf'), /NaN/);
});

test('calculator body fat: build adjusts the estimate', () => {
  const p = page();
  p.set('c-build', 'lean'); assert.equal(p.out('o-bf'), '16.7%');
  p.set('c-build', 'heavy'); assert.equal(p.out('o-bf'), '26.7%');
  assert.match(p.out('o-bfm'), /estimated/);
});

test('calculator body fat: US Navy tape method for men and women (hips only asked for women)', () => {
  const p = page();
  assert.equal(p.el('c-hip-l').hidden, true);
  p.set('c-waist', 85); p.set('c-neck', 38);
  assert.equal(p.out('o-bf'), '17.8%'); assert.match(p.out('o-bfm'), /Navy/);
  p.set('c-sex', 'f'); assert.equal(p.el('c-hip-l').hidden, false);
  assert.match(p.out('o-bfm'), /estimated/, 'women need hips for the tape method');
  p.set('c-waist', 75); p.set('c-neck', 32); p.set('c-hip', 98);
  assert.equal(p.out('o-bf'), '27.6%'); assert.match(p.out('o-bfm'), /Navy/);
});

test('calculator body fat: impossible tape numbers fall back to the estimate', () => {
  const p = page();
  p.set('c-waist', 50); p.set('c-neck', 45);
  assert.equal(p.out('o-bf'), '20.7%'); assert.match(p.out('o-bfm'), /add up/);
  p.set('c-neck', 60); assert.equal(p.out('o-bf'), '20.7%');
});

test('platform detection: iPhone visitors get the iPhone download first and the iPhone install steps', () => {
  const p = page({}, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
  assert.ok(p.el('dl-ios').classes.has('primary'));
  assert.equal(p.el('install-android').hidden, true);
  assert.ok(page({}, 'Mozilla/5.0 (Linux; Android 15)').el('dl-android').classes.has('primary'));
});

test('mobile: no fixed widths wider than a phone outside media queries (clipped decorations aside)', () => {
  const top = css.replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').replace(/[^{}]*\{[^}]*position:absolute[^}]*\}/g, '');
  assert.deepEqual(all(/(?:^|[;{])\s*(?:width|min-width):\s*(\d{3,})px/g, top).map(Number).filter(n => n > 390), []);
});

test('new features are highlighted: menu link, "New in RepWise" cards linking to their sections, screenshots', () => {
  assert.match(html, /<a href="#new">New<\/a>/);
  const sec = html.slice(html.indexOf('id="new"'), html.indexOf('<!-- FEATURES -->'));
  for (const s of ['Smart rescheduling', 'Muscle balance', 'Custom exercises', 'Exercise groups', 'Dishes &amp; meals', 'Real loop routes']) assert.ok(sec.includes(`<h3>${s}</h3>`), s);
  assert.ok(html.indexOf('id="new"') < html.indexOf('id="features"'));
  for (const id of ['f-reschedule', 'f-balance', 'f-custom', 'f-meals']) assert.ok(html.includes(`id="${id}"`), id);
  for (const img of ['reschedule', 'swap', 'balance', 'exercise', 'meal', 'nutrition']) assert.ok(html.includes(`/assets/screens/${img}.png`), img);
  assert.ok(html.includes('alt="Forearms"')); assert.match(html, /12 ranks to climb at once/);
  // latest: today's focus, Ultra-Health, smarter fasting, rank themes
  for (const s of ["Today's focus", 'Ultra-Health Mode', 'Smarter fasting', 'Rank themes']) assert.ok(sec.includes(`<h3>${s}</h3>`), s);
  for (const id of ['f-focus', 'f-ultra', 'f-fasting', 'f-themes']) { assert.ok(html.includes(`id="${id}"`), id); assert.ok(sec.includes(`href="#${id}"`), id); }
  for (const img of ['focus', 'ultra', 'ultra-nutrition', 'ultra-fast', 'themes', 'rank-gallery']) assert.ok(html.includes(`/assets/screens/${img}.png`), img);
});

test('Ultra-Health Mode is highlighted: menu link, hero pill, spotlight section above What\'s new, first New card, disclaimer', () => {
  assert.match(html, /<a href="#ultra">Ultra-Health<\/a>/);
  assert.match(html, /class="hero-pill" href="#ultra"/);
  const at = html.indexOf('id="ultra"');
  assert.ok(at > 0 && at < html.indexOf('id="new"'), 'spotlight sits above What\'s new');
  const sec = html.slice(at, html.indexOf('<!-- WHAT\'S NEW -->'));
  for (const s of ['A hard added-sugar cap', 'Sodium for every food', 'Limits from your readings', 'Smarter fasting', 'Bedtime-aware']) assert.ok(sec.includes(`<h3>${s}</h3>`), s);
  assert.match(sec, /not medical advice/); assert.match(sec, /Settings → Modes &amp; features → Ultra-Health Mode/);
  for (const img of ['ultra', 'ultra-fast']) assert.ok(sec.includes(`/assets/screens/${img}.png`), img);
  const grid = html.slice(html.indexOf('class="new-grid"'));
  assert.ok(grid.indexOf('href="#f-ultra"') < grid.indexOf('href="#f-focus"'), 'Ultra-Health is the first New card');
});
