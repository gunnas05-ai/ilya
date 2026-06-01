import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, Easing, StatusBar } from 'react-native';
import * as Speech from 'expo-speech';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { hapticLight, hapticSuccess } from '../utils/haptic';
import Avatar3D from './Avatar3D';

const { width: SW, height: SH } = Dimensions.get('window');

// Audio visualizer bars
function AudioVisualizer({ active }: { active: boolean }) {
  const bars = useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (active) {
      const anims = bars.map((bar, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, { toValue: 1, duration: 200 + i * 50, useNativeDriver: true }),
            Animated.timing(bar, { toValue: 0.2, duration: 200 + i * 50, useNativeDriver: true }),
          ]),
        ),
      );
      anims.forEach(a => a.start());
      return () => anims.forEach(a => a.stop());
    } else {
      bars.forEach(b => b.setValue(0.2));
    }
  }, [active]);

  return (
    <View style={awStyles.row}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[awStyles.bar, { transform: [{ scaleY: bar.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]}
        />
      ))}
    </View>
  );
}
const awStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24, justifyContent: 'center' },
  bar: { width: 4, height: 24, borderRadius: 2, backgroundColor: '#FF6B00' },
});

type AvatarState = 'idle' | 'greeting' | 'listening' | 'talking' | 'thinking' | 'success' | 'error';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 17) return 'İyi günler';
  return 'İyi akşamlar';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string, params?: any) => void;
}

