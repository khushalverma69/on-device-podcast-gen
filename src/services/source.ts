import * as FileSystem from 'expo-file-system/legacy';

import type { SourceType } from '../types';

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not fetch URL content.');
  const html = await res.text();
  const text = stripHtmlToText(html);
  return text.slice(0, 4500);
}

async function extractFromFile(uri: string): Promise<string> {
  try {
    const text = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return text.slice(0, 4500);
  } catch {
    return '';
  }
}

export async function buildSourceContext(input: {
  source?: string;
  sourceType?: SourceType | string;
  topic?: string;
  sourceText?: string;
}): Promise<{ inferredTopic: string; sourceContext: string }> {
  const source = input.source?.trim() ?? '';
  const sourceType = (input.sourceType ?? 'url') as SourceType | string;

  if (input.sourceText?.trim()) {
    return {
      inferredTopic: input.topic?.trim() || 'Camera Notes',
      sourceContext: input.sourceText.trim().slice(0, 4500),
    };
  }

  if (sourceType === 'url' && source) {
    const extracted = await extractFromUrl(source);
    return {
      inferredTopic: input.topic?.trim() || source,
      sourceContext: extracted,
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
    sourceContext: '',
  };
}
