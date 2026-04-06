import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../src/constants/theme';

export default function WelcomeScreen() {
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(24)).current;
  const pulse = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 620,
        delay: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 70,
        friction: 11,
        delay: 220,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.65, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.screen}>
      <Animated.View style={[s.bgOrb, { opacity: pulse }]} />
      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Text style={s.logoIcon}>🎙</Text>
        <Text style={s.logoTitle}>PodCraft Private</Text>
      </Animated.View>

      <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}> 
        <Text style={s.badge}>ON-DEVICE PODCASTS</Text>
        <Text style={s.subtitle}>Create private podcasts from links and PDFs with smooth local playback.</Text>

        <Pressable style={s.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={s.primaryBtnTxt}>Enter Studio</Text>
        </Pressable>

        <Pressable style={s.secondaryBtn} onPress={() => router.push('/info')}>
          <Text style={s.secondaryBtnTxt}>How it works</Text>
        </Pressable>
      </Animated.View>
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
  bgOrb: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: theme.primaryLight,
    borderColor: theme.primaryMid,
    borderWidth: 1,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoIcon: {
    fontSize: 52,
    marginBottom: 8,
  },
  logoTitle: {
    color: theme.textPrimary,
    fontWeight: '800',
    fontSize: 30,
    letterSpacing: 0.3,
  },
  card: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    gap: 14,
    shadowColor: theme.shadowColor,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 6,
  },
  badge: {
    color: theme.primary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 2,
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
