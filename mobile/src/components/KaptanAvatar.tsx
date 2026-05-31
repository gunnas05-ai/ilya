import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';

const AVATAR_IMG = require('../../assets/heykaptan.png');

type AvatarState = 'idle' | 'greeting' | 'listening' | 'talking' | 'thinking' | 'success' | 'error';

interface Props { state: AvatarState; message?: string; }

export default function KaptanAvatar({ state, message }: Props) {
  const entranceX = useRef(new Animated.Value(400)).current;
  const entranceScale = useRef(new Animated.Value(0.85)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const blinkOverlay = useRef(new Animated.Value(0)).current;
  const pulseBorder = useRef(new Animated.Value(1)).current;
  // Walk-in entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceX, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.spring(entranceScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(entranceOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Natural blinking (full eyelid close over image)
  useEffect(() => {
    let active = true;
    const blink = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(blinkOverlay, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(blinkOverlay, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
      setTimeout(blink, 2800 + Math.random() * 4000);
    };
    setTimeout(blink, 1500);
    return () => { active = false; };
  }, []);

  // Subtle breathing
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.012, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.988, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Head tilt when listening
  useEffect(() => {
    if (state === 'listening') {
      tilt.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(tilt, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(tilt, { toValue: -1, duration: 2000, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      tilt.setValue(0);
    }
  }, [state]);

  // Glow ring + pulse border when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.parallel([
        Animated.loop(Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.5, duration: 1400, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.1, duration: 1400, useNativeDriver: true }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.4, duration: 1400, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 0.9, duration: 1400, useNativeDriver: true }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(pulseBorder, { toValue: 1.05, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseBorder, { toValue: 0.95, duration: 700, useNativeDriver: true }),
        ])),
      ]).start();
    } else {
      ringOpacity.setValue(0);
      pulseBorder.setValue(1);
    }
  }, [state]);

  // Success glow
  useEffect(() => {
    if (state === 'success') {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
    }
  }, [state]);

  const stateColors: Record<string, string> = {
    idle: '#FF6B00', greeting: '#FF6B00', listening: '#3B82F6', talking: '#FF6B00',
    thinking: '#F59E0B', success: '#10B981', error: '#EF4444',
  };
  const ringColor = stateColors[state] || '#FF6B00';

  return (
    <Animated.View style={[s.outer, { transform: [{ translateX: entranceX }, { scale: entranceScale }], opacity: entranceOpacity }]}>
      {/* Glow ring */}
      <Animated.View style={[s.glowRing, { borderColor: ringColor, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />

      {/* Status badge */}
      <View style={[s.statusBadge, { borderColor: ringColor }]}>
        <Text style={s.statusBadgeText}>KAPTAN AI</Text>
      </View>

      {/* Avatar image container */}
      <Animated.View style={[s.imageContainer, { borderColor: ringColor, transform: [{ scale: Animated.multiply(breathe, pulseBorder) }, { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-2deg', '2deg'] }) }] }]}>
        {/* The actual portrait */}
        <Image source={AVATAR_IMG} style={s.avatarImage} resizeMode="cover" />

        {/* Blink overlay — simulates eyelid closing */}
        <Animated.View style={[s.blinkOverlay, { opacity: blinkOverlay }]} />

        {/* State indicator dot */}
        <View style={[s.stateDot, { backgroundColor: ringColor }]}>
          {state === 'listening' && <View style={s.stateDotInner} />}
          {state === 'talking' && <View style={s.stateDotPulse} />}
          {state === 'thinking' && <View style={s.stateDots}><View style={[s.thinkDot, { backgroundColor: ringColor }]} /><View style={[s.thinkDot, { backgroundColor: ringColor, opacity: 0.6 }]} /><View style={[s.thinkDot, { backgroundColor: ringColor, opacity: 0.3 }]} /></View>}
        </View>

        {/* Thinking overlay */}
        {state === 'thinking' && (
          <Animated.View style={[s.thinkingOverlay, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) }]} />
        )}

        {/* Success flash */}
        <Animated.View style={[s.successOverlay, { opacity: glowAnim }]} />
      </Animated.View>

      {/* Message bubble */}
      {message ? (
        <Animated.View style={[s.bubble, { borderColor: ringColor + '60' }]}>
          <View style={[s.bubbleTail, { borderRightColor: '#141824' }]} />
          <Text style={s.bubbleText} numberOfLines={4}>{message}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  outer: { alignItems: 'center', paddingTop: 15 },
  glowRing: { position: 'absolute', top: 70, width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderStyle: 'dashed' },
  statusBadge: { marginBottom: 16, paddingHorizontal: 20, paddingVertical: 5, borderRadius: 14, borderWidth: 1.5, backgroundColor: '#0A0F1A' },
  statusBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  // Image
  imageContainer: { width: 170, height: 170, borderRadius: 85, borderWidth: 3, overflow: 'hidden', backgroundColor: '#1A1A2E' },
  avatarImage: { width: 170, height: 170, borderRadius: 85 },
  blinkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1A1A2E', borderRadius: 85 },
  // State indicators
  stateDot: { position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF30' },
  stateDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  stateDotPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF80' },
  stateDots: { flexDirection: 'row', gap: 3 },
  thinkDot: { width: 4, height: 4, borderRadius: 2 },
  thinkingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F59E0B', borderRadius: 85 },
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#10B981', borderRadius: 85 },
  // Bubble
  bubble: { marginTop: 18, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, backgroundColor: '#141824', borderWidth: 1, maxWidth: 290, borderTopLeftRadius: 4 },
  bubbleTail: { position: 'absolute', top: -7, left: 14, width: 0, height: 0, borderTopWidth: 7, borderRightWidth: 10, borderTopColor: 'transparent' },
  bubbleText: { color: '#E2E8F0', fontSize: 14, lineHeight: 21, fontWeight: '500' },
});
