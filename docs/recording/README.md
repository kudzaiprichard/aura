# Recording the README media

Headless capture of the running system, encoded to GIF + MP4. Lives in this repo
because it drives two others: `aura_dashbord` and `AURA_Chrome_Extension`.

## Prerequisites

- Node 20+, `ffmpeg` on `PATH`, and Google Chrome installed.
- A running stack: PostgreSQL, `aura_api` on `:8000`, `aura_dashbord` on `:3000`.
- Microsoft Edge, **only for the extension clip** — see the note below.

```bash
npm install
cp .env.example .env      # then set AURA_EMAIL / AURA_PASSWORD
```

Credentials are read from `.env` or the environment and are never committed;
`.env` is gitignored.

## Recording

```bash
npm run dashboard     # -> frames-dashboard/
npm run benchmarks    # -> frames-benchmarks/
npm run extension     # -> frames-extension/

./encode.sh ./frames-dashboard  ./out-dashboard  1100 8
./encode.sh ./frames-benchmarks ./out-benchmarks 1200 8
./encode.sh ./frames-extension  ./out-extension   380 8
```

`encode.sh <framedir> <outbase> <width> <fps>` writes both `.gif` (lanczos scale
plus a per-clip palette) and `.mp4`. Copy the results to `docs/media/` in
whichever repo the README lives in.

## How it works

- `recorder.js` — launches Chrome, captures PNG frames on a fixed-rate loop, and
  provides a synthetic cursor with click ripples plus smooth wheel scrolling, so
  the interactions are legible at 8fps.
- `scrub.js` — **redaction, and the reason these clips are safe to publish.** It
  intercepts API responses over CDP `Fetch` and rewrites the JSON before React
  renders it: identities in the predictions feed become synthetic, and long hex
  account identifiers are masked everywhere.
  `assertClean()` then re-checks the rendered DOM on every page and throws
  rather than let a recording finish with real data in frame.

  An earlier version rewrote the DOM directly. Don't go back to that: React
  re-renders restore the original text between frames, so a clip can silently
  capture real data even when the rewrite appears to work.
- `config.js` — all machine- and account-specific values.

## Why the extension clip uses Edge

Chrome 137+ removed the `--load-extension` command-line switch, and the
`DisableLoadExtensionCommandLineSwitch` feature override no longer works
(verified against Chrome 152). Edge is the same Chromium and still honours the
flag, so `flow-extension.js` launches Edge and renders the popup at its real
`chrome-extension://` origin, where the `chrome.*` APIs behave normally.

## What the extension clip does not show

The in-Gmail verdict popover is not captured. It needs a signed-in Google
account and an OAuth grant for the extension, so it can't be automated here —
and it would put a real inbox on screen. Record that one by hand if you want it.
