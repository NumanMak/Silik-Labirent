/* Çevrimdışı önbellek listesi (sw.js) tam mı? — çalıştır: node tests/sw.test.js
 * Playwright'ın setOffline'ı service worker'ın kendi isteklerini engellemediği için eksik dosya e2e'de yakalanmaz; burada doğrudan listeyi denetliyoruz. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('  ok  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}

const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const body = /const ASSETS = \[([\s\S]*?)\];/.exec(sw);
assert.ok(body, 'sw.js içinde ASSETS listesi bulunamadı');
const assets = new Set(Array.from(body[1].matchAll(/'([^']+)'/g)).map((m) => m[1]));

function list(dir, exts) {
  return fs.readdirSync(path.join(ROOT, dir)).filter((f) => exts.some((e) => f.endsWith(e))).map((f) => dir + '/' + f);
}

check('index.html\'in yerel script/stil/ikon bağlantılarının hepsi önbellekte', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const refs = Array.from(html.matchAll(/(?:src|href)="([^"#]+)"/g)).map((m) => m[1]).filter((u) => !/^(https?:|data:|mailto:)/.test(u));
  refs.forEach((u) => assert.ok(assets.has(u) || assets.has(u.replace(/^\.\//, '')), 'önbellekte yok: ' + u));
});

check('js/, css/, simge ve yazı tipi dosyalarının hepsi önbellekte', () => {
  const files = [].concat(list('js', ['.js']), list('css', ['.css']), list('icons', ['.png', '.svg']), list('fonts', ['.woff2']));
  files.forEach((f) => assert.ok(assets.has(f), 'önbellekte yok: ' + f));
  assert.ok(assets.has('manifest.webmanifest'));
});

check('önbellekteki her dosya gerçekten var', () => {
  assets.forEach((a) => {
    if (a === './') return;
    assert.ok(fs.existsSync(path.join(ROOT, a)), 'dosya yok: ' + a);
  });
});

if (failed) { console.log('\n' + failed + ' test başarısız'); process.exit(1); }
console.log('\nHepsi geçti.');
