import assert from 'node:assert/strict';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import ts from 'typescript';

const dist = resolve(process.argv[2] || fileURLToPath(new URL('../dist/', import.meta.url)));
const inventory = new Map();
let bytes = 0;
let files = 0;
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    assert.ok(!lstatSync(path).isSymbolicLink(), `Symlink in publish tree: ${path}`);
    if (item.isDirectory()) { walk(path); continue; }
    assert.ok(item.isFile(), `Nonstatic file: ${path}`);
    const data = readFileSync(path);
    inventory.set(path.slice(dist.length + 1), { data, sha256: createHash('sha256').update(data).digest('hex') });
    const size = data.length;
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
assert.match(html, /<script\b[^>]*src="[^" ]+\.js"/);
assert.ok(!/<base\b/i.test(html), 'Base element overrides project URL resolution');

// Resolve the actual built graph against both case-sensitive hosting roots.
// No server fallback: only the exact inventory bytes may satisfy a request.
const evidence = [];
for (const prefix of ['/Agentic-Process-Safety/', '/agentic-process-safety/']) {
  const root = new URL(prefix, 'https://pages.invalid');
  const visited = new Set();
  let edges = 0;
  function visit(name) {
    if (visited.has(name)) return;
    visited.add(name);
    const file = inventory.get(name);
    assert.ok(file, `Missing built file: ${name}`);
    const text = file.data.toString('utf8');
    let references = [];
    if (name.endsWith('.html')) {
      references = [...text.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m => m[1]);
    } else if (name.endsWith('.js')) {
      // Parse syntax so documentation strings containing import examples cannot
      // masquerade as executable module edges.
      const tree = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      function scan(node) {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
          assert.ok(ts.isStringLiteral(node.moduleSpecifier), 'Nonliteral module');
          references.push(node.moduleSpecifier.text);
        }
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          assert.ok(ts.isStringLiteral(node.arguments[0]), 'Nonliteral dynamic module');
          references.push(node.arguments[0].text);
        }
        if (ts.isNewExpression(node) && node.expression.getText(tree) === 'URL') {
          assert.ok(node.arguments && ts.isStringLiteral(node.arguments[0]), 'Nonliteral URL asset');
          references.push(node.arguments[0].text);
        }
        // Include literal Vite preload dependency tables, if emitted.
        if (ts.isArrayLiteralExpression(node)) {
          for (const value of node.elements) {
            if (ts.isStringLiteral(value) && /^(?:\.\.?\/|assets\/).+\.(?:js|css)$/.test(value.text)) references.push(value.text);
          }
        }
        ts.forEachChild(node, scan);
      }
      scan(tree);
    } else if (name.endsWith('.css')) {
      references = [...text.matchAll(/(?:url\(\s*|@import\s*)["']?([^"')\s;]+)["']?\s*\)?/g)].map(m => m[1]);
    }
    for (const reference of new Set(references)) {
      if (/^(?:data:|#)/.test(reference)) continue;
      assert.ok(!reference.includes('\\') && [...reference].every(c => c.charCodeAt(0) > 32), `Unsafe asset URL: ${reference}`);
      const url = new URL(reference, new URL(name, root));
      assert.equal(url.origin, root.origin, `External asset: ${reference}`);
      assert.ok(url.pathname.startsWith(prefix), `Asset escapes case-sensitive project root: ${url.pathname} from ${name}`);
      assert.ok(!url.search && !url.hash, `Unexpected asset suffix: ${reference}`);
      const target = decodeURIComponent(url.pathname.slice(prefix.length));
      assert.ok(!target.includes('\\'), 'Encoded path separator');
      assert.ok(!target.split('/').some(p => p === '..' || p === '.'), 'Encoded traversal');
      const expected = inventory.get(target);
      assert.ok(expected, `Missing referenced asset: ${target} from ${name}`);
      const served = readFileSync(resolve(dist, target));
      assert.equal(createHash('sha256').update(served).digest('hex'), expected.sha256, 'Served asset bytes differ');
      edges++;
      visit(target);
    }
  }
  visit('index.html');
  assert.equal(visited.size, inventory.size, 'Unreferenced publish files');
  evidence.push({ prefix, edges, files: [...visited].sort().map(path => ({ path, bytes: inventory.get(path).data.length, sha256: inventory.get(path).sha256 })) });
}
console.log(`Static publish contract: ${files} files, ${bytes} bytes; both case-sensitive project roots, no backend/network primitives or private files.`);
console.log(JSON.stringify(evidence, null, 2));
