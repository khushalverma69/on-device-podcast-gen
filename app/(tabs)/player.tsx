import { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  ScrollView, Animated,
} from 'react-native';
import { usePlayerStore } from '../../src/stores/playerStore';
import { theme } from '../../src/constants/theme';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const BAR_COUNT = 28;

function WaveBar({ index, isPlaying }: { index: number; isPlaying: boolean }) {
  const scaleY  = useRef(new Animated.Value(0.2)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animRef.current) animRef.current.stop();
    if (isPlaying) {
      const duration = 250 + Math.random() * 350;
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleY, {
            toValue: 0.2 + Math.random() * 0.8,
            duration, useNativeDriver: true,
          }),
          Animated.timing(scaleY, {
            toValue: 0.15,
            duration, useNativeDriver: true,
          }),
        ])
      );
      animRef.current.start();
    } else {
      animRef.current = Animated.spring(scaleY, {
        toValue: 0.2, useNativeDriver: true, tension: 80, friction: 10,
      });
      animRef.current.start();
    }
    return () => { if (animRef.current) animRef.current.stop(); };
  }, [isPlaying]);

  const barColor = index % 4 === 0 ? theme.primary : theme.primaryLight;

  return (
    <Animated.View style={[
      s.waveBar,
      { backgroundColor: barColor, transform: [{ scaleY }] },
    ]} />
  );
}

