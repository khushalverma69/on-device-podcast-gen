import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable,
  StyleSheet, Animated, Alert,
} from 'react-native';
import ModelDownloader from '../../src/components/ModelDownloader';
import { useModelStore, MODELS } from '../../src/stores/modelStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { theme } from '../../src/constants/theme';

function SettingRow({
  label, value, onPress, isLast, rightElement,
}: {
  label: string; value?: string; onPress?: () => void;
  isLast?: boolean; rightElement?: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => onPress && Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, tension: 300, friction: 10 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()}
    >
      <Animated.View style={[s.row, !isLast && s.rowBorder, { transform: [{ scale }] }]}> 
        <Text style={s.rowLabel}>{label}</Text>
        <View style={s.rowRight}>
          {rightElement ?? (
            <>
              {value && <Text style={s.rowValue}>{value}</Text>}
              {onPress && <Text style={s.rowChevron}>›</Text>}
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.card}>{children}</View>
  );
}

const VOICE_OPTIONS = [
  { id: 'kokoro-af_heart', name: 'Kokoro af_heart (Female)' },
  { id: 'kokoro-am_adam', name: 'Kokoro am_adam (Male)' },
  { id: 'kokoro-af_bella', name: 'Kokoro af_bella (Female)' },
  { id: 'kokoro-af_nicole', name: 'Kokoro af_nicole (Female)' },
  { id: 'kokoro-af_sky', name: 'Kokoro af_sky (Female)' },
  { id: 'kokoro-am_michael', name: 'Kokoro am_michael (Male)' },
];

