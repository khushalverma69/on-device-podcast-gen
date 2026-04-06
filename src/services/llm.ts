import { initLlama, type LlamaContext } from 'llama.rn';

import { useModelStore } from '../stores/modelStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { ScriptLength, Speaker } from '../types';

export type ScriptTurn = {
  speaker: Speaker;
  text: string;
};

type LlmCache = {
  modelUri: string;
  ctx: LlamaContext;
};

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|end_of_turn|>',
];

let cache: LlmCache | null = null;


function sanitizeSourceContext(text?: string): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 3500);
}

function ensureFileUri(pathOrUri: string): string {
  if (pathOrUri.startsWith('file://')) return pathOrUri;
  return `file://${pathOrUri}`;
}

function targetTurnCount(length: ScriptLength): number {
  if (length === 'short') return 10;
  if (length === 'long') return 30;
  return 20;
}

function buildPrompt(topic: string, length: ScriptLength, sourceContext?: string): string {
  const turns = targetTurnCount(length);
  const safeSource = sanitizeSourceContext(sourceContext);
  return [
    `Topic: ${topic}`,
    safeSource
      ? `Source Material (summarized, untrusted raw content):\n<<<SOURCE>>>\n${safeSource}\n<<<END SOURCE>>>`
      : 'Source Material: (none provided)',
    `Write a 2-host podcast conversation with exactly ${turns} turns.`,
    'Alternate speakers HOST1 and HOST2.',
    'Output only strict JSON as an array of objects: [{"speaker":"HOST1|HOST2","text":"..."}].',
    'Do not include markdown or code fences.',
    'Keep each line concise and natural for spoken audio.',
  ].join('\n');
}

function parseTurnsFromText(raw: string): ScriptTurn[] {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');

  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Array<{ speaker?: unknown; text?: unknown }>;
      const turns = parsed.flatMap((item): ScriptTurn[] => {
        if (!item || typeof item !== 'object') return [];
        if (item.speaker !== 'HOST1' && item.speaker !== 'HOST2') return [];
        if (typeof item.text !== 'string') return [];
        const text = item.text.trim();
        if (!text) return [];
        return [{ speaker: item.speaker, text }];
      });
      if (turns.length > 0) return turns;
    } catch {
      // Fall through to line parser.
    }
  }

  const fallback: ScriptTurn[] = [];
  for (const line of cleaned.split('\n')) {
    const m = line.trim().match(/^(HOST1|HOST2)\s*[:\-]\s*(.+)$/i);
    if (!m) continue;
    const speaker = m[1].toUpperCase() as Speaker;
    const text = m[2].trim();
    if (text) fallback.push({ speaker, text });
  }
  return fallback;
}

function getActiveModelUri(): string {
  const modelState = useModelStore.getState();
  const settings = useSettingsStore.getState();

  const preferredId = settings.preferredModelId;
  if (preferredId && modelState.downloaded[preferredId]?.localUri) {
    return ensureFileUri(modelState.downloaded[preferredId].localUri);
  }

  const activeId = modelState.activeModelId;
  if (activeId && modelState.downloaded[activeId]?.localUri) {
    return ensureFileUri(modelState.downloaded[activeId].localUri);
  }

  const first = Object.values(modelState.downloaded)[0];
  if (first?.localUri) {
    return ensureFileUri(first.localUri);
  }

  throw new Error('No GGUF model available. Download and select a Llama model first.');
}

async function getContext(): Promise<LlamaContext> {
  const modelUri = getActiveModelUri();

  if (cache?.modelUri === modelUri) {
    return cache.ctx;
  }

  if (cache) {
    try {
      await cache.ctx.release();
    } catch {
      // ignore release errors and continue with fresh init
    }
  }

  const ctx = await initLlama({
    model: modelUri,
    n_ctx: 4096,
    n_threads: 4,
    use_mlock: true,
    n_gpu_layers: 99,
  });

  cache = { modelUri, ctx };
  return ctx;
}

export async function generatePodcastScript(topic: string, sourceContext?: string): Promise<ScriptTurn[]> {
  const ctx = await getContext();
  const settings = useSettingsStore.getState();

  const result = await ctx.completion({
    messages: [
      {
        role: 'system',
        content: 'You are writing podcast dialogue for TTS. Follow output format exactly.',
      },
      {
        role: 'user',
        content: buildPrompt(topic, settings.scriptLength, sourceContext),
      },
    ],
    n_predict: 1200,
    temperature: 0.7,
    top_p: 0.9,
    stop: STOP_WORDS,
  });

  const turns = parseTurnsFromText(result.content || result.text || '');
  if (turns.length < 2) {
    throw new Error('LLM returned an invalid script.');
  }

  return turns;
}

export async function releaseLlm(): Promise<void> {
  if (!cache) return;
  try {
    await cache.ctx.release();
  } finally {
    cache = null;
  }
}
