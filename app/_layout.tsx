import '../global.css';

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { initDb } from '../src/db/schema';
import { theme } from '../src/constants/theme';
import { useLibraryStore } from '../src/stores/libraryStore';
import { useSettingsStore } from '../src/stores/settingsStore';

export default function RootLayout() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await initDb();
        await useLibraryStore.getState().loadEpisodes();
        await useSettingsStore.getState().hydrate();
      } catch (error) {
        if (isMounted) {
          setInitError(error instanceof Error ? error.message : 'Failed to initialize app.');
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isInitializing) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-lg font-semibold text-white">Initializing...</Text>
        {initError ? <Text className="mt-3 text-center text-red-300">{initError}</Text> : null}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="info" options={{ title: 'How to use' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="generate" options={{ title: 'Generate' }} />
        <Stack.Screen name="episode/[id]" options={{ title: 'Episode' }} />
      </Stack>
    </>
  );
}
