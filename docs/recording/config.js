// All environment-specific values live here. Nothing secret is committed:
// copy .env.example to .env and fill it in, or export the vars in your shell.
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
}

function required(name, hint) {
    const v = process.env[name];
    if (!v) {
        console.error(`Missing ${name}. Set it in docs/recording/.env or your shell.`);
        if (hint) console.error(`  ${hint}`);
        process.exit(1);
    }
    return v;
}

module.exports = {
    BASE: process.env.AURA_BASE_URL || 'http://localhost:3000',
    CHROME: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    // Chrome 137+ dropped --load-extension; Edge is the same Chromium and still honours it.
    EDGE: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    EXT_DIR: process.env.AURA_EXT_DIR || '../../../AURA_Chrome_Extension',
    EXT_ID: process.env.AURA_EXT_ID || 'faojminhcoapnnegicphfifkpfjcokfa',
    email: () => required('AURA_EMAIL', 'The dashboard account to sign in as, e.g. admin@aura.com'),
    password: () => required('AURA_PASSWORD', 'That account\'s password. Never commit it.'),
};
