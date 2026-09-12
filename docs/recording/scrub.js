// Network-level redaction. Rewrites API JSON before React ever sees it, so the
// DOM can't be re-rendered back to real data mid-recording.

const PAIRS = [
  ['Your invoice is available', 'Billing <noreply@notify-invoice.co>'],
  ['Your account has been funded', 'Payments <alerts@secure-pay.co>'],
  ['Action required: verify your mailbox', 'IT Service Desk <verify@mail-secure.co>'],
  ['This week in engineering: agents, graphs and memory', 'Weekly Digest <digest@dev-weekly.co>'],
  ['You have a new connection request', 'Network <invitations@connect-hub.co>'],
  ['Re: Contract renewal', 'Accounts <accounts@northwind-ltd.co>'],
  ['Premiere starting now: watch live', 'Streaming <noreply@stream-alerts.co>'],
  ['Re: Beginners course enrolment', 'Training <courses@learn-hub.co>'],
  ['Shared document needs your signature', 'Document Services <sign@docs-portal.co>'],
  ['Unusual sign-in blocked', 'Security <no-reply@account-guard.co>'],
  ['Your parcel could not be delivered', 'Delivery <tracking@parcel-track.co>'],
  ['Payroll update for this month', 'HR Operations <payroll@intra-hr.co>'],
];

const maskHex = (s) => s.replace(/\b[0-9a-f]{24,}\b/gi, (m) => m.slice(0, 6) + '…');

// Any address that looks like it came from a real mailbox rather than the
// generated phishing corpus.
const REAL_ADDR = /@(gmail|hotmail|yahoo|outlook|live|icloud|aol)\.[a-z.]+|invitations@linkedin\.com/i;

function scrubJson(node, ctx) {
  if (Array.isArray(node)) return node.map((v) => scrubJson(v, ctx));
  if (node && typeof node === 'object') {
    const hasEmail = typeof node.subject === 'string' && typeof node.sender === 'string';
    if (hasEmail && (ctx.forceAll || REAL_ADDR.test(node.sender) || REAL_ADDR.test(node.subject))) {
      const p = PAIRS[ctx.i++ % PAIRS.length];
      node.subject = p[0];
      node.sender = p[1];
    }
    for (const k of Object.keys(node)) {
      if (typeof node[k] === 'string') node[k] = maskHex(node[k]);
      else node[k] = scrubJson(node[k], ctx);
    }
    return node;
  }
  if (typeof node === 'string') return maskHex(node);
  return node;
}

function scrubBody(text, url) {
  let data;
  try { data = JSON.parse(text); } catch { return maskHex(text); }
  // The predictions feed is the live mailbox; replace every identity there.
  const forceAll = /\/analysis\/predictions/.test(url);
  return JSON.stringify(scrubJson(data, { i: 0, forceAll }));
}

async function attach(page) {
  const client = await page.createCDPSession();
  await client.send('Fetch.enable', {
    patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Response' }],
  });
  client.on('Fetch.requestPaused', async (ev) => {
    const { requestId, request, responseStatusCode, responseHeaders } = ev;
    // Never buffer an SSE stream - it would never complete.
    if (/\/events\b/.test(request.url)) {
      client.send('Fetch.continueRequest', { requestId }).catch(() => {});
      return;
    }
    try {
      const res = await client.send('Fetch.getResponseBody', { requestId });
      const text = res.base64Encoded
        ? Buffer.from(res.body, 'base64').toString('utf8')
        : res.body;
      const out = scrubBody(text, request.url);
      await client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: responseStatusCode || 200,
        responseHeaders: (responseHeaders || []).filter(
          (h) => !/^content-length$/i.test(h.name),
        ),
        body: Buffer.from(out, 'utf8').toString('base64'),
      });
    } catch {
      client.send('Fetch.continueRequest', { requestId }).catch(() => {});
    }
  });
  return client;
}

const LEAK_PATTERNS = [
  /@gmail\.com/i, /@hotmail\.com/i, /@yahoo\./i, /@outlook\./i,
  /invitations@linkedin\.com/i, /Mafunga/i, /Sigauke/i, /Prichard/i,
  /Moyo/i, /Rebecca/i, /[0-9a-f]{24,}/i,
];

async function assertClean(page, where) {
  const txt = await page.evaluate(() => document.body.innerText);
  const hits = LEAK_PATTERNS.filter((re) => re.test(txt)).map((re) => re.source);
  if (hits.length) throw new Error(`REDACTION LEAK on ${where}: ${hits.join(', ')}`);
}

module.exports = { attach, assertClean, scrubBody };