export default function SettingsScreen() {
  const [showModels, setShowModels] = useState(false);
  const screenAnim = useRef(new Animated.Value(0)).current;
  const activeModelId = useModelStore(s => s.activeModelId);
  const downloaded    = useModelStore(s => s.downloaded);
  
  const { 
    scriptLength, pauseMs, host1VoiceId, host2VoiceId, themeMode,
    setScriptLength, setPauseMs, setHost1VoiceId, setHost2VoiceId, setThemeMode 
  } = useSettingsStore();
  
  const clearLibrary = useLibraryStore(s => s.clearLibrary);

  const activeModelName = activeModelId && MODELS[activeModelId]
    ? MODELS[activeModelId].name
    : 'No model selected';

  const downloadedCount = Object.keys(downloaded).length;

  useEffect(() => {
    Animated.timing(screenAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const handleScriptLengthPress = () => {
    Alert.alert('Script Length', 'Select preferred generation length', [
      { text: 'Short (~10 turns)', onPress: () => setScriptLength('short') },
      { text: 'Normal (~20 turns)', onPress: () => setScriptLength('normal') },
      { text: 'Long (~40 turns)', onPress: () => setScriptLength('long') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePausePress = () => {
    Alert.alert('Pause Duration', 'Delay between speaker turns', [
      { text: 'None', onPress: () => setPauseMs(0) },
      { text: 'Short (400ms)', onPress: () => setPauseMs(400) },
      { text: 'Medium (800ms)', onPress: () => setPauseMs(800) },
      { text: 'Long (1200ms)', onPress: () => setPauseMs(1200) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleVoicePress = (hostNum: 1 | 2) => {
    Alert.alert(
      `Host ${hostNum} Voice`,
      'Select a voice for this speaker',
      [
        ...VOICE_OPTIONS.map(v => ({
          text: v.name,
          onPress: () => hostNum === 1 ? setHost1VoiceId(v.id) : setHost2VoiceId(v.id)
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };


  const handleThemeModePress = () => {
    Alert.alert('Theme mode', 'Choose your preferred appearance', [
      { text: 'Light', onPress: () => void setThemeMode('light') },
      { text: 'Dark', onPress: () => void setThemeMode('dark') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleInfoPress = () => {
    Alert.alert(
      'How to use',
      '1) Import URL/PDF\n2) Generate\n3) Open episode in Library\n4) Use Player controls\n5) Manage models/settings here.'
    );
  };

  const handleClearLibrary = () => {
    Alert.alert('Clear library', 'Delete all generated episodes?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: async () => {
        await clearLibrary();
        Alert.alert('Library Cleared');
      }},
    ]);
  };

  const getVoiceName = (id?: string) => {
    const found = VOICE_OPTIONS.find(v => v.id === id);
    return found ? found.name : 'Default';
  };

  return (
    <Animated.View style={[s.screen, { opacity: screenAnim }]}> 
      <View style={s.header}> 
        <Text style={s.eyebrow}>PREFERENCES</Text>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>  

        {/* Model */}  
        <Text style={s.sectionLabel}>AI MODEL</Text>
        <SettingCard>
          <SettingRow
            label="Active model"
            value={activeModelName}
          />
          <SettingRow
            label="Downloaded"
            value={`${downloadedCount} of ${Object.keys(MODELS).length}`} 
          />
          <SettingRow
            label="Manage models"
            onPress={() => setShowModels(true)}
            isLast
          />
        </SettingCard>

        {/* Generation */}  
        <Text style={s.sectionLabel}>GENERATION</Text>
        <SettingCard>
          <SettingRow
            label="Script length"
            value={scriptLength.charAt(0).toUpperCase() + scriptLength.slice(1)}
            onPress={handleScriptLengthPress}
          />
          <SettingRow
            label="Pause between turns"
            value={`${pauseMs}ms`}
            onPress={handlePausePress}
            isLast
          />
        </SettingCard>

        {/* Voice */}  
        <Text style={s.sectionLabel}>VOICES</Text>
        <SettingCard>
          <SettingRow
            label="HOST1 voice"
            value={getVoiceName(host1VoiceId)}
            onPress={() => handleVoicePress(1)}
          />
          <SettingRow
            label="HOST2 voice"
            value={getVoiceName(host2VoiceId)}
            onPress={() => handleVoicePress(2)}
            isLast
          />
        </SettingCard>

        {/* Privacy */}  
        <Text style={s.sectionLabel}>PRIVACY</Text>
        <View style={s.privacyCard}>  
          <View style={s.privacyRow}>  
            <View style={s.privacyDot} />
            <Text style={s.privacyTitle}>100% on-device processing</Text>
          </View>
          <Text style={s.privacyLine}>· No network calls during generation</Text>
          <Text style={s.privacyLine}>· No data ever leaves your phone</Text>
          <Text style={s.privacyLine}>· Models stored locally after download</Text>
          <Text style={s.privacyLine}>· No accounts, no tracking, no telemetry</Text>
        </View>

        {/* App */}  
        <Text style={s.sectionLabel}>APP</Text>
        <SettingCard>
          <SettingRow
            label="Theme mode"
            value={themeMode === 'dark' ? 'Dark' : 'Light'}
            onPress={handleThemeModePress}
          />
          <SettingRow
            label="How to use"
            onPress={handleInfoPress}
          />
          <SettingRow
            label="Version"
            value="1.1.0"
          />
          <SettingRow
            label="Clear episode library"
            onPress={handleClearLibrary}
            isLast
          />
        </SettingCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ModelDownloader visible={showModels} onClose={() => setShowModels(false)} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: theme.background },
  header:       { backgroundColor: theme.background, paddingTop: 64,
                  paddingHorizontal: 24, paddingBottom: 20 },
  eyebrow:      { color: theme.primary, fontSize: 10, fontWeight: '700',
                  letterSpacing: 2.5, marginBottom: 6 },
  title:        { color: theme.textPrimary, fontSize: 36, fontWeight: '800' },
  body:         { paddingHorizontal: 16, paddingBottom: 40 },
  sectionLabel: { color: theme.textSecondary, fontSize: 10, fontWeight: '700',
                  letterSpacing: 2, marginTop: 24, marginBottom: 8, paddingHorizontal: 4 },
  card:         { backgroundColor: theme.card, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: theme.border,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  row:          { flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 18, paddingVertical: 16 },
  rowBorder:    { borderBottomWidth: 0.5, borderBottomColor: theme.divider },
  rowLabel:     { flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '500' },
  rowRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue:     { color: theme.textSecondary, fontSize: 14 },
  rowChevron:   { color: theme.textTertiary, fontSize: 20 },
  privacyCard:  { backgroundColor: theme.mintLight, borderRadius: 18,
                  padding: 18,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  privacyRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  privacyDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.mint },
  privacyTitle: { color: theme.mint, fontSize: 14, fontWeight: '700' },
  privacyLine:  { color: theme.mint, fontSize: 13, lineHeight: 24, opacity: 0.8 },
});
