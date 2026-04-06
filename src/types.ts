export type SourceType = 'pdf' | 'url' | 'txt' | 'camera';

export type Speaker = 'HOST1' | 'HOST2';

export type SpeakerTurn = {
  speaker: Speaker;
  text: string;
  emotions: string[];
};

export type Episode = {
  id: string;
  title: string;
  topic?: string | null;
  sourceName?: string | null;
  sourceType?: SourceType | null;
  mp3Path: string;
  durationSeconds?: number | null;
  turns?: number | null;
  modelUsed?: string | null;
  createdAt: number;
  script: SpeakerTurn[];
};

export type ScriptLength = 'short' | 'normal' | 'long';
export type ScriptStyle = 'balanced' | 'educational' | 'storytelling' | 'debate';
