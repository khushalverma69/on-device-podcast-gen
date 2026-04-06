import * as FileSystem from 'expo-file-system/legacy';

import {
  extractReadableArticle,
  normalizeSourceText,
  stripHtmlToText,
} from '../domain/textProcessing';
import type { SourceType } from '../types';

function decodeBase64(input: string): string {
  try {
    const atobFn = (globalThis as any).atob as ((value: string) => string) | undefined;
    return atobFn ? atobFn(input) : '';
  } catch {
    return '';
  }
}

function extractPdfTextFromBinary(binary: string): string {
  const chunks: string[] = [];
  const re = /\(([^()]{4,})\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(binary))) {
    const value = m[1].replace(/\\[nrt]/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
    if (value.trim()) chunks.push(value.trim());
    if (chunks.length >= 300) break;
  }
  return normalizeSourceText(chunks.join(' '));
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
    if (uri.toLowerCase().endsWith('.pdf')) {
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binary = decodeBase64(b64);
      const extracted = extractPdfTextFromBinary(binary);
      if (extracted) return extracted;
    }

    const text = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return normalizeSourceText(text);
  } catch {
    return '';
  }
}

export async function runImageOcr(imageUri: string): Promise<string> {
  try {
    const form = new FormData();
    form.append('url', imageUri);
    form.append('language', 'eng');
    form.append('apikey', 'helloworld');

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) return '';
    const data = await res.json();
    const parsed = data?.ParsedResults?.[0]?.ParsedText as string | undefined;
    return normalizeSourceText(parsed || '');
  } catch {
    return '';
  }
}

export async function performBasicOcrFromCameraNotes(input: {
  imageUri?: string;
  ocrText?: string;
  notes?: string;
}): Promise<string> {
  const remoteOcr = input.imageUri ? await runImageOcr(input.imageUri) : '';
  return normalizeSourceText(input.ocrText?.trim() || remoteOcr || input.notes?.trim() || '');
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
      imageUri: source,
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
