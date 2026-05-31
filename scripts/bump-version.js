// Run before each deploy: updates version.json with current timestamp.
// Vercel runs this as the buildCommand so every deploy gets a unique build ID.
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const out = { v: pkg.version, build: Math.floor(Date.now() / 1000) };
fs.writeFileSync(path.join(__dirname, '../version.json'), JSON.stringify(out) + '\n');
console.log('[bump-version] version.json →', out);
