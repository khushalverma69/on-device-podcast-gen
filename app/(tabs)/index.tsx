import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Pressable, ScrollView,
  StyleSheet, Text, View, Dimensions,
} from 'react-native';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { usePlayerStore } from '../../src/stores/playerStore';
import { theme } from '../../src/constants/theme';
import { uiSpacing, uiType } from '../../src/constants/ui';
import { ScreenStateCard } from '../../src/components';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 160;

function EpisodeCard({ item, index }: { item: any; index: number }) {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 400,
        delay: index * 60, useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0, tension: 80, friction: 11,
        delay: index * 60, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function onPressIn() {
    Animated.spring(scale, {
      toValue: 0.96, useNativeDriver: true,
      tension: 300, friction: 10,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1, useNativeDriver: true,
      tension: 300, friction: 10,
    }).start();
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={() => router.push(`/episode/${item.id}`)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={s.card}>
          <View style={[s.cardAccent, { backgroundColor: getColor(item.id) }]} />
          <View style={[s.artwork, { backgroundColor: getColor(item.id) + '22' }]}>
            <Text style={[s.artworkNum, { color: getColor(item.id) }]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          </View>
          <View style={s.cardInfo}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.cardMeta}>
              {formatDuration(item.durationSeconds)}  ·  {formatDate(item.createdAt)}
            </Text>
            <View style={s.modelBadge}>
              <Text style={s.modelBadgeTxt}>{item.modelUsed ?? 'mock'}</Text>
            </View>
          </View>
          <Text style={s.chevron}>›</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PulsingOrb() {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 1.15, duration: 1600, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,    duration: 1600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1,   duration: 1600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 1600, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={s.orbWrap}>
      <Animated.View style={[s.orbOuter, { transform: [{ scale }], opacity }]} />
      <View style={s.orbInner}>
        <Text style={s.orbIcon}>🎙</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const episodes   = useLibraryStore(st => st.episodes);
  const setEpisode = usePlayerStore(st => st.setEpisode);
  const currentEpisode = usePlayerStore(st => st.currentEpisode);
  const resumeByEpisode = usePlayerStore(st => st.resumeByEpisode);
  const screenAnim = useRef(new Animated.Value(0)).current;
  const scrollY    = useRef(new Animated.Value(0)).current;
  const skeletonOpacity = useRef(new Animated.Value(0.35)).current;
  const [showSkeleton, setShowSkeleton] = useState(true);
  const continueEpisode = currentEpisode
    ? episodes.find((item) => item.id === currentEpisode.id) ?? null
    : null;

  useEffect(() => {
    Animated.timing(screenAnim, {
      toValue: 1, duration: 350, useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, { toValue: 0.75, duration: 650, useNativeDriver: true }),
        Animated.timing(skeletonOpacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ])
    ).start();
    const timer = setTimeout(() => setShowSkeleton(false), 650);
    return () => clearTimeout(timer);
  }, []);

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT * 0.4],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.8],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const countTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT * 0.6],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[s.screen, { opacity: screenAnim }]}>
      {/* Parallax Header */}
      <Animated.View style={[s.header, {
        transform: [{ translateY: headerTranslate }],
        opacity: headerOpacity,
      }]}>
        <View>
          <Text style={s.eyebrow}>YOUR LIBRARY</Text>
          <Text style={s.headerTitle}>PodCraft{'\n'}Private</Text>
        </View>
        <Animated.View style={[s.countWrap, {
          transform: [{ translateY: countTranslate }],
        }]}>
          <Text style={s.countNum}>{episodes.length}</Text>
          <Text style={s.countLabel}>episodes</Text>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={[
          s.scrollContent,
          episodes.length === 0 && s.scrollEmpty,
        ]}
      >
        <View style={{ height: HEADER_HEIGHT + 12 }} />
        {continueEpisode ? (
          <Pressable
            style={s.continueCard}
            onPress={() => {
              setEpisode({
                id: continueEpisode.id,
                title: continueEpisode.title,
                mp3Path: continueEpisode.mp3Path,
                durationSeconds: continueEpisode.durationSeconds ?? 0,
                modelUsed: continueEpisode.modelUsed ?? undefined,
                turns: continueEpisode.turns ?? 0,
                createdAt: continueEpisode.createdAt,
              });
              router.push('/(tabs)/player');
            }}
          >
            <View>
              <Text style={s.continueLabel}>CONTINUE LISTENING</Text>
              <Text style={s.continueTitle} numberOfLines={1}>{continueEpisode.title}</Text>
              <Text style={s.continueMeta}>
                Resume at {formatDuration(Math.round(resumeByEpisode[continueEpisode.id] ?? 0))}
              </Text>
            </View>
            <Text style={s.continueArrow}>▶</Text>
          </Pressable>
        ) : null}

        {showSkeleton ? (
          <View style={s.list}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Animated.View key={i} style={[s.skeletonCard, { opacity: skeletonOpacity }]} />
            ))}
          </View>
        ) : episodes.length === 0 ? (
          <View style={s.empty}>
            <ScreenStateCard
              icon="🎙"
              title="No episodes yet"
              body="Import any article or document to generate your first private podcast episode."
              actionLabel="Import document"
              onPressAction={() => router.push('/import')}
            />
          </View>
        ) : (
          <View style={s.list}>
            {episodes.map((ep, i) => (
              <EpisodeCard key={ep.id} item={ep} index={i} />
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {episodes.length > 0 && (
        <GlowFAB onPress={() => router.push('/import')} />
      )}
    </Animated.View>
  );
}

function GlowButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 10 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()}
    >
      <Animated.View style={[s.glowBtn, { transform: [{ scale }] }]}>
        <Animated.View style={[s.glowBtnGlow, { opacity: glowAnim }]} />
        <Text style={s.glowBtnTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function GlowFAB({ onPress }: { onPress: () => void }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Pressable
      style={s.fabWrap}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, tension: 300, friction: 10 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()}
    >
      <Animated.View style={[s.fabGlow, { opacity: glowAnim }]} />
      <Animated.View style={[s.fab, { transform: [{ scale }] }]}>
        <Text style={s.fabTxt}>+</Text>
      </Animated.View>
    </Pressable>
  );
}

