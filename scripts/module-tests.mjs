import assert from 'node:assert/strict';

import * as generationRun from '../.tmp-tests/domain/generationRun.js';
import * as playerRecovery from '../.tmp-tests/domain/playerRecovery.js';
import * as sourceValidation from '../.tmp-tests/domain/sourceValidation.js';
import * as text from '../.tmp-tests/domain/textProcessing.js';
import * as telemetry from '../.tmp-tests/services/telemetry.js';
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

assert.deepEqual(
  generationRun.normalizeGenerationRunInput({ topic: '  AI  ', sourceType: undefined }),
  { topic: 'AI', source: '', sourceType: 'url', sourceText: '' }
);
assert.equal(
  generationRun.getGenerationEpisodeTitle({ source: 'file:///docs/notes.pdf' }),
  'notes.pdf'
);
assert.equal(
  generationRun.shouldAutoResumePendingRun(
    { topic: '', source: '', sourceType: 'url', sourceText: '' },
    { topic: 'Recovered', source: 'file:///draft.pdf', sourceType: 'pdf', stage: 1, updatedAt: Date.now() }
  ),
  true
);
assert.equal(
  generationRun.shouldAutoResumePendingRun(
    { topic: '', source: '', sourceType: 'url', sourceText: '' },
    { topic: 'Recovered', source: 'file:///draft.pdf', sourceType: 'pdf', stage: 1, updatedAt: Date.now(), lastError: 'Bad PDF' }
  ),
  false
);
assert.equal(
  generationRun.shouldAutoResumePendingRun(
    { topic: 'Fresh run', source: '', sourceType: 'url', sourceText: '' },
    { topic: 'Recovered', source: 'file:///draft.pdf', sourceType: 'pdf', stage: 1, updatedAt: Date.now() }
  ),
  false
);
assert.equal(sourceValidation.isMeaningfulSourceText('Too short to use.'), false);
assert.equal(
  sourceValidation.isMeaningfulSourceText(
    'This article has enough useful words to describe a topic in a way that gives the podcast generator real material to work from during the script writing stage.'
  ),
  true
);
assert.match(
  sourceValidation.getSourceValidationMessage({ sourceType: 'pdf' }),
  /PDF/i
);
assert.equal(
  sourceValidation.validateSourceText({
    sourceType: 'camera',
    sourceText: 'Tiny note',
  })?.includes('camera capture'),
  true
);
assert.equal(
  playerRecovery.pickRestorableEpisodeId(
    [{ id: 'ep-1' }, { id: 'ep-2' }, { id: 'ep-3' }],
    'ep-2',
    ['ep-1', 'ep-2']
  ),
  'ep-2'
);
assert.equal(
  playerRecovery.pickRestorableEpisodeId(
    [{ id: 'ep-1' }, { id: 'ep-2' }, { id: 'ep-3' }],
    'ep-3',
    ['ep-2']
  ),
  'ep-2'
);
assert.deepEqual(
  playerRecovery.filterEpisodeIds(['ep-1', 'ep-2', 'ep-1'], ['ep-2', 'ep-3']),
  ['ep-2']
);
assert.deepEqual(
  playerRecovery.filterEpisodeMap({ 'ep-1': 10, 'ep-2': 20 }, ['ep-2']),
  { 'ep-2': 20 }
);
telemetry.clearTelemetry();
telemetry.trackEvent('pipeline.start', { sourceType: 'url' });
telemetry.trackWarn('source.validation_failed', { sourceType: 'pdf' });
telemetry.trackError('player.audio_missing', { episodeId: 'ep-1' });
const telemetryEntries = telemetry.readTelemetry();
assert.equal(telemetryEntries.length, 3);
assert.equal(telemetryEntries[0].event, 'pipeline.start');
assert.equal(telemetryEntries[2].level, 'error');
telemetry.clearTelemetry();
assert.equal(telemetry.readTelemetry().length, 0);

console.log('module-tests: ok');
