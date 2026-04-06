import { initLlama, type LlamaContext } from 'llama.rn';

import { useModelStore } from '../stores/modelStore';
import { useSettingsStore } from '../stores/settingsStore';
import { buildGroundedSourceSections, parseTurnsFromText } from '../domain/textProcessing';
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
  const grounded = buildGroundedSourceSections(sourceContext || '');
  return [
    `Topic: ${topic}`,
    grounded.summary
      ? `Source Summary:\n${grounded.summary}`
      : 'Source Summary: (none provided)',
    grounded.sections.length > 0
      ? `Top Source Sections:\n${grounded.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : 'Top Source Sections: (none provided)',
    `Style: ${useSettingsStore.getState().scriptStyle}`,
    `Write a 2-host podcast conversation with exactly ${turns} turns.`,
    'Alternate speakers HOST1 and HOST2.',
    'Output only strict JSON as an array of objects: [{"speaker":"HOST1|HOST2","text":"..."}].',
    'Do not include markdown or code fences.',
    'Keep each line concise and natural for spoken audio.',
  ].join('\n');
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
