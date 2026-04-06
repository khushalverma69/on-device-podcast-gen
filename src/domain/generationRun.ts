import type { SourceType } from '../types';
import type { PendingPipelineRun } from '../stores/pipelineRunStore';

export type GenerationRunInput = {
  topic?: string;
  source?: string;
  sourceType?: SourceType | string;
  sourceText?: string;
};

const PENDING_RUN_MAX_AGE_MS = 1000 * 60 * 30;

export function normalizeGenerationRunInput(input?: GenerationRunInput): Required<GenerationRunInput> {
  return {
    topic: input?.topic?.trim() ?? '',
    source: input?.source?.trim() ?? '',
    sourceType: input?.sourceType?.trim() ?? 'url',
    sourceText: input?.sourceText?.trim() ?? '',
  };
}

export function hasMeaningfulGenerationInput(input?: GenerationRunInput): boolean {
  const normalized = normalizeGenerationRunInput(input);
  return Boolean(normalized.topic || normalized.source || normalized.sourceText);
}

export function getGenerationEpisodeTitle(input?: GenerationRunInput): string {
  const normalized = normalizeGenerationRunInput(input);
  if (normalized.topic) return normalized.topic;
  if (normalized.source) {
    const segments = normalized.source.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) return lastSegment;
  }
  return 'Untitled Episode';
}

export function getRecoverablePendingRun(
  pending: PendingPipelineRun | null,
  now = Date.now(),
): PendingPipelineRun | null {
  if (!pending) return null;
  if (now - pending.updatedAt > PENDING_RUN_MAX_AGE_MS) return null;
  return pending;
}

export function shouldAutoResumePendingRun(
  routeInput?: GenerationRunInput,
  pending?: PendingPipelineRun | null,
  now = Date.now(),
): pending is PendingPipelineRun {
  const recoverablePending = getRecoverablePendingRun(pending ?? null, now);
  if (!recoverablePending) return false;
  return !hasMeaningfulGenerationInput(routeInput);
}
