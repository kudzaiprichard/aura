const R = require('./recorder');
const cfg = require('./config');
const S = require('./scrub');
const { sleep, BASE } = R;

(async () => {
  const { browser, page } = await R.launch();
  await S.attach(page);                    // redact at the network layer
  await R.login(page);

  const rec = new R.Rec(page, './frames-dashboard');
  rec.start(8);
  await sleep(1400);

  // --- sign in ---
  await R.click(page, 'input[type="email"]', { pause: 220 });
  await page.type('input[type="email"]', cfg.email(), { delay: 55 });
  await sleep(420);
  await R.click(page, 'input[autocomplete="current-password"]', { pause: 220 });
  await page.type('input[autocomplete="current-password"]', cfg.password(), { delay: 55 });
  await sleep(600);
  await R.click(page, 'button[type="submit"]', { pause: 5000 });
  await R.hideChrome(page); await R.inject(page);
  await sleep(1600);
  await S.assertClean(page, 'dashboard');

  // --- overview: tiles, then the populated cards below the fold ---
  await R.moveTo(page, 480, 215, 450);
  await R.moveTo(page, 1150, 215, 550);
  await sleep(500);
  await R.scroll(page, 620);
  await sleep(2200);
  await R.scroll(page, -620);
  await sleep(700);

  // --- review queue -> one item ---
  await R.click(page, 'a[href="/review"]', { pause: 3000 });
  await R.hideChrome(page); await R.inject(page);
  await sleep(1300);
  await S.assertClean(page, 'review');
  await R.click(page, 'tbody tr', { pause: 4000 });
  await R.hideChrome(page); await R.inject(page);
  await sleep(1500);
  await S.assertClean(page, 'review/item');
  await R.moveTo(page, 1150, 480, 600);
  await sleep(1100);

  // --- drift: live signal, then lifetime confusion matrix ---
  await R.click(page, 'a[href="/drift"]', { pause: 3000 });
  await R.hideChrome(page); await R.inject(page);
  await sleep(1500);
  await R.click(page, 'button[role="tab"]', { pause: 2400, nth: 1 });
  await sleep(1200);
  await S.assertClean(page, 'drift');

  // --- predictions (identities swapped upstream of React) ---
  await R.click(page, 'a[href="/predictions"]', { pause: 3200 });
  await R.hideChrome(page); await R.inject(page);
  await sleep(2200);
  await S.assertClean(page, 'predictions');
  await R.moveTo(page, 700, 300, 550);
  await sleep(1400);

  const frames = await rec.stop();
  console.log('all pages clean · frames:', frames, '=', (frames / 8).toFixed(1) + 's');
  await browser.close();
})();
