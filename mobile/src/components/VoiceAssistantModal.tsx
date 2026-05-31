import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import * as Speech from 'expo-speech';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { hapticLight, hapticSuccess } from '../utils/haptic';
import KaptanAvatar from './KaptanAvatar';

const { width: SW, height: SH } = Dimensions.get('window');

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

  // Entry animation
  useEffect(() => {
    if (visible) {
      setAvatarState('greeting');
      setConversation([]);
      setShowDialog(false);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();

      // Greeting
      const greeting = `${getGreeting()} ${userName} Bey. Kaptan Platformuna hoş geldiniz. Size nasıl yardımcı olabilirim?`;
      setTimeout(() => {
        setMessage(greeting);
        setAvatarState('talking');
        Speech.speak(greeting, {
          language: 'tr-TR', rate: 0.85, pitch: 1.05,
          onDone: () => {
            setAvatarState('idle');
            setShowDialog(true);
            setTimeout(() => startListening(), 500);
          },
        });
      }, 800);
    } else {
      fadeAnim.setValue(0);
      slideUp.setValue(100);
    }
  }, [visible]);

  // Cleanup speech on close
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  const startListening = async () => {
    setAvatarState('listening');
    setMessage('Dinleniyor...');
    hapticLight();

    try {
      const SpeechRecognition = require('expo-speech-recognition');
      if (SpeechRecognition?.default) {
        const result = await SpeechRecognition.default.start({ lang: 'tr-TR', interimResults: false });
        const text = result?.[0]?.transcript || '';
        if (text.trim()) {
          setConversation(prev => [...prev, { role: 'user', text }]);
          await processCommand(text);
        } else {
          respondWithText('Sesinizi alamadım. Lütfen tekrar deneyin veya yazabilirsiniz.');
          setAvatarState('idle');
        }
      } else {
        respondWithText('Ses tanıma şu anda kullanılamıyor.');
        setAvatarState('idle');
      }
    } catch {
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

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Avatar */}
        <Animated.View style={[styles.avatarContainer, { transform: [{ translateY: slideUp }] }]}>
          <KaptanAvatar state={avatarState} message={message} />
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
});
