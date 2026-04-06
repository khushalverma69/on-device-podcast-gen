import assert from 'node:assert/strict';

import * as text from '../.tmp-tests/domain/textProcessing.js';
import * as settings from '../.tmp-tests/stores/settingsParsing.js';

const cleaned = text.stripHtmlToText('<h1>Hello</h1><script>x()</script><p>World</p>');
assert.equal(cleaned.includes('Hello'), true);
assert.equal(cleaned.includes('World'), true);
assert.equal(cleaned.includes('x()'), false);

const grounded = text.buildGroundedSourceSections(
  'Short text. This is a longer section with many words that should be included and ranked by length.'
);
assert.equal(grounded.summary.length > 0, true);
assert.equal(grounded.sections.length > 0, true);

const turns = text.parseTurnsFromText('[{"speaker":"HOST1","text":"Hello there, this is long enough."},{"speaker":"HOST1","text":"This should be removed due to non-alternation."},{"speaker":"HOST2","text":"Response with enough words to remain."}]');
assert.equal(turns.length, 2);
assert.equal(turns[0].speaker, 'HOST1');
assert.equal(turns[1].speaker, 'HOST2');

assert.equal(settings.parseThemeMode('dark'), 'dark');
assert.equal(settings.parseThemeMode('unknown'), 'light');
assert.equal(settings.parseBoolean(undefined, true), true);
assert.equal(settings.parseBoolean('false', true), false);

console.log('module-tests: ok');
