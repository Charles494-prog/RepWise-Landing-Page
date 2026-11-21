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
})();
