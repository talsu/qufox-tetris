const path = require('path');

const distEntry = path.join(__dirname, '../dist/server/index.js');

try {
    require(distEntry);
} catch (err) {
    console.error('[server] Failed to start compiled server runtime.');
    console.error('[server] Run `npm run server:build` first, then retry `npm run server` or use `npm run server:dev`.');
    throw err;
}
