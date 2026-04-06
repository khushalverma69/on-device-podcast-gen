import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { inspectEpisodeAudio } from '../../src/services/player';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { usePlayerStore } from '../../src/stores/playerStore';

export default function EpisodeDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const episode = useLibraryStore(s => s.episodes.find(e => e.id === id));
  const setEpisode = usePlayerStore(s => s.setEpisode);

  if (!episode) {
    return (
      <View style={s.screen}>
        <Text style={s.notFound}>Episode not found</Text>
      </View>
    );
  }

  async function handlePlay() {
    const audio = await inspectEpisodeAudio({
      id: episode!.id,
      title: episode!.title,
      mp3Path: episode!.mp3Path,
    });
    if (!audio.ok) {
      Alert.alert('Audio unavailable', audio.message, [
        { text: 'OK', style: 'cancel' },
        {
          text: 'Delete episode',
          style: 'destructive',
          onPress: () => {
            void useLibraryStore.getState().removeEpisode(episode!.id);
            router.back();
          },
        },
      ]);
      return;
    }

    setEpisode({
      id:              episode!.id,
      title:           episode!.title,
      mp3Path:         episode!.mp3Path,
      durationSeconds: episode!.durationSeconds ?? 0,
      modelUsed:       episode!.modelUsed ?? undefined,
      turns:           episode!.turns ?? 0,
      createdAt:       episode!.createdAt,
    });
    router.push('/(tabs)/player');
  }

  function handleDelete() {
    Alert.alert('Delete episode', 'Remove this episode from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          useLibraryStore.getState().removeEpisode(episode!.id);
          router.back();
        },
      },
    ]);
  }

  const turns = episode.script ?? [];

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={2}>{episode.title}</Text>
        <View style={s.metaRow}>
          <Text style={s.metaTxt}>{formatDuration(episode.durationSeconds)}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaTxt}>{formatDate(episode.createdAt)}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaTxt}>{episode.turns ?? 0} turns</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body}>

        <View style={s.actionRow}>
          <Pressable style={s.playBtn} onPress={() => void handlePlay()}>
            <Text style={s.playBtnTxt}>▶  Play</Text>
          </Pressable>
          <Pressable style={s.deleteBtn} onPress={handleDelete}>
            <Text style={s.deleteBtnTxt}>Delete</Text>
          </Pressable>
        </View>

        <View style={s.transcriptCard}>
          <Text style={s.cardLabel}>Transcript</Text>
          {turns.length > 0 ? (
            turns.map((turn, i) => (
              <View
                key={i}
                style={[s.bubble, turn.speaker === 'HOST1' ? s.bubble1 : s.bubble2]}
              >
                <Text style={s.speakerLabel}>{turn.speaker}</Text>
                <Text style={s.bubbleTxt}>{turn.text}</Text>
              </View>
            ))
          ) : (
            <Text style={s.noTranscript}>
              Transcript will appear here after generation
            </Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(ts?: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: '#0D0F1A' },
  notFound:       { color: '#FFFFFF', textAlign: 'center', marginTop: 100, fontSize: 16 },
  header:         { backgroundColor: '#141728', paddingTop: 60, paddingBottom: 16,
                    paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#2D3A5C' },
  backBtn:        { marginBottom: 8 },
  backTxt:        { color: '#6C3FC5', fontSize: 14 },
  title:          { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt:        { color: '#64748B', fontSize: 12 },
  metaDot:        { color: '#2D3A5C', fontSize: 12 },
  body:           { padding: 16, paddingBottom: 60 },
  actionRow:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  playBtn:        { flex: 1, backgroundColor: '#6C3FC5', borderRadius: 12,
                    paddingVertical: 14, alignItems: 'center' },
  playBtnTxt:     { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  deleteBtn:      { backgroundColor: '#1E2440', borderRadius: 12, borderWidth: 0.5,
                    borderColor: '#E24B4A', paddingHorizontal: 20,
                    paddingVertical: 14, alignItems: 'center' },
  deleteBtnTxt:   { color: '#E24B4A', fontSize: 15, fontWeight: '600' },
  transcriptCard: { backgroundColor: '#1E2440', borderRadius: 14, padding: 16,
                    borderWidth: 0.5, borderColor: '#2D3A5C' },
  cardLabel:      { color: '#64748B', fontSize: 11, fontWeight: '600',
                    letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase' },
  bubble:         { borderRadius: 12, padding: 12, marginBottom: 8, maxWidth: '88%' },
  bubble1:        { backgroundColor: 'rgba(108,63,197,0.2)', alignSelf: 'flex-start' },
  bubble2:        { backgroundColor: 'rgba(14,165,233,0.2)', alignSelf: 'flex-end' },
  speakerLabel:   { color: '#94A3B8', fontSize: 10, fontWeight: '700',
                    marginBottom: 4, letterSpacing: 0.5 },
  bubbleTxt:      { color: '#CBD5E0', fontSize: 13, lineHeight: 20 },
  noTranscript:   { color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 },
});
