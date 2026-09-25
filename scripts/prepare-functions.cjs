const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const functionsDir = path.join(projectRoot, 'functions');
const sourceBundle = path.join(projectRoot, 'dist', 'server.cjs');
const targetDir = path.join(functionsDir, 'dist');
const targetBundle = path.join(targetDir, 'server.cjs');

if (!fs.existsSync(sourceBundle)) {
  throw new Error(`Missing server bundle: ${sourceBundle}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceBundle, targetBundle);
console.log(`Prepared Firebase Functions bundle at ${targetBundle}`);
