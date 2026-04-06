import * as FileSystem from 'expo-file-system/legacy';

import type { SourceType } from '../types';

const MAX_SOURCE_CHARS = 4200;

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTagContent(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = stripHtmlToText(m[1] || '');
    if (text.length > 40) out.push(text);
  }
  return out;
}

export function extractReadableArticle(html: string): { title: string; body: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = stripHtmlToText(titleMatch?.[1] || '').slice(0, 180);

  const articleBlocks = extractTagContent(html, 'article');
  const paragraphBlocks = extractTagContent(html, 'p');
  const headingBlocks = [
    ...extractTagContent(html, 'h1'),
    ...extractTagContent(html, 'h2'),
  ];

  const chosen = articleBlocks.length > 0 ? articleBlocks : paragraphBlocks;

  const body = [
    ...headingBlocks.slice(0, 8),
    ...chosen.filter((p) => p.split(' ').length > 7).slice(0, 80),
  ]
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return { title, body };
}

export function normalizeSourceText(input: string): string {
  const sanitized = input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.length <= MAX_SOURCE_CHARS) return sanitized;

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < sanitized.length && chunks.length < 4) {
    const next = sanitized.slice(cursor, cursor + 1200);
    chunks.push(next);
    cursor += 1200;
  }

  return chunks
    .map((chunk, idx) => `Section ${idx + 1}: ${chunk}`)
    .join('\n')
    .slice(0, MAX_SOURCE_CHARS);
}

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
