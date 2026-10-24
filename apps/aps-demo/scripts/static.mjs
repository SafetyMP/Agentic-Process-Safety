import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
let bytes = 0;
let files = 0;
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) { walk(path); continue; }
    const size = statSync(path).size;
    assert.ok(size < 16 * 1024 * 1024, `Oversized publish asset: ${item.name}`);
    bytes += size; files++;
    assert.ok(!/\.(?:sqlite|pem|key|py|map)$/.test(item.name), `Private or nonstatic publish file: ${item.name}`);
    if (/\.(?:js|html|css)$/.test(item.name)) {
      const text = readFileSync(path, 'utf8');
      assert.ok(!/(?:BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|sk-proj-[A-Za-z0-9]{15}|ghp_[A-Za-z0-9]{20})/.test(text), 'Credential material in publish asset');
      // Libraries may include documentation links and SVG namespaces; forbid executable network primitives and remote asset markup.
      assert.ok(!/\b(?:fetch\s*\(|new\s+(?:WebSocket|EventSource|XMLHttpRequest)\s*\(|navigator\.sendBeacon\s*\()/m.test(text), `Runtime networking found: ${item.name}`);
      assert.ok(!/(?:src|href)=["']https?:\/\/|@import\s+["']https?:\/\/|url\(["']?https?:\/\//i.test(text), `Remote asset reference: ${item.name}`);
      assert.ok(!/node:(?:fs|child_process)|aps_governance|\.venv\/bin/.test(text), 'Backend dependency in browser bundle');
    }
  }
}
walk(dist);
assert.ok(files < 10000 && bytes < 128 * 1024 * 1024, 'Publish capacity exceeded');
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
assert.match(html, /src="\/agentic-process-safety\/assets\//);
assert.ok(!/src="\/assets\//.test(html), 'Incorrect Pages asset base');
console.log(`Static publish contract: ${files} files, ${bytes} bytes; subpath assets, no backend/network primitives or private files.`);
