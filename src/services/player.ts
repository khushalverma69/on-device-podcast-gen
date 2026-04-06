import * as FileSystem from 'expo-file-system/legacy';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  State,
} from 'react-native-track-player';
import { trackWarn } from './telemetry';

type EpisodeForPlayback = {
  id: string;
  title: string;
  mp3Path?: string;
};

export type PlaybackIntegrityResult =
  | { ok: true; normalizedUri: string }
  | { ok: false; code: 'missing_path' | 'missing_file' | 'empty_file' | 'unknown'; message: string };

let isSetup = false;
let loadedTrackId: string | null = null;

function normalizeAudioUri(pathOrUri: string): string {
  if (pathOrUri.startsWith('file://')) return pathOrUri;
  if (pathOrUri.startsWith('/')) return `file://${pathOrUri}`;
  return pathOrUri;
}

export async function inspectEpisodeAudio(episode: EpisodeForPlayback): Promise<PlaybackIntegrityResult> {
  if (!episode.mp3Path) {
    return {
      ok: false,
      code: 'missing_path',
      message: 'This episode does not have a saved audio file yet.',
    };
  }

  const normalizedUri = normalizeAudioUri(episode.mp3Path);

  try {
    const info = await FileSystem.getInfoAsync(normalizedUri);
    if (!info.exists) {
      trackWarn('player.audio_missing', { episodeId: episode.id });
      return {
        ok: false,
        code: 'missing_file',
        message: 'This episode audio file is missing from device storage.',
      };
    }
    if (typeof info.size === 'number' && info.size <= 0) {
      trackWarn('player.audio_empty', { episodeId: episode.id });
      return {
        ok: false,
        code: 'empty_file',
        message: 'This episode audio file looks corrupted or empty.',
      };
    }
    return { ok: true, normalizedUri };
  } catch {
    trackWarn('player.audio_check_failed', { episodeId: episode.id });
    return {
      ok: false,
      code: 'unknown',
      message: 'Could not verify the saved audio for this episode.',
    };
  }
}

async function ensurePlayer(): Promise<void> {
  if (isSetup) return;

  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SeekTo,
      Capability.JumpForward,
      Capability.JumpBackward,
      Capability.Stop,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause],
    notificationCapabilities: [Capability.Play, Capability.Pause, Capability.SeekTo],
  });

  isSetup = true;
}

async function ensureLoadedTrack(episode: EpisodeForPlayback): Promise<void> {
  const audio = await inspectEpisodeAudio(episode);
  if (!audio.ok) {
    throw new Error(audio.message);
  }

  await ensurePlayer();

  if (loadedTrackId === episode.id) {
    return;
  }

  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: episode.id,
    title: episode.title,
    artist: 'Private Podcast',
    url: audio.normalizedUri,
  });

  loadedTrackId = episode.id;
}

export async function playEpisode(episode: EpisodeForPlayback): Promise<void> {
  await ensureLoadedTrack(episode);
  await TrackPlayer.play();
}

export async function pausePlayback(): Promise<void> {
  await ensurePlayer();
  await TrackPlayer.pause();
}

export async function setPlaybackSpeed(speed: number): Promise<void> {
  await ensurePlayer();
  await TrackPlayer.setRate(speed);
}

export async function seekBy(offsetSeconds: number): Promise<void> {
  await ensurePlayer();
  await TrackPlayer.seekBy(offsetSeconds);
}

export async function getPlaybackSnapshot(): Promise<{
  position: number;
  duration: number;
  isPlaying: boolean;
}> {
  await ensurePlayer();

  const [progress, playbackState] = await Promise.all([
    TrackPlayer.getProgress(),
    TrackPlayer.getPlaybackState(),
  ]);

  const state = playbackState.state;
  const isPlaying = state === State.Playing || state === State.Buffering;

  return {
    position: progress.position ?? 0,
    duration: progress.duration ?? 0,
    isPlaying,
  };
}
