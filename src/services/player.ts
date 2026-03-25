import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  State,
} from 'react-native-track-player';

type EpisodeForPlayback = {
  id: string;
  title: string;
  mp3Path?: string;
};

let isSetup = false;
let loadedTrackId: string | null = null;

function normalizeAudioUri(pathOrUri: string): string {
  if (pathOrUri.startsWith('file://')) return pathOrUri;
  if (pathOrUri.startsWith('/')) return `file://${pathOrUri}`;
  return pathOrUri;
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
  if (!episode.mp3Path) {
    throw new Error('Episode has no audio file path.');
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
    url: normalizeAudioUri(episode.mp3Path),
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
