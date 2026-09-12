const puppeteer = require('puppeteer-core');
const R = require('./recorder');
const cfg = require('./config');
const { sleep } = R;

// Chrome 137+ removed --load-extension; Edge (same Chromium) still honours it.
const EDGE = cfg.EDGE;
const EXT = require('path').resolve(__dirname, cfg.EXT_DIR);
const ID = cfg.EXT_ID;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: [
      '--disable-features=DisableLoadExtensionCommandLineSwitch',
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--hide-scrollbars',
    ],
    defaultViewport: { width: 380, height: 560, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();
  await page.goto('about:blank');

  const rec = new R.Rec(page, './frames-extension');
  rec.start(8);
  await sleep(600);

  // Cold open: the popup runs its backend health check on load.
  await page.goto(`chrome-extension://${ID}/popup/popup.html`, { waitUntil: 'domcontentloaded' });
  await sleep(400);
  await R.inject(page);
  await sleep(2200);                       // Checking... -> ONLINE / OFFLINE

  await R.moveTo(page, 190, 150, 700);     // backend row
  await sleep(900);
  await R.moveTo(page, 190, 215, 700);     // auth row
  await sleep(1100);

  // Hover the auth CTA without triggering the Google OAuth flow.
  await page.evaluate(() => {
    const b = document.getElementById('auth-button');
    b.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    b.classList.add('is-hover');
  });
  await R.moveTo(page, 190, 300, 800);
  await sleep(1600);

  await R.moveTo(page, 190, 420, 700);     // protection stats
  await sleep(1300);

  const frames = await rec.stop();
  console.log('frames:', frames, '=', (frames / 8).toFixed(1) + 's');
  await browser.close();
})();
