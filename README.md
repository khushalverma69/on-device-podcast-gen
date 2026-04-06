# Private Podcast (On-Device)

This app generates private podcast episodes from imported sources (URL, PDF, camera notes), runs local LLM + TTS generation, and stores episodes in a local library for playback.

## Tech stack
- React Native + Expo + Expo Router
- Zustand for state stores
- Local SQLite for episode metadata
- `llama.rn` for on-device LLM inference
- `react-native-sherpa-onnx`/audio services for TTS and playback integration

## Core flow
1. User imports source material.
2. Source text is extracted/normalized.
3. Pipeline builds grounded prompt context.
4. LLM generates scripted turns.
5. TTS synthesizes audio and episode is saved.
6. User plays episode with bookmarks/queue/resume.

## Reliability/ops
- Pipeline telemetry events are recorded locally.
- Interrupted generation runs are persisted and can be recovered.
- CI runs typecheck + module tests on push/PR.
