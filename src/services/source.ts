import * as FileSystem from 'expo-file-system/legacy';

import {
  extractReadableArticle,
  normalizeSourceText,
  stripHtmlToText,
} from '../domain/textProcessing';
import type { SourceType } from '../types';

async function extractFromUrl(url: string): Promise<{ topic: string; text: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not fetch URL content.');
  const html = await res.text();
  const parsed = extractReadableArticle(html);

  const text = normalizeSourceText(parsed.body || stripHtmlToText(html));
  return {
    topic: parsed.title || url,
    text,
  };
}

async function extractFromFile(uri: string): Promise<string> {
  try {
    const text = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return normalizeSourceText(text);
  } catch {
    return '';
  }
}

export async function performBasicOcrFromCameraNotes(input: {
  ocrText?: string;
  notes?: string;
}): Promise<string> {
  return normalizeSourceText(input.ocrText?.trim() || input.notes?.trim() || '');
}

export async function buildSourceContext(input: {
  source?: string;
  sourceType?: SourceType | string;
  topic?: string;
  sourceText?: string;
}): Promise<{ inferredTopic: string; sourceContext: string }> {
  const source = input.source?.trim() ?? '';
  const sourceType = (input.sourceType ?? 'url') as SourceType | string;

  if (sourceType === 'camera') {
    const extracted = await performBasicOcrFromCameraNotes({
      ocrText: input.sourceText,
      notes: input.topic,
    });
    return {
      inferredTopic: input.topic?.trim() || 'Camera Notes',
      sourceContext: extracted,
    };
  }

  if (sourceType === 'url' && source) {
    const extracted = await extractFromUrl(source);
    return {
      inferredTopic: input.topic?.trim() || extracted.topic,
      sourceContext: extracted.text,
    };
  }

  if ((sourceType === 'txt' || sourceType === 'pdf') && source) {
    const extracted = await extractFromFile(source);
    return {
      inferredTopic: input.topic?.trim() || source.split('/').pop() || 'Imported file',
      sourceContext: extracted,
    };
  }

  return {
    inferredTopic: input.topic?.trim() || source || 'Podcast Episode',
    sourceContext: normalizeSourceText(input.sourceText || ''),
  };
}
