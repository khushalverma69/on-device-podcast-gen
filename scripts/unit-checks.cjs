const assert = require('node:assert/strict');

function stripHtmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTurnsFallback(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim().match(/^(HOST1|HOST2)\s*[:\-]\s*(.+)$/i))
    .filter(Boolean)
    .map((m) => ({ speaker: m[1].toUpperCase(), text: m[2].trim() }));
}

function parseThemeMode(raw) {
  return raw === 'dark' ? 'dark' : 'light';
}

(function run() {
  const cleaned = stripHtmlToText('<h1>Hello</h1><script>x()</script><p>World</p>');
  assert.equal(cleaned.includes('Hello'), true);
  assert.equal(cleaned.includes('World'), true);
  assert.equal(cleaned.includes('x()'), false);

  const turns = parseTurnsFallback('HOST1: Hi\nHOST2- Hello\nOTHER: no');
  assert.equal(turns.length, 2);
  assert.equal(turns[0].speaker, 'HOST1');
  assert.equal(turns[1].speaker, 'HOST2');

  assert.equal(parseThemeMode('dark'), 'dark');
  assert.equal(parseThemeMode('anything-else'), 'light');

  console.log('unit-checks: ok');
})();
