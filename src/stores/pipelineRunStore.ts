import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SourceType } from '../types';

const KEY = 'private-podcast.pipeline-run';

export type PendingPipelineRun = {
  topic?: string;
  source?: string;
  sourceType?: SourceType | string;
  sourceText?: string;
  stage: number;
  updatedAt: number;
  lastError?: string;
};

export async function getPendingPipelineRun(): Promise<PendingPipelineRun | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPipelineRun;
  } catch {
    return null;
  }
}

export async function savePendingPipelineRun(run: PendingPipelineRun): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    // ignore persistence errors
  }
}

export async function clearPendingPipelineRun(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore persistence errors
  }
}
