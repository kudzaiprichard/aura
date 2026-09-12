const R = require('./recorder');
const cfg = require('./config');
const { sleep, BASE } = R;

(async () => {
  const { browser, page } = await R.launch();
  await R.login(page);

  // Auth happens off-camera; this clip is about benchmarking.
  await page.type('input[type="email"]', cfg.email());
  await page.type('input[autocomplete="current-password"]', cfg.password());
  await page.click('button[type="submit"]');
  await sleep(4500);

  await page.goto(BASE + '/models', { waitUntil: 'networkidle2' });
  await sleep(2600);
  await R.hideChrome(page);
  await R.inject(page);
  await sleep(600);

  const rec = new R.Rec(page, './frames-benchmarks');
  rec.start(8);
  await sleep(1500);                                    // registry: four versions on file
  await R.moveTo(page, 700, 300, 600);
  await sleep(900);

  await R.click(page, 'a[href="/benchmarks"]', { pause: 3000 });  // sidebar -> Benchmarks
  await R.hideChrome(page);
  await R.inject(page);
  await sleep(1200);

  await R.click(page, 'button[role="tab"]', { pause: 1900, nth: 1 });  // Datasets: 1,600 labelled rows
  await sleep(600);
  await R.click(page, 'button[role="tab"]', { pause: 1500, nth: 0 });  // back to Runs
  await sleep(500);

  await R.click(page, 'tbody tr', { pause: 4000 });     // open the 4-version run
  await R.hideChrome(page);
  await R.inject(page);
  await sleep(1600);

  // Walk the winning column so the eye lands on the metric matrix.
  await R.moveTo(page, 815, 505, 650);
  await R.moveTo(page, 815, 545, 550);
  await R.moveTo(page, 815, 585, 550);
  await R.moveTo(page, 815, 625, 700);
  await sleep(1600);

  const frames = await rec.stop();
  console.log('frames captured:', frames, '=', (frames / 8).toFixed(1) + 's');
  await browser.close();
})();
