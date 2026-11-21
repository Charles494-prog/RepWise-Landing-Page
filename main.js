// Highlight the download that matches the visitor's phone, and drive the install tabs.
(function () {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const a = document.getElementById('dl-android'), i = document.getElementById('dl-ios');
  if (android) { a.classList.add('primary'); }
  else if (ios) { i.classList.add('primary'); i.parentNode.prepend(i); }
  else { a.classList.add('primary'); }

  const tabs = { android: document.getElementById('tab-android'), ios: document.getElementById('tab-ios') };
  const panels = { android: document.getElementById('install-android'), ios: document.getElementById('install-ios') };
  function show(k) {
    for (const key of Object.keys(tabs)) {
      tabs[key].setAttribute('aria-selected', String(key === k));
      panels[key].hidden = key !== k;
    }
  }
  tabs.android.addEventListener('click', () => show('android'));
  tabs.ios.addEventListener('click', () => show('ios'));
  // Any link to the iPhone steps opens that tab.
  document.querySelectorAll('a[href="#install-ios"]').forEach(l => l.addEventListener('click', () => show('ios')));
  if (ios || location.hash === '#install-ios') show('ios');

  document.getElementById('yr').textContent = new Date().getFullYear();

  // Calorie / protein calculator — same formulas as the app (Mifflin-St Jeor × activity, ±goal; protein 2.0 / 1.8 g per kg).
  const $c = id => document.getElementById(id);
  function calc() {
    const sex = $c('c-sex').value, age = +$c('c-age').value, h = +$c('c-h').value, w = +$c('c-w').value, act = +$c('c-act').value, goal = $c('c-goal').value;
    if (!(age > 0 && h > 0 && w > 0)) return;
    const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161), tdee = bmr * act, kcal = tdee + ({ cut: -500, maintain: 0, bulk: 300 })[goal];
    const f = n => Math.round(n).toLocaleString();
    $c('o-tdee').textContent = f(tdee); $c('o-kcal').textContent = f(Math.max(1200, kcal)); $c('o-p').textContent = f(w * (goal === 'bulk' ? 1.8 : 2));
    $c('o-w').textContent = (Math.round(w * 35 / 250) * 250 / 1000).toFixed(1);
    // Body fat — same as the app: US Navy tape method when waist + neck (+ hips for women) are given, else BMI estimate adjusted for build.
    const waist = +$c('c-waist').value, neck = +$c('c-neck').value, hip = +$c('c-hip').value, l = Math.log10;
    $c('c-hip-l').hidden = sex === 'm';
    let bf = null, how = 'estimated from BMI, age, sex & build';
    if (waist > neck && neck > 0 && (sex === 'm' || hip > 0)) {
      bf = sex === 'm' ? 495 / (1.0324 - 0.19077 * l(waist - neck) + 0.15456 * l(h)) - 450 : 495 / (1.29579 - 0.35004 * l(waist + hip - neck) + 0.221 * l(h)) - 450;
      how = 'measured — US Navy tape method (±3%)';
      if (!(bf >= 3 && bf <= 65)) { bf = null; how = 'those measurements don’t add up — showing the estimate'; }
    }
    if (bf === null) bf = Math.max(4, 1.2 * (w / Math.pow(h / 100, 2)) + 0.23 * age - 10.8 * (sex === 'm' ? 1 : 0) - 5.4 + ({ lean: -4, athletic: -2, average: 0, soft: 3, heavy: 6 })[$c('c-build').value]);
    $c('o-bf').textContent = bf.toFixed(1) + '%'; $c('o-bfm').textContent = how;
  }
  ['c-sex', 'c-age', 'c-h', 'c-w', 'c-act', 'c-goal', 'c-build', 'c-waist', 'c-neck', 'c-hip'].forEach(id => { const el = $c(id); if (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); } });
  if ($c('calc')) calc();
})();