export default function VoiceAssistantModal({ visible, onClose, onNavigate }: Props) {
  const { user } = useAuthStore();
  const userName = user?.fullName?.split(' ')[0] || '';
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [showDialog, setShowDialog] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(100)).current;
  const cameraZoom = useRef(new Animated.Value(1)).current;
  const cameraZoomTriggered = useRef(false);

  // Ambient floating particles
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * SW,
      y: Math.random() * SH,
      size: 2 + Math.random() * 4,
      speed: 15 + Math.random() * 25,
      opacity: 0.1 + Math.random() * 0.25,
      anim: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (!visible) return;
    const loops = particles.map(p => {
      const loop = Animated.loop(
        Animated.timing(p.anim, { toValue: 1, duration: p.speed * 1000, easing: Easing.linear, useNativeDriver: true }),
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach(l => l.stop());
  }, [visible]);

  // Entry animation
  useEffect(() => {
    if (visible) {
      setAvatarState('greeting');
      setConversation([]);
      setShowDialog(false);
      cameraZoomTriggered.current = false;

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 45, friction: 8, useNativeDriver: true }),
      ]).start();

      // Kamera zoom: 1.5sn sonra yüze yakınlaş
      setTimeout(() => {
        if (!cameraZoomTriggered.current) {
          cameraZoomTriggered.current = true;
          Animated.spring(cameraZoom, { toValue: 1.25, tension: 60, friction: 5, useNativeDriver: true }).start();
        }
      }, 1500);

      // Greeting — text immediately, speech with slight delay
      const greeting = `${getGreeting()} ${userName} Bey. Kaptan Platformuna hoş geldiniz. Size nasıl yardımcı olabilirim?`;
      setMessage(greeting);
      setTimeout(() => {
        setAvatarState('talking');
        Speech.speak(greeting, {
          language: 'tr-TR', rate: 0.85, pitch: 1.05,
          onDone: () => {
            setAvatarState('idle');
            setShowDialog(true);
            setTimeout(() => startListening(), 400);
          },
        });
      }, 800);
    } else {
      fadeAnim.setValue(0);
      slideUp.setValue(100);
    }
  }, [visible]);

  // Cleanup on close
  useEffect(() => {
    return () => {
      Speech.stop();
      try { const SR = require('expo-speech-recognition'); SR?.default?.stop?.(); } catch {}
    };
  }, []);

  // Close handler with cleanup
  const handleClose = () => {
    Speech.stop();
    try { const SR = require('expo-speech-recognition'); SR?.default?.stop?.(); } catch {}
    onClose();
  };

  const avatarColors: Record<string, string> = {
    idle: '#FF6B00', greeting: '#FF6B00', listening: '#3B82F6', talking: '#FF6B00',
    thinking: '#F59E0B', success: '#10B981', error: '#EF4444',
  };
  const stateLabels: Record<string, string> = {
    idle: 'Hazır', greeting: 'Selamlıyor', listening: 'Dinliyor...',
    talking: 'Konuşuyor...', thinking: 'Düşünüyor...', success: 'Tamam!', error: 'Hata',
  };

  const startListening = async () => {
    setAvatarState('listening');
    setMessage('Dinleniyor...');
    hapticLight();

    try {
      let SpeechRecognition: any = null;
      try { SpeechRecognition = require('expo-speech-recognition'); } catch {}

      if (SpeechRecognition?.default?.start) {
        const result = await SpeechRecognition.default.start({ lang: 'tr-TR', interimResults: false });
        const text = result?.[0]?.transcript || '';
        if (text.trim()) {
          setConversation(prev => [...prev, { role: 'user', text }]);
          await processCommand(text);
        } else {
          respondWithText('Sesinizi alamadım. Lütfen tekrar deneyin veya yazarak devam edin.');
          setAvatarState('idle');
        }
      } else {
        // Fallback: Ses tanıma yoksa, kullanıcıya yazmasını söyle
        respondWithText('Ses tanıma şu anda kullanılamıyor. Lütfen komutunuzu yazarak iletin veya AiDialog sayfasına gidin.');
        setAvatarState('idle');
        setTimeout(() => {
          onClose();
          onNavigate('AiDialog');
        }, 2000);
      }
    } catch (err: any) {
      respondWithText('Ses tanıma başlatılamadı. Lütfen tekrar deneyin.');
      setAvatarState('idle');
    }
  };

  const processCommand = async (text: string) => {
    setAvatarState('thinking');
    setMessage('Düşünüyorum...');

    try {
      const res = await apiClient.post('/voice/ai-dialog', { message: text });
      const data = res.data?.data?.data || res.data?.data || res.data || {};
      const response = data.response || 'İsteğiniz alındı.';
      const intent = data.intent || '';
      const params = data.params || {};

      // Speak and animate
      setAvatarState('talking');
      setMessage(response);
      setConversation(prev => [...prev, { role: 'assistant', text: response }]);

      Speech.speak(response, {
        language: 'tr-TR', rate: 0.85, pitch: 1.05,
        onDone: () => {
          hapticSuccess();
          setAvatarState('success');
          setTimeout(() => setAvatarState('idle'), 800);

          // Execute action
          if (intent === 'NAVIGATE' && params.screen) {
            setTimeout(() => { onClose(); onNavigate(params.screen, params); }, 600);
          } else if (intent === 'CREATE_EXPENSE' || intent === 'LOG_FUEL') {
            if (params.amount && params.category) {
              apiClient.post('/finance/expenses', params).catch(() => {});
            }
          } else if (intent === 'CREATE_LOAD') {
            setTimeout(() => { onClose(); onNavigate('AiDialog', { initialMessage: text }); }, 600);
          } else if (intent === 'SEARCH_LOADS') {
            setTimeout(() => { onClose(); onNavigate('LoadAccept', params); }, 600);
          }
          // Auto-listen again after response
          setTimeout(() => startListening(), 1500);
        },
      });
    } catch {
      respondWithText('Bağlantı hatası. Lütfen tekrar deneyin.');
      setAvatarState('error');
      setTimeout(() => setAvatarState('idle'), 1000);
    }
  };

  const respondWithText = (text: string) => {
    setMessage(text);
    setConversation(prev => [...prev, { role: 'assistant', text }]);
    Speech.speak(text, { language: 'tr-TR', rate: 0.85, pitch: 1.05 });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Dark overlay */}
        <View style={styles.darkBg} />

        {/* Ambient particles */}
        {particles.map(p => (
          <Animated.View
            key={p.id}
            style={[styles.particle, {
              left: p.x, width: p.size, height: p.size, borderRadius: p.size / 2,
              backgroundColor: '#FF6B00', opacity: p.opacity,
              transform: [{ translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [SH, -50] }) }],
            }]}
          />
        ))}

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Vignette overlay */}
        <View style={styles.vignette} pointerEvents="none" />

        {/* 3D Avatar */}
        <Animated.View style={[styles.avatarContainer, { transform: [{ translateY: slideUp }, { scale: cameraZoom }] }]}>
          <Avatar3D state={avatarState} height={380} />

          {/* State label */}
          <Text style={[styles.stateLabel, { color: avatarColors[avatarState] || '#FF6B00' }]}>
            {stateLabels[avatarState] || ''}
          </Text>

          {/* Message below avatar */}
          {message ? (
            <View style={[styles.msgBubble, { borderColor: (['listening','idle','greeting','talking','thinking','success','error'].indexOf(avatarState) >= 0 ? {idle:'#FF6B00',greeting:'#FF6B00',listening:'#3B82F6',talking:'#FF6B00',thinking:'#F59E0B',success:'#10B981',error:'#EF4444'}[avatarState] : '#FF6B00') + '60' }]}>
              <Text style={styles.msgText}>{message}</Text>
            </View>
          ) : null}

          {/* Audio visualizer when talking */}
          {avatarState === 'talking' && (
            <View style={{ marginTop: 12 }}>
              <AudioVisualizer active={true} />
            </View>
          )}
        </Animated.View>

        {/* Conversation history */}
        {showDialog && conversation.length > 0 && (
          <View style={styles.conversation}>
            {conversation.slice(-3).map((item, i) => (
              <View key={i} style={[styles.msgRow, item.role === 'user' ? styles.userMsg : styles.aiMsg]}>
                <Text style={[styles.msgText, item.role === 'user' ? styles.userMsgText : styles.aiMsgText]}>
                  {item.role === 'user' ? '🧑 ' : '👩‍💼 '}{item.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Manual trigger — user taps to speak again */}
        {showDialog && avatarState === 'idle' && (
          <TouchableOpacity style={styles.listenBtn} onPress={startListening}>
            <Text style={styles.listenBtnText}>🎤 Konuşmak için dokunun</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  darkBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  avatarContainer: { marginBottom: 20 },
  conversation: { position: 'absolute', bottom: 160, left: 20, right: 20, maxHeight: 200 },
  msgRow: { marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, maxWidth: '85%' },
  userMsg: { alignSelf: 'flex-end', backgroundColor: '#FF6B0030', borderWidth: 1, borderColor: '#FF6B0050' },
  aiMsg: { alignSelf: 'flex-start', backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  msgText: { fontSize: 14, lineHeight: 20 },
  userMsgText: { color: '#FFF' },
  aiMsgText: { color: '#E2E8F0' },
  listenBtn: { position: 'absolute', bottom: 100, paddingHorizontal: 30, paddingVertical: 16, borderRadius: 30, backgroundColor: '#FF6B00', shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  listenBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  particle: { position: 'absolute' },
  vignette: { ...StyleSheet.absoluteFillObject, zIndex: 1, pointerEvents: 'none' },
  stateLabel: { textAlign: 'center', marginTop: 8, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  msgBubble: { marginTop: 10, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: '#141824', borderWidth: 1, maxWidth: '85%', alignSelf: 'center' },
  msgText: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, fontWeight: '500', textAlign: 'center' },
});
