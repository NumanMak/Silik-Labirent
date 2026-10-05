/* Tüm oyunu (HTML + CSS + JS + yazı tipi + simgeler) tek bir dosyaya gömer: silik.html
 * İnternet ya da başka dosya gerekmeden, çift tıklayarak ya da herhangi bir yere yükleyerek oynanır.
 *   node tools/build-single.js            -> silik.html
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f));
const text = (f) => read(f).toString('utf8');
const b64 = (f) => read(f).toString('base64');

let html = text('index.html');

// 1) CSS: yazı tiplerini data URI olarak göm
let css = text('css/style.css').replace(/url\("\.\.\/(fonts\/[^"]+\.woff2)"\)/g, (_, f) => `url("data:font/woff2;base64,${b64(f)}")`);
if (/url\("\.\./.test(css)) throw new Error('CSS içinde gömülmemiş göreli url kaldı');
html = html.replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${css}\n</style>`);

// 2) Simgeler: favicon (SVG) ve iOS ana ekran simgesi (PNG) data URI; manifest tek dosyada kullanılmaz
const svg = text('icons/icon.svg').replace(/\s*\n\s*/g, ' ').trim();
html = html.replace('<link rel="icon" href="icons/icon.svg" type="image/svg+xml">', () => `<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" type="image/svg+xml">`);
html = html.replace('<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">', () => `<link rel="apple-touch-icon" href="data:image/png;base64,${b64('icons/apple-touch-icon.png')}">`);
html = html.replace('  <link rel="manifest" href="manifest.webmanifest">\n', '');

// 3) Betikler: aynı sırayla satır içi (her biri ayrı <script>, böylece üst düzey `this` = window korunur)
let scripts = 0;
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => {
  const js = text(f);
  if (/<\/script/i.test(js)) throw new Error(f + ' içinde </script bulundu');
  scripts++;
  return `<script>\n${js}\n</script>`;
});
if (scripts !== 9) throw new Error('beklenen 9 betik, gömülen: ' + scripts);

// 3b) Tek dosyada ana ekrana ekleme/manifest yok: altbilgi metni buna uygun olsun
const foot = '<footer class="foot">Telefonda ana ekrana ekleyerek tam ekran oynayabilirsin.</footer>';
if (!html.includes(foot)) throw new Error('altbilgi bulunamadı');
html = html.replace(foot, '<footer class="foot">Silik · kâğıt, kurşun kalem ve biraz unutkanlık.</footer>');

// 4) Tek dosya bayrağı (service worker kaydı atlanır) — betiklerden önce
html = html.replace('<script>\n/* Silik — küçük yardımcılar', () => '<script>window.SILIK_STANDALONE = true;</script>\n<script>\n/* Silik — küçük yardımcılar');
if (!html.includes('SILIK_STANDALONE')) throw new Error('bayrak eklenemedi');

// 5) Doğrulama: dış kaynak referansı kalmamalı
const leftovers = html.match(/(?:src|href)="(?!#|data:)[^"]*"/g);
if (leftovers) throw new Error('dış kaynak referansı kaldı: ' + leftovers.join(', '));

html = html.replace('<html lang="tr">', '<html lang="tr">\n<!-- Silik — tek dosyalık sürüm. Kaynak: tools/build-single.js ile üretildi, elle düzenleme. -->');
const out = path.join(ROOT, 'silik.html');
fs.writeFileSync(out, html);
console.log('yazıldı: silik.html', (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
