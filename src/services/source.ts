import * as FileSystem from 'expo-file-system/legacy';

import {
  extractReadableArticle,
  normalizeSourceText,
  stripHtmlToText,
} from '../domain/textProcessing';
import type { SourceType } from '../types';
import { trackError, trackWarn } from './telemetry';

function decodeBase64(input: string): string {
  try {
    const atobFn = (globalThis as any).atob as ((value: string) => string) | undefined;
    return atobFn ? atobFn(input) : '';
  } catch {
    return '';
  }
}

function decodePdfHexText(hex: string): string {
  const compact = hex.replace(/\s+/g, '');
  if (!compact) return '';
  const bytes: number[] = [];
  for (let i = 0; i < compact.length - 1; i += 2) {
    const code = Number.parseInt(compact.slice(i, i + 2), 16);
    if (Number.isFinite(code)) bytes.push(code);
  }
  if (bytes.length < 2) return '';

  // UTF-16 BOM paths.
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const chars: string[] = [];
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      chars.push(String.fromCharCode((bytes[i] << 8) | bytes[i + 1]));
    }
    return chars.join('');
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    const chars: string[] = [];
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      chars.push(String.fromCharCode((bytes[i + 1] << 8) | bytes[i]));
    }
    return chars.join('');
  }

  // Fallback single-byte extraction for ASCII-ish content.
  return bytes
    .filter((b) => b >= 32 && b <= 126)
    .map((b) => String.fromCharCode(b))
    .join('');
}

function extractPdfTextFromBinary(binary: string): string {
  const chunks: string[] = [];
  const textObjectRe = /BT([\s\S]*?)ET/g;
  const literalRe = /\(([^()]{2,})\)\s*Tj/g;
  const literalArrayRe = /\[(.*?)\]\s*TJ/g;
  const hexRe = /<([0-9A-Fa-f\s]{4,})>\s*Tj/g;
  const hexArrayRe = /\[\s*((?:<[0-9A-Fa-f\s]+>\s*)+)\]\s*TJ/g;
  let m: RegExpExecArray | null;

  while ((m = textObjectRe.exec(binary))) {
    const block = m[1];
    let lm: RegExpExecArray | null;
    while ((lm = literalRe.exec(block))) {
      const value = lm[1].replace(/\\[nrt]/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
      if (value.trim()) chunks.push(value.trim());
    }
    while ((lm = literalArrayRe.exec(block))) {
      const values = lm[1].match(/\(([^()]{2,})\)/g) ?? [];
      const joined = values
        .map((raw) => raw.slice(1, -1).replace(/\\[nrt]/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')'))
        .join(' ');
      if (joined.trim()) chunks.push(joined.trim());
    }
    while ((lm = hexRe.exec(block))) {
      const decoded = decodePdfHexText(lm[1]);
      if (decoded.trim()) chunks.push(decoded.trim());
    }
    while ((lm = hexArrayRe.exec(block))) {
      const values = lm[1].match(/<([0-9A-Fa-f\s]+)>/g) ?? [];
      const joined = values
        .map((raw) => decodePdfHexText(raw.slice(1, -1)))
        .filter(Boolean)
        .join(' ');
      if (joined.trim()) chunks.push(joined.trim());
    }
    if (chunks.length >= 600) break;
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
    const imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const form = new FormData();
    form.append('base64Image', `data:image/jpeg;base64,${imageBase64}`);
    form.append('language', 'eng');
    form.append('apikey', 'helloworld');

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = data?.ParsedResults?.[0]?.ParsedText as string | undefined;
        if (parsed?.trim()) return normalizeSourceText(parsed);
        trackWarn('ocr.empty_result', { attempt: attempt + 1 });
      } else {
        trackWarn('ocr.http_error', { attempt: attempt + 1, status: res.status });
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    trackError('ocr.exhausted', { imageUri });
    return '';
  } catch {
    trackError('ocr.exception', { imageUri });
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
