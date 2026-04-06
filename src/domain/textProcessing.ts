export type ScriptTurn = { speaker: 'HOST1' | 'HOST2'; text: string };

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
  const headingBlocks = [...extractTagContent(html, 'h1'), ...extractTagContent(html, 'h2')];

  const chosen = articleBlocks.length > 0 ? articleBlocks : paragraphBlocks;

  const body = [...headingBlocks.slice(0, 8), ...chosen.filter((p) => p.split(' ').length > 7).slice(0, 80)]
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return { title, body };
}

export function normalizeSourceText(input: string): string {
  const sanitized = input.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (sanitized.length <= MAX_SOURCE_CHARS) return sanitized;
  const chunks: string[] = [];
  for (let cursor = 0; cursor < sanitized.length && chunks.length < 4; cursor += 1200) {
    chunks.push(sanitized.slice(cursor, cursor + 1200));
  }
  return chunks.map((chunk, idx) => `Section ${idx + 1}: ${chunk}`).join('\n').slice(0, MAX_SOURCE_CHARS);
}

export function sanitizeSourceContext(text?: string): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 3500);
}

export function buildGroundedSourceSections(source: string): { summary: string; sections: string[] } {
  const cleaned = sanitizeSourceContext(source);
  const rawSections = cleaned.split(/\n+|\.\s+/).map((s) => s.trim()).filter((s) => s.split(' ').length > 7);
  const ranked = [...new Set(rawSections)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 6);
  const summary = cleaned.slice(0, 600);
  return { summary, sections: ranked };
}

export function parseTurnsFromText(raw: string): ScriptTurn[] {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');

  let parsedTurns: ScriptTurn[] = [];

  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Array<{ speaker?: unknown; text?: unknown }>;
      parsedTurns = parsed.flatMap((item): ScriptTurn[] => {
        if (!item || typeof item !== 'object') return [];
        if (item.speaker !== 'HOST1' && item.speaker !== 'HOST2') return [];
        if (typeof item.text !== 'string') return [];
        const text = item.text.trim();
        if (!text) return [];
        return [{ speaker: item.speaker, text }];
      });
    } catch {
      parsedTurns = [];
    }
  }

  if (parsedTurns.length === 0) {
    parsedTurns = cleaned
      .split('\n')
      .map((line) => line.trim().match(/^(HOST1|HOST2)\s*[:\-]\s*(.+)$/i))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => ({ speaker: m[1].toUpperCase() as 'HOST1' | 'HOST2', text: m[2].trim() }));
  }

  return parsedTurns
    .filter((t) => t.text.length >= 8 && t.text.length <= 420)
    .filter((t, i, arr) => i === 0 || t.text.toLowerCase() !== arr[i - 1].text.toLowerCase())
    .filter((t, i, arr) => i === 0 || t.speaker !== arr[i - 1].speaker);
}
