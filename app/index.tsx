import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../src/constants/theme';

export default function WelcomeScreen() {
  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.badge}>WELCOME</Text>
        <Text style={s.title}>PodCraft Private</Text>
        <Text style={s.subtitle}>Create private podcasts from links and PDFs — fully on-device.</Text>

        <Pressable style={s.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={s.primaryBtnTxt}>Start</Text>
        </Pressable>

        <Pressable style={s.secondaryBtn} onPress={() => router.push('/info')}>
          <Text style={s.secondaryBtnTxt}>How it works</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background,
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    gap: 14,
  },
  badge: {
    color: theme.primary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 2,
  },
  title: {
    color: theme.textPrimary,
    fontWeight: '800',
    fontSize: 34,
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnTxt: {
    color: theme.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
});
