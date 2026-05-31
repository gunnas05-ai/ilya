import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Animated, PanResponder, StyleSheet,
  Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptic';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BUTTON_SIZE = 56;
const STORAGE_KEY = '@voice_btn_pos';
const EDGE_MARGIN = 8;

interface Props {
  onNavigate: (screen: string, params?: any) => void;
  colors: any;
}

export default function FloatingVoiceButton({ onNavigate, colors }: Props) {
  const { user } = useAuthStore();
  const userName = user?.fullName?.split(' ')[0] || '';

  // Position state — load from storage
  const [pos, setPos] = useState({ x: SCREEN_W - BUTTON_SIZE - EDGE_MARGIN, y: SCREEN_H * 0.6 });
  const pan = useRef(new Animated.ValueXY()).current;
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load saved position
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v) {
        const p = JSON.parse(v);
        if (p.x >= 0 && p.y >= 0) setPos(p);
      }
    }).catch(() => {});
  }, []);

  // Pulse animation when listening
  useEffect(() => {
    if (listening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => { pulse.stop(); pulseAnim.setValue(1); };
    }
  }, [listening]);

  // Snap to nearest edge
  const snapToEdge = (x: number) => {
    const center = SCREEN_W / 2;
    const snappedX = x < center ? EDGE_MARGIN : SCREEN_W - BUTTON_SIZE - EDGE_MARGIN;
    const clampedY = Math.max(60, Math.min(SCREEN_H - BUTTON_SIZE - 80, pos.y));
    const newPos = { x: snappedX, y: clampedY };
    setPos(newPos);
    Animated.spring(pan, { toValue: { x: snappedX, y: clampedY }, useNativeDriver: true, friction: 7 }).start();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPos)).catch(() => {});
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !listening,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
    onPanResponderGrant: () => {
      pan.setOffset({ x: pan.x._value, y: pan.y._value });
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      pan.flattenOffset();
      const newX = pos.x + g.dx;
      const newY = pos.y + g.dy;
      snapToEdge(newX);
    },
  })).current;

  // Start listening
  const startListening = async () => {
    if (listening || processing) return;
    hapticLight();
    setListening(true);
    setTranscript('');

    try {
      // Try expo-speech-recognition
      const SpeechRecognition = require('expo-speech-recognition');
      if (SpeechRecognition?.default) {
        const result = await SpeechRecognition.default.start({
          lang: 'tr-TR',
          interimResults: false,
        });
        const text = result?.[0]?.transcript || '';
        setTranscript(text);
        if (text.trim()) {
          await processCommand(text.trim());
        } else {
          speakFeedback();
        }
      } else {
        speakFeedback();
      }
    } catch {
      speakFeedback();
    } finally {
      setListening(false);
    }
  };

  // Speak "anlamadim" feedback
  const speakFeedback = () => {
    const msg = userName
      ? `İsteğinizi açık ve sade şekilde söyler misiniz. ${userName} Bey, tam anlayamadım.`
      : 'İsteğinizi açık ve sade şekilde söyler misiniz, tam anlayamadım.';
    Speech.speak(msg, { language: 'tr-TR', rate: 0.85 });
    hapticError();
  };

  // Process voice command via AI dialog API
  const processCommand = async (text: string) => {
    setProcessing(true);
    try {
      const res = await apiClient.post('/voice/ai-dialog', { message: text });
      const data = res.data?.data?.data || res.data?.data || res.data || {};
      const intent = data.intent || 'CREATE_LOAD';
      const params = data.params || {};
      const response = data.response || '';

      // Speak the response
      if (response) {
        Speech.speak(response, { language: 'tr-TR', rate: 0.85 });
      }

      hapticSuccess();

      // Execute action based on intent
      switch (intent) {
        case 'NAVIGATE':
          if (params.screen) setTimeout(() => onNavigate(params.screen, params), 1000);
          break;
        case 'CREATE_EXPENSE':
        case 'LOG_FUEL':
          if (params.amount && params.category) {
            apiClient.post('/finance/expenses', params).catch(() => {});
            setTimeout(() => onNavigate('Finance'), 1000);
          }
          break;
        case 'SEARCH_LOADS':
          setTimeout(() => onNavigate('LoadAccept', params), 1000);
          break;
        case 'SEARCH_MARKETPLACE':
          setTimeout(() => onNavigate('ListingsBrowse', params), 1000);
          break;
        case 'CREATE_LOAD':
          setTimeout(() => onNavigate('AiDialog', { initialMessage: text }), 1000);
          break;
        default:
          break;
      }
    } catch {
      Speech.speak('Bağlantı hatası oluştu. Lütfen tekrar deneyin.', { language: 'tr-TR', rate: 0.85 });
    } finally {
      setProcessing(false);
    }
  };

  // Set initial pan position
  useEffect(() => {
    pan.setValue({ x: pos.x, y: pos.y });
  }, [pos.x, pos.y]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: listening ? pulseAnim : 1 },
          ],
          opacity: processing ? 0.7 : 1,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        onPress={startListening}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            backgroundColor: listening ? '#EF4444' : '#FF6B00',
            shadowColor: listening ? '#EF4444' : '#FF6B00',
          },
        ]}
      >
        {listening ? (
          <View style={styles.listeningInner}>
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        ) : (
          <Text style={styles.icon}>🎤</Text>
        )}
      </TouchableOpacity>

      {/* Transcript display */}
      {transcript && !listening && (
        <View style={[styles.transcriptBubble, { backgroundColor: colors?.card || '#1E293B' }]}>
          <Text style={[styles.transcriptText, { color: colors?.text || '#FFF' }]} numberOfLines={3}>
            {transcript}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 10,
    alignItems: 'center',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: { fontSize: 24 },
  listeningInner: { alignItems: 'center', justifyContent: 'center' },
  transcriptBubble: {
    position: 'absolute',
    bottom: BUTTON_SIZE + 8,
    right: 0,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  transcriptText: { fontSize: 12, lineHeight: 16 },
});
