import type { SourceType } from '../types';

const MIN_SOURCE_WORDS = 24;
const MIN_SOURCE_CHARS = 140;

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getUniqueWordCount(text: string): number {
  return new Set(
    text
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean)
  ).size;
}

export function isMeaningfulSourceText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length < MIN_SOURCE_CHARS && countWords(trimmed) < MIN_SOURCE_WORDS) return false;
  if (getUniqueWordCount(trimmed) < 12) return false;
  return true;
}

export function getSourceValidationMessage(input: {
  sourceType?: SourceType | string;
  source?: string;
  sourceText?: string;
}): string {
  const sourceType = input.sourceType ?? 'url';

  if (sourceType === 'camera') {
    return 'Could not read enough text from the camera capture. Try a sharper photo, better lighting, or add a few notes before generating.';
  }

  if (sourceType === 'pdf') {
    return 'Could not extract enough readable text from this PDF. Try a text-based PDF or paste the important content as notes first.';
  }

  if (sourceType === 'txt') {
    return 'This file does not contain enough readable text to generate a podcast yet. Try a longer text file or add more content.';
  }

  if (sourceType === 'url' && input.source) {
    return 'Could not extract enough readable article text from this URL. Try another article link, or copy the text into notes first.';
  }

  return 'Add more source text before generating so the episode has enough material to work with.';
}

export function validateSourceText(input: {
  sourceType?: SourceType | string;
  source?: string;
  sourceText?: string;
}): string | null {
  return isMeaningfulSourceText(input.sourceText ?? '')
    ? null
    : getSourceValidationMessage(input);
}
