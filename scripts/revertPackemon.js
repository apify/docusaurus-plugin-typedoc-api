/**
 * The packemon build system breaks the HMR in `playground` by overwriting the `packages/plugin/package.json`'s `main` entry on every build (`src/index.ts` -> `lib/index.js`).
 * This script reverts this change by overwriting the `main` entry back to `src/index.ts` in the `packages/plugin/package.json` file.
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../packages/plugin/package.json');
const packageJson = require(packageJsonPath);

packageJson.main = 'src/index.ts';

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Reverted `main` entry in `packages/plugin/package.json` back to `src/index.ts`');

// Run this script after `yarn run pack` to fix the HMR in `playground`.
