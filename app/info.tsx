import { Stack, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '../src/constants/theme';
import { useSettingsStore } from '../src/stores/settingsStore';

const STEPS = [
  'Tap Import to add a URL, pick a PDF, or use quick examples.',
  'Press Generate Podcast and wait for the four pipeline stages to complete.',
  'Open your episode in Library, then use Player controls (play, seek, speed).',
  'Use Settings to manage models, voices, script length, pause, and theme mode.',
];

export default function InfoScreen() {
  const reveal = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const setOnboardingSeen = useSettingsStore((st) => st.setOnboardingSeen);

  useEffect(() => {
    Animated.stagger(
      90,
      reveal.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'How to use' }} />
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>How to use PodCraft Private</Text>

        {STEPS.map((step, idx) => (
          <Animated.View
            key={step}
            style={{
              opacity: reveal[idx],
              transform: [
                {
                  translateY: reveal[idx].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
                },
              ],
            }}
          >
            <Step n={String(idx + 1)} text={step} />
          </Animated.View>
        ))}

        <View style={s.tipCard}>
          <Text style={s.tipTitle}>Tip</Text>
          <Text style={s.tipTxt}>Your existing library and settings are preserved locally on-device.</Text>
        </View>

        <Pressable style={s.button} onPress={() => { void setOnboardingSeen(true); router.replace('/(tabs)'); }}>
          <Text style={s.buttonTxt}>Go to app</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={s.step}>
      <View style={s.badge}><Text style={s.badgeTxt}>{n}</Text></View>
      <Text style={s.stepTxt}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  body: { padding: 20, gap: 14, backgroundColor: theme.background },
  title: { color: theme.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 10 },
  step: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryLight,
  },
  badgeTxt: { color: theme.primary, fontWeight: '700' },
  stepTxt: { flex: 1, color: theme.textPrimary, lineHeight: 20 },
  tipCard: {
    borderRadius: 14,
    backgroundColor: theme.mintLight,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginTop: 4,
  },
  tipTitle: { color: theme.mint, fontWeight: '700', marginBottom: 6 },
  tipTxt: { color: theme.textPrimary },
  button: {
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  buttonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