function getColor(id: string): string {
  const colors = ['#6366F1','#0EA5E9','#F59E0B','#F43F5E','#10B981'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function formatDuration(s?: number | null): string {
  if (!s) return '—';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function formatDate(ts?: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: theme.background },
  header:       { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                  paddingTop: 64, paddingHorizontal: 24, paddingBottom: 20,
                  backgroundColor: theme.background,
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow:      { color: theme.primary, fontSize: 10, fontWeight: '700',
                  letterSpacing: 2.5, marginBottom: 6 },
  headerTitle:  { color: theme.textPrimary, fontSize: uiType.hero, fontWeight: '800', lineHeight: 40 },
  countWrap:    { alignItems: 'flex-end', paddingBottom: 4 },
  countNum:     { color: theme.primary, fontSize: 40, fontWeight: '800' },
  countLabel:   { color: theme.textSecondary, fontSize: 11, letterSpacing: 1 },
  scrollContent:{ paddingHorizontal: uiSpacing.md, paddingBottom: 110 },
  scrollEmpty:  { flex: 1 },
  list:         { gap: 10 },
  continueCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.divider, borderRadius: 16, padding: uiSpacing.sm, marginBottom: uiSpacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  continueLabel:{ color: theme.textSecondary, fontSize: 10, letterSpacing: 1.4, fontWeight: '700', marginBottom: 4 },
  continueTitle:{ color: theme.textPrimary, fontSize: 15, fontWeight: '700', maxWidth: width - 120 },
  continueMeta: { color: theme.primary, fontSize: 12, marginTop: 4, fontWeight: '600' },
  continueArrow:{ color: theme.primary, fontSize: 20, fontWeight: '700' },
  card:         { backgroundColor: theme.card, borderRadius: 18, flexDirection: 'row',
                  alignItems: 'center', padding: uiSpacing.md, overflow: 'hidden',
                  shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  skeletonCard: { height: 82, borderRadius: 18, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.divider },
  cardAccent:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 2 },
  artwork:      { width: 50, height: 50, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  marginLeft: 8, marginRight: 14 },
  artworkNum:   { fontSize: 15, fontWeight: '800' },
  cardInfo:     { flex: 1 },
  cardTitle:    { color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardMeta:     { color: theme.textSecondary, fontSize: 12, marginBottom: 6 },
  modelBadge:   { backgroundColor: theme.primaryLight, borderRadius: 6,
                  paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  modelBadgeTxt:{ color: theme.primary, fontSize: 10, fontWeight: '700' },
  chevron:      { color: theme.textTertiary, fontSize: 22, marginLeft: 8 },
  empty:        { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  orbWrap:      { width: 110, height: 110, alignItems: 'center',
                  justifyContent: 'center', marginBottom: 28 },
  orbOuter:     { position: 'absolute', width: 110, height: 110, borderRadius: 55,
                  backgroundColor: theme.primaryLight,
                  borderWidth: 1.5, borderColor: theme.primary + '40' },
  orbInner:     { width: 72, height: 72, borderRadius: 36,
                  backgroundColor: theme.primaryLight,
                  borderWidth: 1.5, borderColor: theme.primary + '60',
                  alignItems: 'center', justifyContent: 'center' },
  orbIcon:      { fontSize: 32 },
  glowBtn:      { borderRadius: 16, overflow: 'visible', alignItems: 'center',
                  justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32,
                  backgroundColor: theme.primary },
  glowBtnGlow:  { position: 'absolute', inset: -8, borderRadius: 24,
                  backgroundColor: theme.primaryGlow },
  glowBtnTxt:   { color: '#FFF', fontSize: 16, fontWeight: '700', zIndex: 2 },
  fabWrap:      { position: 'absolute', bottom: 28, right: 24,
                  width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  fabGlow:      { position: 'absolute', width: 80, height: 80, borderRadius: 40,
                  backgroundColor: theme.primaryGlow },
  fab:          { width: 60, height: 60, borderRadius: 30,
                  backgroundColor: theme.primary,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabTxt:       { color: '#FFF', fontSize: 32, fontWeight: '200', marginTop: -3 },
});