export default function PlayerScreen() {
  const episode   = usePlayerStore(st => st.currentEpisode);
  const isPlaying = usePlayerStore(st => st.isPlaying);
  const position  = usePlayerStore(st => st.positionSeconds);
  const duration  = usePlayerStore(st => st.durationSeconds);
  const speed     = usePlayerStore(st => st.speed);
  const play      = usePlayerStore(st => st.play);
  const pause     = usePlayerStore(st => st.pause);
  const setSpeed  = usePlayerStore(st => st.setSpeed);
  const seekBy    = usePlayerStore(st => st.seekBy);
  const syncProgress = usePlayerStore(st => st.syncProgress);
  const addBookmark = usePlayerStore(st => st.addBookmark);
  const bookmarks = usePlayerStore(st => st.currentEpisode ? st.bookmarks[st.currentEpisode.id] ?? [] : []);

  const screenAnim = useRef(new Animated.Value(0)).current;
  const playScale  = useRef(new Animated.Value(1)).current;
  const playGlow   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(screenAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [episode?.id]);

  useEffect(() => {
    if (!episode) return;

    void syncProgress();
    const timer = setInterval(() => {
      void syncProgress();
    }, 1000);

    return () => clearInterval(timer);
  }, [episode?.id]);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(playGlow, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
          Animated.timing(playGlow, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      playGlow.stopAnimation();
      Animated.timing(playGlow, { toValue: 0.4, duration: 300, useNativeDriver: true }).start();
    }
  }, [isPlaying]);

  const progress = duration > 0 ? position / duration : 0;

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  if (!episode) {
    return (
      <Animated.View style={[s.screen, { opacity: screenAnim }]}>
        <View style={s.header}>
          <Text style={s.eyebrow}>NOW PLAYING</Text>
          <Text style={s.title}>Player</Text>
        </View>
        <View style={s.empty}>
          <View style={s.emptyOrb}>
            <Text style={s.emptyIcon}>🎧</Text>
          </View>
          <Text style={s.emptyTitle}>Nothing playing</Text>
          <Text style={s.emptyBody}>Open an episode and tap Play to listen here</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.screen, { opacity: screenAnim }]}>
      <View style={s.header}>
        <Text style={s.eyebrow}>NOW PLAYING</Text>
        <Text style={s.title}>Player</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>

        {/* Artwork */}
        <View style={[s.artwork, { backgroundColor: getColor(episode.id) + '22' }]}>
          <Text style={s.artworkIcon}>🎙</Text>
          <View style={[s.artworkBorder, { borderColor: getColor(episode.id) + '60' }]} />
        </View>

        {/* Info */}
        <Text style={s.episodeTitle}>{episode.title}</Text>
        <View style={s.modelRow}>
          <View style={[s.modelDot, { backgroundColor: getColor(episode.id) }]} />
          <Text style={s.modelTxt}>{episode.modelUsed ?? 'mock'}</Text>
        </View>

        {/* Waveform */}
        <View style={s.waveform}>
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <WaveBar key={i} index={i} isPlaying={isPlaying} />
          ))}
        </View>

        {/* Progress */}
        <View style={s.progressCard}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
            <View style={[s.progressThumb, { left: `${Math.min(progress * 100, 98)}%` as any }]} />
          </View>
          <View style={s.timeRow}>
            <Text style={s.timeTxt}>{formatTime(position)}</Text>
            <Text style={s.timeTxt}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={s.controls}>
          <Pressable style={s.skipBtn} onPress={() => void seekBy(-15)}>
            <Text style={s.skipNum}>−15</Text>
            <Text style={s.skipSub}>sec</Text>
          </Pressable>

          <Pressable
            onPress={() => void (isPlaying ? pause() : play(episode.id))}
            onPressIn={() => Animated.spring(playScale, { toValue: 0.92, useNativeDriver: true, tension: 300, friction: 10 }).start()}
            onPressOut={() => Animated.spring(playScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }).start()}
          >
            <Animated.View style={s.playWrap}>
              <Animated.View style={[s.playGlow, { opacity: playGlow }]} />
              <Animated.View style={[s.playBtn, { transform: [{ scale: playScale }] }]}>
                <Text style={s.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              </Animated.View>
            </Animated.View>
          </Pressable>

          <Pressable style={s.skipBtn} onPress={() => void seekBy(30)}>
            <Text style={s.skipNum}>+30</Text>
            <Text style={s.skipSub}>sec</Text>
          </Pressable>
        </View>

        {/* Speed */}
        <View style={s.speedCard}>
          <Text style={s.speedLabel}>PLAYBACK SPEED</Text>
          <View style={s.speedRow}>
            {SPEEDS.map(sp => (
              <Pressable
                key={sp}
                style={[s.speedBtn, speed === sp && s.speedBtnActive]}
                onPress={() => void setSpeed(sp)}
              >
                <Text style={[s.speedBtnTxt, speed === sp && s.speedBtnTxtActive]}>
                  {sp}×
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.bookmarkCard}>
          <View style={s.bookmarkHeader}>
            <Text style={s.speedLabel}>BOOKMARKS</Text>
            <Pressable style={s.bookmarkAdd} onPress={addBookmark}>
              <Text style={s.bookmarkAddTxt}>+ Add</Text>
            </Pressable>
          </View>
          <View style={s.bookmarkRow}>
            {bookmarks.length === 0 ? (
              <Text style={s.bookmarkEmpty}>No bookmarks yet</Text>
            ) : (
              bookmarks.map((sec) => (
                <Pressable key={sec} style={s.bookmarkChip} onPress={() => void seekBy(sec - position)}>
                  <Text style={s.bookmarkChipTxt}>{formatTime(sec)}</Text>
                </Pressable>
              ))
            )}
          </View>
        </View>

      </ScrollView>
    </Animated.View>
  );
}

function getColor(id: string): string {
  const colors = ['#6366F1','#0EA5E9','#F59E0B','#F43F5E','#10B981'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: theme.background },
  header:       { backgroundColor: theme.background, paddingTop: 64,
                  paddingHorizontal: 24, paddingBottom: 20 },
  eyebrow:      { color: theme.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2.5, marginBottom: 6 },
  title:        { color: theme.textPrimary, fontSize: 36, fontWeight: '800' },
  body:         { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 60, alignItems: 'center' },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyOrb:     { width: 100, height: 100, borderRadius: 50,
                  backgroundColor: theme.primaryLight,
                  borderWidth: 1.5, borderColor: theme.primary + '40',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyIcon:    { fontSize: 40 },
  emptyTitle:   { color: theme.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 10 },
  emptyBody:    { color: theme.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  artwork:      { width: 220, height: 220, borderRadius: 32,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 24, position: 'relative',
                  shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.12, shadowRadius: 20, elevation: 6 },
  artworkBorder:{ position: 'absolute', inset: 0, borderRadius: 32,
                  borderWidth: 1.5 },
  artworkIcon:  { fontSize: 72 },
  episodeTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '800',
                  textAlign: 'center', marginBottom: 8, lineHeight: 26 },
  modelRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
  modelDot:     { width: 6, height: 6, borderRadius: 3 },
  modelTxt:     { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  waveform:     { flexDirection: 'row', alignItems: 'center',
                  height: 48, gap: 3, marginBottom: 24, width: '100%', justifyContent: 'center' },
  waveBar:      { width: 4, height: 36, borderRadius: 2 },
  progressCard: { width: '100%', marginBottom: 28 },
  progressBg:   { height: 4, backgroundColor: theme.divider,
                  borderRadius: 2, position: 'relative', overflow: 'visible' },
  progressFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  progressThumb:{ position: 'absolute', top: -6, width: 16, height: 16,
                  borderRadius: 8, backgroundColor: theme.primary,
                  marginLeft: -8,
                  shadowColor: theme.primary, shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  timeRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  timeTxt:      { color: theme.textSecondary, fontSize: 12 },
  controls:     { flexDirection: 'row', alignItems: 'center', gap: 36, marginBottom: 32 },
  skipBtn:      { alignItems: 'center', width: 50 },
  skipNum:      { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
  skipSub:      { color: theme.textSecondary, fontSize: 10, letterSpacing: 0.5 },
  playWrap:     { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  playGlow:     { position: 'absolute', width: 96, height: 96, borderRadius: 48,
                  backgroundColor: theme.primaryGlow },
  playBtn:      { width: 76, height: 76, borderRadius: 38,
                  backgroundColor: theme.primary,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  playIcon:     { color: '#FFF', fontSize: 30 },
  speedCard:    { backgroundColor: theme.card, borderRadius: 18, padding: 18,
                  width: '100%',
                  shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  speedLabel:   { color: theme.textSecondary, fontSize: 10, fontWeight: '700',
                  letterSpacing: 2, marginBottom: 12 },
  speedRow:     { flexDirection: 'row', gap: 8 },
  speedBtn:     { flex: 1, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: theme.background, alignItems: 'center' },
  speedBtnActive:   { backgroundColor: theme.primaryLight },
  speedBtnTxt:      { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  speedBtnTxtActive:{ color: theme.primary, fontWeight: '800' },
  bookmarkCard: { backgroundColor: theme.card, borderRadius: 18, padding: 16,
                  width: '100%', marginTop: 12, borderWidth: 1, borderColor: theme.divider },
  bookmarkHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookmarkAdd:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: theme.primaryLight },
  bookmarkAddTxt:{ color: theme.primary, fontWeight: '700', fontSize: 12 },
  bookmarkRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  bookmarkChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.primaryLight },
  bookmarkChipTxt:{ color: theme.primary, fontWeight: '600', fontSize: 12 },
  bookmarkEmpty:{ color: theme.textSecondary, fontSize: 12 },
});
