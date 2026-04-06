import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable,
  StyleSheet, Animated, Alert, Modal,
} from 'react-native';
import ModelDownloader from '../../src/components/ModelDownloader';
import { useModelStore, MODELS } from '../../src/stores/modelStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { theme } from '../../src/constants/theme';
import { clearTelemetry, readTelemetry, type TelemetryEntry } from '../../src/services/telemetry';

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

function DiagnosticsStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'warn' | 'error';
}) {
  const toneStyle =
    tone === 'error' ? s.diagStatError : tone === 'warn' ? s.diagStatWarn : s.diagStatNeutral;
  return (
    <View style={[s.diagStatCard, toneStyle]}>
      <Text style={s.diagStatValue}>{value}</Text>
      <Text style={s.diagStatLabel}>{label}</Text>
    </View>
  );
}

function DiagnosticsEntryCard({ entry }: { entry: TelemetryEntry }) {
  const levelStyle =
    entry.level === 'error' ? s.diagBadgeError : entry.level === 'warn' ? s.diagBadgeWarn : s.diagBadgeInfo;
  const details = entry.details ? JSON.stringify(entry.details) : '';
  return (
    <View style={s.diagEntryCard}>
      <View style={s.diagEntryTop}>
        <Text style={s.diagEntryTime}>
          {new Date(entry.ts).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
        <View style={[s.diagBadge, levelStyle]}>
          <Text style={s.diagBadgeTxt}>{entry.level.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={s.diagEntryEvent}>{entry.event}</Text>
      {details ? (
        <Text style={s.diagEntryDetails} numberOfLines={6}>
          {details}
        </Text>
      ) : null}
    </View>
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
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [telemetryEntries, setTelemetryEntries] = useState<TelemetryEntry[]>([]);
  const screenAnim = useRef(new Animated.Value(0)).current;
  const activeModelId = useModelStore(s => s.activeModelId);
  const downloaded    = useModelStore(s => s.downloaded);
  
  const { 
    scriptLength, scriptStyle, pauseMs, host1VoiceId, host2VoiceId, themeMode, onboardingAutoAdvance,
    setScriptLength, setScriptStyle, setPauseMs, setHost1VoiceId, setHost2VoiceId, setThemeMode, setOnboardingAutoAdvance, setOnboardingSeen 
  } = useSettingsStore();
  
  const clearLibrary = useLibraryStore(s => s.clearLibrary);

  const activeModelName = activeModelId && MODELS[activeModelId]
    ? MODELS[activeModelId].name
    : 'No model selected';

  const downloadedCount = Object.keys(downloaded).length;

  useEffect(() => {
    Animated.timing(screenAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const syncTelemetry = () => setTelemetryEntries(readTelemetry().slice().reverse());
    syncTelemetry();
    const interval = setInterval(syncTelemetry, 1500);
    return () => clearInterval(interval);
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

  const handleScriptStylePress = () => {
    Alert.alert('Conversation Style', 'Pick how your generated episode should sound.', [
      { text: 'Balanced', onPress: () => void setScriptStyle('balanced') },
      { text: 'Educational', onPress: () => void setScriptStyle('educational') },
      { text: 'Storytelling', onPress: () => void setScriptStyle('storytelling') },
      { text: 'Debate', onPress: () => void setScriptStyle('debate') },
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


  const handleOnboardingAutoAdvance = () => {
    Alert.alert('Splash auto-advance', 'Automatically enter app after splash animation?', [
      { text: 'Enabled', onPress: () => void setOnboardingAutoAdvance(true) },
      { text: 'Disabled', onPress: () => void setOnboardingAutoAdvance(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };


  const handleResetOnboarding = () => {
    Alert.alert('Reset onboarding', 'Show welcome flow again on next launch?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => void setOnboardingSeen(false) },
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

  const handleShowDiagnostics = () => setShowDiagnostics(true);

  const handleClearDiagnostics = () => {
    Alert.alert('Clear diagnostics', 'Remove all buffered local telemetry events?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearTelemetry();
          setTelemetryEntries([]);
        },
      },
    ]);
  };

  const getVoiceName = (id?: string) => {
    const found = VOICE_OPTIONS.find(v => v.id === id);
    return found ? found.name : 'Default';
  };

  const recentEntries = telemetryEntries.slice(0, 12);
  const errorCount = telemetryEntries.filter((entry) => entry.level === 'error').length;
  const warnCount = telemetryEntries.filter((entry) => entry.level === 'warn').length;
  const infoCount = telemetryEntries.filter((entry) => entry.level === 'info').length;
  const latestEvent = telemetryEntries[0];

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
          />
          <SettingRow
            label="Conversation style"
            value={scriptStyle.charAt(0).toUpperCase() + scriptStyle.slice(1)}
            onPress={handleScriptStylePress}
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
          <Text style={s.privacyLine}>· No accounts, no tracking; local diagnostics only</Text>
        </View>

        <Text style={s.sectionLabel}>DIAGNOSTICS</Text>
        <SettingCard>
          <SettingRow
            label="Buffered events"
            value={`${telemetryEntries.length}`}
          />
          <SettingRow
            label="Latest event"
            value={latestEvent?.event ?? 'None'}
          />
          <SettingRow
            label="Open diagnostics panel"
            onPress={handleShowDiagnostics}
          />
          <SettingRow
            label="Clear diagnostics"
            onPress={handleClearDiagnostics}
            isLast
          />
        </SettingCard>

        {/* App */}  
        <Text style={s.sectionLabel}>APP</Text>
        <SettingCard>
          <SettingRow
            label="Theme mode"
            value={themeMode === 'dark' ? 'Dark' : 'Light'}
            onPress={handleThemeModePress}
          />
          <SettingRow
            label="Splash auto-advance"
            value={onboardingAutoAdvance ? 'Enabled' : 'Disabled'}
            onPress={handleOnboardingAutoAdvance}
          />
          <SettingRow
            label="How to use"
            onPress={handleInfoPress}
          />
          <SettingRow
            label="Reset onboarding"
            onPress={handleResetOnboarding}
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

      <Modal visible={showDiagnostics} animationType="slide" onRequestClose={() => setShowDiagnostics(false)}>
        <View style={s.diagScreen}>
          <View style={s.diagHeader}>
            <View>
              <Text style={s.eyebrow}>LOCAL DIAGNOSTICS</Text>
              <Text style={s.diagTitle}>Telemetry</Text>
            </View>
            <Pressable style={s.diagCloseBtn} onPress={() => setShowDiagnostics(false)}>
              <Text style={s.diagCloseTxt}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.diagBody}>
            <View style={s.diagStatsRow}>
              <DiagnosticsStat label="Errors" value={String(errorCount)} tone="error" />
              <DiagnosticsStat label="Warnings" value={String(warnCount)} tone="warn" />
              <DiagnosticsStat label="Info" value={String(infoCount)} tone="neutral" />
            </View>

            <View style={s.diagPanel}>
              <Text style={s.diagPanelLabel}>WHAT THIS SHOWS</Text>
              <Text style={s.diagPanelText}>
                Local telemetry from generation, source validation, OCR, and playback integrity checks. Nothing here is uploaded.
              </Text>
            </View>

            {recentEntries.length === 0 ? (
              <View style={s.diagEmptyCard}>
                <Text style={s.diagEmptyTitle}>No diagnostics yet</Text>
                <Text style={s.diagEmptyBody}>
                  Run generation, import a source, or open playback flows to populate local telemetry events.
                </Text>
              </View>
            ) : (
              <View style={s.diagList}>
                {recentEntries.map((entry) => (
                  <DiagnosticsEntryCard key={`${entry.ts}-${entry.event}`} entry={entry} />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  diagScreen:   { flex: 1, backgroundColor: theme.background },
  diagHeader:   { paddingTop: 64, paddingHorizontal: 24, paddingBottom: 20,
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diagTitle:    { color: theme.textPrimary, fontSize: 32, fontWeight: '800' },
  diagCloseBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.card,
                  borderWidth: 1, borderColor: theme.border },
  diagCloseTxt: { color: theme.textPrimary, fontWeight: '700', fontSize: 14 },
  diagBody:     { paddingHorizontal: 16, paddingBottom: 36, gap: 14 },
  diagStatsRow: { flexDirection: 'row', gap: 10 },
  diagStatCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1 },
  diagStatNeutral: { backgroundColor: theme.card, borderColor: theme.border },
  diagStatWarn: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  diagStatError:{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  diagStatValue:{ color: theme.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  diagStatLabel:{ color: theme.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  diagPanel:    { backgroundColor: theme.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.border },
  diagPanelLabel:{ color: theme.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  diagPanelText:{ color: theme.textPrimary, fontSize: 14, lineHeight: 21 },
  diagEmptyCard:{ backgroundColor: theme.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: theme.border },
  diagEmptyTitle:{ color: theme.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  diagEmptyBody:{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
  diagList:     { gap: 10 },
  diagEntryCard:{ backgroundColor: theme.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.border },
  diagEntryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  diagEntryTime:{ color: theme.textSecondary, fontSize: 12, flex: 1 },
  diagBadge:    { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  diagBadgeInfo:{ backgroundColor: theme.primaryLight },
  diagBadgeWarn:{ backgroundColor: '#FFEDD5' },
  diagBadgeError:{ backgroundColor: '#FEE2E2' },
  diagBadgeTxt: { color: theme.textPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  diagEntryEvent:{ color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  diagEntryDetails:{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 },
});
