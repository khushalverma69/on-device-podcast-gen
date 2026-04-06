import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  View, Text, Pressable, StyleSheet,
  ScrollView, Alert, BackHandler, Animated,
} from 'react-native';
import { runPipeline } from '../src/services/pipeline';
import { useLibraryStore } from '../src/stores/libraryStore';
import { theme } from '../src/constants/theme';
import {
  getGenerationEpisodeTitle,
  getRecoverablePendingRun,
  normalizeGenerationRunInput,
  shouldAutoResumePendingRun,
  type GenerationRunInput,
} from '../src/domain/generationRun';
import {
  clearPendingPipelineRun,
  getPendingPipelineRun,
  savePendingPipelineRun,
} from '../src/stores/pipelineRunStore';

const STAGES = [
  { id: 0, label: 'Reading document',    icon: '📄' },
  { id: 1, label: 'Writing script',      icon: '✍️'  },
  { id: 2, label: 'Synthesising voices', icon: '🎙'  },
  { id: 3, label: 'Assembling audio',    icon: '🎵'  },
];

function PulsingDot() {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 1.5, duration: 700, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[s.pulsingDot, { transform: [{ scale }], opacity }]} />
  );
}

function StageRow({ stage, status }: { stage: any; status: string }) {
  const slideX  = useRef(new Animated.Value(-10)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'active') {
      Animated.parallel([
        Animated.spring(slideX,  { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [status]);

  return (
    <View style={[s.stageRow, status === 'active' && s.stageRowActive]}>
      {status === 'active' && <View style={s.stageActiveBorder} />}
      <View style={[
        s.stageIconWrap,
        status === 'done'   && s.stageIconDone,
        status === 'active' && s.stageIconActive,
      ]}>
        <Text style={s.stageIcon}>
          {status === 'done' ? '✓' : stage.icon}
        </Text>
      </View>
      <Text style={[
        s.stageName,
        status === 'active' && s.stageNameActive,
        status === 'done'   && s.stageNameDone,
      ]}>
        {stage.label}
      </Text>
      <View style={s.stageRight}>
        {status === 'active' ? (
          <PulsingDot />
        ) : status === 'done' ? (
          <View style={s.doneBadge}><Text style={s.doneBadgeTxt}>Done</Text></View>
        ) : (
          <View style={s.waitBadge}><Text style={s.waitBadgeTxt}>Waiting</Text></View>
        )}
      </View>
    </View>
  );
}

interface Turn { speaker: 'HOST1' | 'HOST2'; text: string; }

function TurnBubble({ turn, index }: { turn: Turn; index: number }) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideY,  { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const isHost1 = turn.speaker === 'HOST1';
  return (
    <Animated.View style={[
      s.bubble,
      isHost1 ? s.bubble1 : s.bubble2,
      { opacity, transform: [{ translateY: slideY }] },
    ]}>
      <Text style={[s.bubbleLabel, { color: isHost1 ? theme.primary : theme.teal }]}>
        {turn.speaker}
      </Text>
      <Text style={s.bubbleTxt}>{turn.text}</Text>
    </Animated.View>
  );
}

export default function GenerateScreen() {
  const { source, sourceType, topic, sourceText } = useLocalSearchParams<{
    source: string; sourceType: string; topic: string; sourceText?: string;
  }>();
  const routeInput = normalizeGenerationRunInput({
    topic,
    source,
    sourceType,
    sourceText,
  });

  const [currentStage, setCurrentStage] = useState(-1);
  const [turns,        setTurns]        = useState<Turn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone,       setIsDone]       = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resumeHint, setResumeHint] = useState('');
  const scrollRef  = useRef<ScrollView>(null);
  const screenAnim = useRef(new Animated.Value(0)).current;
  const doneScale  = useRef(new Animated.Value(0.8)).current;
  const doneOpacity= useRef(new Animated.Value(0)).current;
  const addEpisode = useLibraryStore(s => s.addEpisode);
  const turnsRef   = useRef<Turn[]>([]);
  const currentStageRef = useRef(-1);

  useEffect(() => {
    Animated.timing(screenAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isGenerating) {
        Alert.alert('Still generating', 'Please wait for the episode to complete.');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isGenerating]);

  async function startRun(runInput?: GenerationRunInput) {
    const effectiveInput = normalizeGenerationRunInput(runInput ?? routeInput);
    turnsRef.current = [];
    setTurns([]);
    setCurrentStage(-1);
    currentStageRef.current = -1;
    setIsGenerating(true);
    setIsDone(false);
    setErrorMessage('');
    await savePendingPipelineRun({
      ...effectiveInput,
      stage: -1,
      updatedAt: Date.now(),
    });
    runPipeline(effectiveInput, {
      onStageChange: (stage) => {
        setCurrentStage(stage);
        currentStageRef.current = stage;
        void savePendingPipelineRun({
          ...effectiveInput,
          stage,
          updatedAt: Date.now(),
        });
      },
      onTurn: (speaker, text) => {
        const newTurn = { speaker, text };
        turnsRef.current = [...turnsRef.current, newTurn];
        setTurns([...turnsRef.current]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      },
      onComplete: async ({ episodeId, audioPath, durationSeconds, modelUsed }) => {
        setCurrentStage(4);
        setIsGenerating(false);
        setIsDone(true);
        await clearPendingPipelineRun();

        Animated.parallel([
          Animated.spring(doneScale,   { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
          Animated.timing(doneOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();

        await addEpisode({
          id:              episodeId,
          title:           getGenerationEpisodeTitle(effectiveInput),
          topic:           effectiveInput.topic || null,
          sourceName:      effectiveInput.source || null,
          sourceType:      (effectiveInput.sourceType as any) || 'url',
          mp3Path:         audioPath,
          durationSeconds,
          turns:           turnsRef.current.length,
          modelUsed,
          createdAt:       Date.now(),
          script:          turnsRef.current.map(t => ({ speaker: t.speaker, text: t.text, emotions: [] })),
        });
      },
      onError: (msg) => {
        setIsGenerating(false);
        setErrorMessage(msg);
        void savePendingPipelineRun({
          ...effectiveInput,
          stage: Math.max(-1, currentStageRef.current),
          updatedAt: Date.now(),
          lastError: msg,
        });
      },
    });
  }

  useEffect(() => {
    void (async () => {
      const pending = await getPendingPipelineRun();
      const recoverablePending = getRecoverablePendingRun(pending);
      if (recoverablePending) {
        setResumeHint(`Found interrupted run at stage ${Math.max(0, recoverablePending.stage + 1)}.`);
      }
      if (shouldAutoResumePendingRun(routeInput, recoverablePending)) {
        setResumeHint('');
        await startRun(recoverablePending);
        return;
      }
      await startRun(routeInput);
    })();
  }, []);

  function getStatus(id: number): 'done' | 'active' | 'waiting' {
    if (currentStage > id)  return 'done';
    if (currentStage === id) return 'active';
    return 'waiting';
  }

  return (
    <Animated.View style={[s.screen, { opacity: screenAnim }]}>
      <View style={s.header}>
        <Text style={s.eyebrow}>{isDone ? 'COMPLETE' : 'GENERATING'}</Text>
        <Text style={s.title} numberOfLines={1}>
          {topic || source?.split('/').pop() || 'Your Episode'}
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.body}>

        {/* Stages */}
        <View style={s.stagesCard}>
          <Text style={s.cardLabel}>PIPELINE</Text>
          {STAGES.map(stage => (
            <StageRow key={stage.id} stage={stage} status={getStatus(stage.id)} />
          ))}
        </View>

        {/* Transcript */}
        {turns.length > 0 && (
          <View style={s.transcriptCard}>
            <Text style={s.cardLabel}>SCRIPT · {turns.length} TURNS</Text>
            {turns.map((turn, i) => (
              <TurnBubble key={i} turn={turn} index={i} />
            ))}
          </View>
        )}

        {/* Done button */}
        {isDone && (
          <Animated.View style={{
            opacity: doneOpacity,
            transform: [{ scale: doneScale }],
          }}>
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              style={s.doneBtn}
            >
              <Text style={s.doneBtnTxt}>🎉  Go to Library</Text>
            </Pressable>
          </Animated.View>
        )}

        {!isGenerating && !isDone && errorMessage ? (
          <Pressable style={s.retryBtn} onPress={() => void startRun()}>
            <Text style={s.retryBtnTxt}>Retry generation</Text>
          </Pressable>
        ) : null}

        {!isGenerating && !isDone && resumeHint ? (
          <Pressable
            style={s.resumeBtn}
            onPress={async () => {
              const pending = await getPendingPipelineRun();
              if (!pending) return;
              setResumeHint('');
              await startRun(pending);
            }}
          >
            <Text style={s.resumeBtnTxt}>{resumeHint} Tap to recover.</Text>
          </Pressable>
        ) : null}

      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: theme.background },
  header:           { backgroundColor: theme.background, paddingTop: 64,
                      paddingHorizontal: 24, paddingBottom: 20 },
  eyebrow:          { color: theme.primary, fontSize: 10, fontWeight: '700',
                      letterSpacing: 2.5, marginBottom: 6 },
  title:            { color: theme.textPrimary, fontSize: 28, fontWeight: '800' },
  body:             { paddingHorizontal: 16, paddingBottom: 60, gap: 14 },
  stagesCard:       { backgroundColor: theme.card, borderRadius: 18, padding: 18,
                      shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  cardLabel:        { color: theme.textSecondary, fontSize: 10, fontWeight: '700',
                      letterSpacing: 2, marginBottom: 14 },
  stageRow:         { flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 12, paddingHorizontal: 4,
                      borderRadius: 12, marginBottom: 4, overflow: 'hidden' },
  stageRowActive:   { backgroundColor: theme.primaryLight },
  stageActiveBorder:{ position: 'absolute', left: 0, top: 4, bottom: 4,
                      width: 3, borderRadius: 2, backgroundColor: theme.primary },
  stageIconWrap:    { width: 36, height: 36, borderRadius: 10,
                      backgroundColor: theme.background,
                      alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stageIconActive:  { backgroundColor: 'rgba(99,102,241,0.15)' },
  stageIconDone:    { backgroundColor: 'rgba(52,199,89,0.12)' },
  stageIcon:        { fontSize: 16 },
  stageName:        { flex: 1, color: theme.textSecondary, fontSize: 14, fontWeight: '500' },
  stageNameActive:  { color: theme.primary, fontWeight: '700' },
  stageNameDone:    { color: theme.mint },
  stageRight:       { marginLeft: 8 },
  pulsingDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.coral },
  doneBadge:        { backgroundColor: theme.mintLight, borderRadius: 6,
                      paddingHorizontal: 8, paddingVertical: 3 },
  doneBadgeTxt:     { color: theme.mint, fontSize: 11, fontWeight: '700' },
  waitBadge:        { backgroundColor: theme.background, borderRadius: 6,
                      paddingHorizontal: 8, paddingVertical: 3 },
  waitBadgeTxt:     { color: theme.textTertiary, fontSize: 11 },
  transcriptCard:   { backgroundColor: theme.card, borderRadius: 18, padding: 18,
                      shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  bubble:           { borderRadius: 14, padding: 12, marginBottom: 8, maxWidth: '88%' },
  bubble1:          { backgroundColor: theme.host1Bg, alignSelf: 'flex-start' },
  bubble2:          { backgroundColor: theme.host2Bg, alignSelf: 'flex-end' },
  bubbleLabel:      { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  bubbleTxt:        { color: theme.textPrimary, fontSize: 13, lineHeight: 20 },
  doneBtn:          { backgroundColor: theme.primary, borderRadius: 18,
                      paddingVertical: 18, alignItems: 'center',
                      shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  doneBtnTxt:       { color: '#FFF', fontSize: 17, fontWeight: '800' },
  retryBtn:         { marginTop: 8, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.primaryLight, borderWidth: 1, borderColor: theme.coral + '55' },
  retryBtnTxt:      { color: theme.coral, fontWeight: '700', fontSize: 14 },
  resumeBtn:        { marginTop: 10, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.divider },
  resumeBtnTxt:     { color: theme.textSecondary, fontSize: 12, textAlign: 'center' },
});
