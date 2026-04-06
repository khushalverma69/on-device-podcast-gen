import * as FileSystem from 'expo-file-system/legacy';

import { generatePodcastScript } from './llm';
import { buildSourceContext } from './source';
import { releaseTts, synthesizeScriptToWav } from './tts';
import { useModelStore } from '../stores/modelStore';
import type { SourceType } from '../types';
import { releaseLlm } from './llm';
import { trackError, trackEvent } from './telemetry';

export interface PipelineCallbacks {
  onStageChange: (stage: number, label: string) => void;
  onTurn: (speaker: 'HOST1' | 'HOST2', text: string) => void;
  onComplete: (result: {
    episodeId: string;
    audioPath: string;
    durationSeconds: number;
    modelUsed: string;
  }) => void;
  onError: (message: string) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function runPipeline(
  input: {
    topic?: string;
    source?: string;
    sourceType?: SourceType | string;
    sourceText?: string;
  },
  callbacks: PipelineCallbacks,
): Promise<void> {
  try {
    trackEvent('pipeline.start', {
      sourceType: input.sourceType ?? 'url',
      hasSource: Boolean(input.source),
      hasTopic: Boolean(input.topic),
    });
    callbacks.onStageChange(0, 'Reading document...');
    const source = await buildSourceContext(input);
    trackEvent('pipeline.source.ready', {
      topicLength: source.inferredTopic.length,
      contextLength: source.sourceContext.length,
    });
    await sleep(250);

    callbacks.onStageChange(1, 'Writing script...');
    const turns = await generatePodcastScript(source.inferredTopic, source.sourceContext);
    trackEvent('pipeline.script.ready', { turns: turns.length });
    for (const turn of turns) {
      callbacks.onTurn(turn.speaker, turn.text);
      await sleep(40);
    }

    callbacks.onStageChange(2, 'Synthesising voices...');
    const episodeId = generateId();
    const podcastsDir = `${FileSystem.documentDirectory ?? ''}podcasts/`;
    await FileSystem.makeDirectoryAsync(podcastsDir, { intermediates: true });
    const wavPath = `${podcastsDir}${episodeId}.wav`;
    const ttsResult = await synthesizeScriptToWav(turns, wavPath);
    trackEvent('pipeline.tts.ready', {
      durationSeconds: ttsResult.durationSeconds,
    });

    callbacks.onStageChange(3, 'Assembling audio...');
    await sleep(200);

    const modelUsed = useModelStore.getState().activeModelId ?? 'llama.rn';
    callbacks.onComplete({
      episodeId,
      audioPath: ttsResult.audioUri,
      durationSeconds: Math.max(1, Math.round(ttsResult.durationSeconds)),
      modelUsed,
    });
    trackEvent('pipeline.complete', { episodeId, modelUsed });
  } catch (e: any) {
    trackError('pipeline.error', {
      message: e?.message ?? 'Pipeline failed',
      sourceType: input.sourceType ?? 'url',
    });
    callbacks.onError(e?.message ?? 'Pipeline failed');
  } finally {
    // Release heavyweight contexts between runs to reduce memory pressure on low-end devices.
    await Promise.allSettled([releaseLlm(), releaseTts()]);
  }
}
