# RepWise landing page

Static site for [RepWise](https://github.com/Charles494-prog/Repwise) — plain HTML/CSS/JS, no build step.

## Deploy on Vercel
1. Import this repo in Vercel.
2. Framework preset: **Other**. Leave build command and output directory empty.
3. Deploy.

## Download links
The buttons point at the app repo's rolling `latest` release, which the app's GitHub Actions workflow updates on every push to `main`:

- Android: `https://github.com/Charles494-prog/Repwise/releases/latest/download/RepWise.apk`
- iPhone: `https://github.com/Charles494-prog/Repwise/releases/latest/download/RepWise-unsigned.ipa`

So the site never needs changing when a new build ships.

## Files
- `index.html`, `styles.css`, `main.js` — the page (detects Android/iPhone and highlights the right download)
- `assets/screens/` — real app screenshots
- `assets/og.png` — link preview image (add one at 1200×630 if missing)
