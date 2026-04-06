import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '../src/constants/theme';

export default function CameraImportScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [notes, setNotes] = useState('');

  async function handleCapture() {
    if (!cameraRef.current) return;
    const shot = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (!shot?.uri) {
      Alert.alert('Capture failed', 'Please try taking the photo again.');
      return;
    }
    setPhotoUri(shot.uri);
  }

  function handleUseForEpisode() {
    if (!photoUri) {
      Alert.alert('No photo', 'Capture a photo first.');
      return;
    }
    router.replace({
      pathname: '/generate',
      params: {
        source: photoUri,
        sourceType: 'camera',
        topic: notes.trim() || 'Camera Snapshot',
        sourceText: notes.trim(),
      },
    });
  }

  if (!permission) {
    return <View style={s.screen}><Text style={s.text}>Checking camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={s.screen}>
        <Text style={s.title}>Camera access needed</Text>
        <Text style={s.text}>Allow camera access to capture source material for episode generation.</Text>
        <Pressable style={s.button} onPress={() => void requestPermission()}>
          <Text style={s.buttonTxt}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <Text style={s.title}>Capture Source</Text>
      <CameraView style={s.camera} ref={cameraRef} facing="back" />
      <TextInput
        style={s.input}
        placeholder="Optional notes from this image (helps script quality)"
        placeholderTextColor={theme.textTertiary}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <View style={s.row}>
        <Pressable style={s.buttonAlt} onPress={() => void handleCapture()}>
          <Text style={s.buttonAltTxt}>{photoUri ? 'Retake' : 'Capture'}</Text>
        </Pressable>
        <Pressable style={s.button} onPress={handleUseForEpisode}>
          <Text style={s.buttonTxt}>Use in Episode</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background, padding: 16, paddingTop: 58 },
  title: { color: theme.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 10 },
  text: { color: theme.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  camera: { height: 360, borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  input: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    paddingVertical: 13,
  },
  buttonTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonAlt: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    paddingVertical: 13,
  },
  buttonAltTxt: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
});
