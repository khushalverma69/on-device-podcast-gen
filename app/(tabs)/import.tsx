import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  View, Text, TextInput, Pressable,
  StyleSheet, ScrollView, Alert, Animated,
} from 'react-native';
import { theme } from '../../src/constants/theme';

const EXAMPLES = [
  { label: 'Artificial Intelligence', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence', emoji: '🤖' },
  { label: 'Quantum Computing',       url: 'https://en.wikipedia.org/wiki/Quantum_computing',      emoji: '⚛️' },
  { label: 'Climate Change',          url: 'https://en.wikipedia.org/wiki/Climate_change',          emoji: '🌍' },
  { label: 'Space Exploration',       url: 'https://en.wikipedia.org/wiki/Space_exploration',       emoji: '🚀' },
];

function AnimatedExampleCard({ ex, onPress, index }: { ex: any; onPress: () => void; index: number }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: 200 + index * 60, useNativeDriver: true }),
      Animated.spring(slideY,  { toValue: 0, tension: 80, friction: 12, delay: 200 + index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[s.exampleWrap, { opacity, transform: [{ translateY: slideY }, { scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 300, friction: 10 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }).start()}
      >
        <View style={s.exampleCard}>
          <Text style={s.exampleEmoji}>{ex.emoji}</Text>
          <Text style={s.exampleLabel} numberOfLines={2}>{ex.label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ImportScreen() {
  const [url,   setUrl]   = useState('');
  const [topic, setTopic] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const screenAnim = useRef(new Animated.Value(0)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;
  const btnGlow    = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(screenAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnGlow, { toValue: 1,   duration: 1400, useNativeDriver: true }),
        Animated.timing(btnGlow, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);


  async function handlePickPdf() {
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      router.push({
        pathname: '/generate',
        params: {
          source: file.uri,
          sourceType: 'pdf',
          topic: file.name?.replace(/\.pdf$/i, '') || 'PDF Episode',
        },
      });
    } catch {
      Alert.alert('Import failed', 'Could not open PDF picker. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }

  function handleCameraOpen() {
    router.push('/camera');
  }

  function handleGenerate() {
    if (!url.trim()) {
      Alert.alert('No source', 'Please enter a URL or pick an example');
      return;
    }
    router.push({ pathname: '/generate',
      params: { source: url.trim(), sourceType: 'url', topic: topic.trim() } });
  }

  return (
    <Animated.View style={[s.screen, { opacity: screenAnim }]}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>NEW EPISODE</Text>
          <Text style={s.title}>Import</Text>
          <Text style={s.subtitle}>Turn any article into a podcast</Text>
        </View>

        <View style={s.body}>

          {/* URL Card */}
          <View style={s.inputCard}>
            <Text style={s.inputLabel}>ARTICLE URL</Text>
            <View style={s.inputRow}>
              <Text style={s.inputIcon}>🔗</Text>
              <TextInput
                style={s.input}
                placeholder="https://example.com/article"
                placeholderTextColor={theme.textTertiary}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
              {url.length > 0 && (
                <Pressable onPress={() => setUrl('')} style={s.clearBtn}>
                  <Text style={s.clearBtnTxt}>✕</Text>
                </Pressable>
              )}
            </View>
          </View>


          <View style={s.optionRow}>
            <Pressable style={s.optionBtn} onPress={handlePickPdf}>
              <Text style={s.optionEmoji}>📄</Text>
              <Text style={s.optionTxt}>{isImporting ? 'Opening…' : 'Pick PDF'}</Text>
            </Pressable>
            <Pressable style={s.optionBtn} onPress={handleCameraOpen}>
              <Text style={s.optionEmoji}>📷</Text>
              <Text style={s.optionTxt}>Use Camera</Text>
            </Pressable>
          </View>

          {/* Examples */}
          <Text style={s.sectionLabel}>QUICK START</Text>
          <View style={s.examplesGrid}>
            {EXAMPLES.map((ex, i) => (
              <AnimatedExampleCard
                key={ex.label}
                ex={ex}
                index={i}
                onPress={() => { setUrl(ex.url); setTopic(ex.label); }}
              />
            ))}
          </View>

          {/* Topic Card */}
          <View style={s.inputCard}>
            <Text style={s.inputLabel}>EPISODE TITLE  <Text style={s.optional}>(optional)</Text></Text>
            <View style={s.inputRow}>
              <Text style={s.inputIcon}>✏️</Text>
              <TextInput
                style={s.input}
                placeholder="Auto-detected from page"
                placeholderTextColor={theme.textTertiary}
                value={topic}
                onChangeText={setTopic}
              />
            </View>
          </View>

          {/* Privacy */}
          <View style={s.privacyCard}>
            <View style={s.privacyDot} />
            <Text style={s.privacyTxt}>Zero cloud · All AI runs on your device · Nothing leaves your phone</Text>
          </View>

          {/* Generate button with glow */}
          <Pressable
            onPress={handleGenerate}
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 10 }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }).start()}
          >
            <Animated.View style={[s.generateBtnWrap, { transform: [{ scale: btnScale }] }]}>
              <Animated.View style={[s.generateBtnGlow, { opacity: btnGlow }]} />
              <View style={s.generateBtn}>
                <Text style={s.generateBtnTxt}>Generate Podcast</Text>
                <Text style={s.generateBtnArrow}>→</Text>
              </View>
            </Animated.View>
          </Pressable>

        </View>
      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: theme.background },
  scroll:           { paddingBottom: 80 },
  header:           { backgroundColor: theme.background, paddingTop: 64,
                      paddingHorizontal: 24, paddingBottom: 24 },
  eyebrow:          { color: theme.primary, fontSize: 10, fontWeight: '700',
                      letterSpacing: 2.5, marginBottom: 6 },
  title:            { color: theme.textPrimary, fontSize: 36, fontWeight: '800', marginBottom: 4 },
  subtitle:         { color: theme.textSecondary, fontSize: 15 },
  body:             { paddingHorizontal: 16, gap: 14 },
  inputCard:        { backgroundColor: theme.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: theme.border,
                      shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  inputLabel:       { color: theme.primary, fontSize: 10, fontWeight: '700',
                      letterSpacing: 2, marginBottom: 12 },
  optional:         { color: theme.textTertiary, fontWeight: '400', letterSpacing: 0 },
  inputRow:         { flexDirection: 'row', alignItems: 'center',
                      backgroundColor: theme.background,
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2 },
  inputIcon:        { fontSize: 16, marginRight: 8 },
  input:            { flex: 1, color: theme.textPrimary, fontSize: 14, paddingVertical: 12 },
  clearBtn:         { padding: 8 },
  clearBtnTxt:      { color: theme.textTertiary, fontSize: 14 },
  optionRow:        { flexDirection: 'row', gap: 10 },
  optionBtn:        { flex: 1, backgroundColor: theme.card, borderRadius: 14, borderWidth: 1,
                      borderColor: theme.border, paddingVertical: 12, alignItems: 'center', gap: 4 },
  optionEmoji:      { fontSize: 18 },
  optionTxt:        { color: theme.textPrimary, fontWeight: '600' },
  sectionLabel:     { color: theme.textSecondary, fontSize: 10, fontWeight: '700',
                      letterSpacing: 2, paddingHorizontal: 4 },
  examplesGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exampleWrap:      { width: '48%' },
  exampleCard:      { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border,
                      padding: 16, alignItems: 'center',
                      shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  exampleEmoji:     { fontSize: 28, marginBottom: 8 },
  exampleLabel:     { color: theme.textPrimary, fontSize: 12, fontWeight: '600',
                      textAlign: 'center', lineHeight: 17 },
  privacyCard:      { backgroundColor: theme.mintLight, borderRadius: 14,
                      flexDirection: 'row', alignItems: 'center',
                      padding: 14, gap: 10 },
  privacyDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.mint },
  privacyTxt:       { color: theme.mint, fontSize: 12, fontWeight: '600', flex: 1 },
  generateBtnWrap:  { position: 'relative', alignItems: 'center' },
  generateBtnGlow:  { position: 'absolute', inset: -10, borderRadius: 28,
                      backgroundColor: theme.primaryGlow },
  generateBtn:      { backgroundColor: theme.primary, borderRadius: 18,
                      paddingVertical: 18, paddingHorizontal: 32,
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', gap: 10, width: '100%' },
  generateBtnTxt:   { color: '#FFF', fontSize: 17, fontWeight: '800' },
  generateBtnArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 20 },
});
