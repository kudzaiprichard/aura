// Shared recording helpers: fake cursor, smooth scroll, frame capture.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const cfg = require('./config');
const CHROME = cfg.CHROME;
const BASE = cfg.BASE;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CURSOR_JS = `
(() => {
  if (window.__cur) return;
  const c = document.createElement('div');
  c.id = '__aura_cursor';
  c.style.cssText = [
    'position:fixed','left:0','top:0','width:22px','height:22px','z-index:2147483647',
    'pointer-events:none','transition:transform .45s cubic-bezier(.4,0,.2,1)',
    'transform:translate(700px,450px)',
  ].join(';');
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22">' +
    '<path d="M3 2 L3 17 L7.2 13.2 L10 19.5 L12.6 18.3 L9.9 12.2 L15.5 12.1 Z" ' +
    'fill="#fff" stroke="#0b1020" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c);
  window.__cur = c;
  window.__moveCur = (x, y) => { c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  window.__ripple = (x, y) => {
    const r = document.createElement('div');
    r.style.cssText = [
      'position:fixed','z-index:2147483646','pointer-events:none','border-radius:50%',
      'left:' + (x - 6) + 'px','top:' + (y - 6) + 'px','width:12px','height:12px',
      'border:2px solid rgba(96,165,250,.95)','background:rgba(96,165,250,.22)',
      'transition:all .5s ease-out',
    ].join(';');
    document.body.appendChild(r);
    requestAnimationFrame(() => {
      r.style.left = (x - 26) + 'px'; r.style.top = (y - 26) + 'px';
      r.style.width = '52px'; r.style.height = '52px'; r.style.opacity = '0';
    });
    setTimeout(() => r.remove(), 620);
  };
})();
`;

class Rec {
  constructor(page, dir) {
    this.page = page; this.dir = dir; this.n = 0; this.on = false;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
  start(fps = 8) {
    this.on = true;
    const gap = 1000 / fps;
    const loop = async () => {
      while (this.on) {
        const t0 = Date.now();
        try {
          const buf = await this.page.screenshot({ type: 'png' });
          fs.writeFileSync(path.join(this.dir, String(this.n++).padStart(5, '0') + '.png'), buf);
        } catch (_) { /* mid-navigation; skip frame */ }
        const wait = gap - (Date.now() - t0);
        if (wait > 0) await sleep(wait);
      }
    };
    this.p = loop();
  }
  async stop() { this.on = false; await this.p; return this.n; }
}

async function inject(page) { await page.evaluate(CURSOR_JS); }

async function hideChrome(page) {
  await page.addStyleTag({
    content: 'nextjs-portal{display:none!important} *{scrollbar-width:none!important} ::-webkit-scrollbar{display:none!important}',
  });
}

// Move the fake cursor to an element, ripple, then really click it.
async function click(page, selector, { pause = 700, nth = 0 } = {}) {
  const els = await page.$$(selector);
  const el = els[nth];
  if (!el) throw new Error('no element for ' + selector + ' [' + nth + ']');
  const box = await el.boundingBox();
  if (!box) throw new Error('element not visible: ' + selector);
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + Math.min(box.height / 2, 24));
  await page.evaluate((a, b) => window.__moveCur && window.__moveCur(a, b), x, y);
  await sleep(550);
  await page.evaluate((a, b) => window.__ripple && window.__ripple(a, b), x, y);
  await sleep(180);
  await el.click();
  await sleep(pause);
}

async function moveTo(page, x, y, hold = 400) {
  await page.evaluate((a, b) => window.__moveCur && window.__moveCur(a, b), x, y);
  await sleep(hold);
}

// Smooth wheel scroll so the GIF doesn't jump.
async function scroll(page, total, step = 60, delay = 28) {
  const dir = Math.sign(total);
  for (let i = 0; i < Math.abs(total) / step; i++) {
    await page.mouse.wheel({ deltaY: dir * step });
    await sleep(delay);
  }
}

async function launch() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--window-size=1440,900', '--hide-scrollbars', '--force-device-scale-factor=1',
           '--font-render-hinting=none', '--disable-lcd-text'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  return { browser, page };
}

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await hideChrome(page);
  await inject(page);
}

module.exports = { Rec, inject, hideChrome, click, moveTo, scroll, launch, login, sleep, BASE };
