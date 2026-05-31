import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const AVATAR_IMG = require('../../assets/heykaptan.png');

type AvatarState = 'idle' | 'greeting' | 'listening' | 'talking' | 'thinking' | 'success' | 'error';

interface Props { state: AvatarState; message?: string; }

export default function KaptanAvatar({ state, message }: Props) {
  const entranceX = useRef(new Animated.Value(SW)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const rotateY3D = useRef(new Animated.Value(0)).current;
  const blinkOverlay = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const eyeContact = useRef(new Animated.Value(0)).current;
  const shadowElevation = useRef(new Animated.Value(10)).current;

  // Walk in from right — full body entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceX, { toValue: 0, tension: 35, friction: 8, useNativeDriver: true }),
      Animated.timing(entranceOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // Eye contact — subtle eye movement to feel real
  useEffect(() => {
    const move = Animated.loop(
      Animated.sequence([
        Animated.timing(eyeContact, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(eyeContact, { toValue: -1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    move.start();
    return () => move.stop();
  }, []);

  // Natural blinking
  useEffect(() => {
    let active = true;
    const blink = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(blinkOverlay, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(blinkOverlay, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
      setTimeout(blink, 2800 + Math.random() * 4000);
    };
    setTimeout(blink, 1500);
    return () => { active = false; };
  }, []);

  // Breathing
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.01, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.99, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // 3D rotation — subtle Y-axis sway for depth effect
  useEffect(() => {
    const sway3D = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateY3D, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(rotateY3D, { toValue: -1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    sway3D.start();
    return () => sway3D.stop();
  }, []);

  // Head tilt when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(tilt, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
          Animated.timing(tilt, { toValue: -0.6, duration: 2000, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      tilt.setValue(0);
    }
  }, [state]);

  // Shadow depth changes with state
  useEffect(() => {
    const target = state === 'talking' || state === 'greeting' ? 25 : state === 'listening' ? 20 : 10;
    Animated.spring(shadowElevation, { toValue: target, tension: 60, friction: 6, useNativeDriver: true }).start();
  }, [state]);

  // Glow ring when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.parallel([
        Animated.loop(Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.08, duration: 1500, useNativeDriver: true }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.25, duration: 1500, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 0.85, duration: 1500, useNativeDriver: true }),
        ])),
      ]).start();
    } else {
      ringOpacity.setValue(0);
    }
  }, [state]);

  // Success glow
  useEffect(() => {
    if (state === 'success') {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
    }
  }, [state]);

  const stateColors: Record<string, string> = {
    idle: '#FF6B00', greeting: '#FF6B00', listening: '#3B82F6', talking: '#FF6B00',
    thinking: '#F59E0B', success: '#10B981', error: '#EF4444',
  };
  const ringColor = stateColors[state] || '#FF6B00';

  const faceSize = Math.min(SW * 0.42, 180);

  return (
    <Animated.View style={[s.outer, { transform: [{ translateX: entranceX }], opacity: entranceOpacity }]}>
      {/* Background glow */}
      <Animated.View style={[s.bgGlow, { backgroundColor: ringColor + '10' }]} />

      {/* Glow ring around head */}
      <Animated.View style={[s.glowRing, {
        width: faceSize + 40, height: faceSize + 40, borderRadius: (faceSize + 40) / 2,
        borderColor: ringColor, opacity: ringOpacity,
        transform: [{ scale: ringScale }],
      }]} />

      {/* Full body container — 3D perspective */}
      <Animated.View style={[s.bodyContainer, {
        transform: [
          { scale: breathe },
          { perspective: 800 },
          { rotateY: rotateY3D.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) },
        ],
      }]}>
        {/* ── HEAD SECTION ── */}
        <Animated.View style={[s.headSection, { width: faceSize, transform: [{ rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-1.5deg', '1.5deg'] }) }] }]}>
          {/* Face frame with 3D shadow */}
          <Animated.View style={[s.faceFrame, {
            width: faceSize, height: faceSize, borderRadius: faceSize / 2, borderColor: ringColor,
            shadowOpacity: shadowElevation.interpolate({ inputRange: [10, 25], outputRange: [0.3, 0.6] }),
            shadowRadius: shadowElevation,
            elevation: shadowElevation,
          }]}>
            {/* Actual face from photo */}
            <Image source={AVATAR_IMG} style={[s.faceImage, { width: faceSize, height: faceSize, borderRadius: faceSize / 2 }]} resizeMode="cover" />
            {/* Blink overlay */}
            <Animated.View style={[s.blinkOverlay, { width: faceSize, height: faceSize, borderRadius: faceSize / 2, opacity: blinkOverlay }]} />
            {/* Subtle eye movement highlight */}
            <Animated.View style={[s.eyeHighlight, {
              transform: [{ translateX: eyeContact.interpolate({ inputRange: [-1, 1], outputRange: [-2, 2] }) }, { translateY: eyeContact.interpolate({ inputRange: [-1, 1], outputRange: [-1, 1] }) }],
            }]} />

            {/* State indicator ring */}
            <View style={[s.stateRing, { borderColor: ringColor }]}>
              {state === 'listening' && <View style={[s.statePulse, { backgroundColor: ringColor }]} />}
              {state === 'talking' && <View style={[s.stateDot, { backgroundColor: ringColor }]} />}
              {state === 'thinking' && <View style={s.thinkingDots}>

                {[0, 1, 2].map(i => <View key={i} style={[s.thinkDot, { backgroundColor: ringColor, opacity: 1 - i * 0.35 }]} />)}
              </View>}
            </View>
          </Animated.View>

          {/* Hair flowing down sides */}
          <View style={[s.hairFlowL, { borderRightColor: '#1A0D03', borderRightWidth: faceSize * 0.08 }]} />
          <View style={[s.hairFlowR, { borderLeftColor: '#1A0D03', borderLeftWidth: faceSize * 0.08 }]} />
        </Animated.View>

        {/* ── NECK ── */}
        <View style={[s.neck, { width: faceSize * 0.22, backgroundColor: '#E8C4A8' }]}>
          <View style={[s.neckShadow, { backgroundColor: '#D4A88830' }]} />
        </View>

        {/* ── SHOULDERS / UPPER BODY ── */}
        <View style={[s.shoulders, { width: faceSize * 1.8 }]}>
          {/* Left shoulder */}
          <View style={[s.shoulder, { backgroundColor: '#0F2645', borderBottomLeftRadius: faceSize * 0.3 }]}>
            <View style={[s.shoulderPad, { backgroundColor: '#1A3D6D' }]} />
          </View>
          {/* Right shoulder */}
          <View style={[s.shoulderR, { backgroundColor: '#0F2645', borderBottomRightRadius: faceSize * 0.3 }]}>
            <View style={[s.shoulderPadR, { backgroundColor: '#1A3D6D' }]} />
          </View>
        </View>

        {/* ── COLLAR ── */}
        <View style={[s.collarArea, { marginTop: -faceSize * 0.02 }]}>
          <View style={[s.collarWhite, { borderBottomColor: '#FFFFFF', borderLeftWidth: faceSize * 0.18, borderRightWidth: faceSize * 0.18 }]} />
          <View style={[s.collarInner, { borderBottomColor: '#F0EAE0', borderLeftWidth: faceSize * 0.12, borderRightWidth: faceSize * 0.12 }]} />
        </View>

        {/* ── TORSO ── */}
        <View style={[s.torso, { width: faceSize * 1.6, backgroundColor: '#0F2645' }]}>
          {/* Jacket lapels */}
          <View style={[s.lapelL, { borderRightColor: '#1A3D6D', borderTopWidth: faceSize * 0.25 }]} />
          <View style={[s.lapelR, { borderLeftColor: '#1A3D6D', borderTopWidth: faceSize * 0.25 }]} />
          {/* Center line */}
          <View style={[s.centerLine, { backgroundColor: '#0A1A30', height: faceSize * 0.35 }]} />
          {/* KAPTAN badge */}
          <View style={[s.badge, { backgroundColor: '#FF6B00', width: faceSize * 0.12, height: faceSize * 0.12 }]}>
            <Text style={[s.badgeText, { fontSize: faceSize * 0.07 }]}>K</Text>
          </View>
          {/* Bottom of torso */}
          <View style={[s.torsoBottom, { backgroundColor: '#0A1A30', width: faceSize * 1.6, height: faceSize * 0.04 }]} />
        </View>
      </Animated.View>

      {/* Success glow */}
      <Animated.View style={[s.successGlow, { opacity: glowAnim }]} />

      {/* Thinking overlay */}
      {state === 'thinking' && (
        <View style={[s.thinkingOverlay, { borderRadius: faceSize }]} />
      )}

      {/* Message bubble */}
      {message ? (
        <Animated.View style={[s.bubble, { borderColor: ringColor + '50', maxWidth: SW * 0.85 }]}>
          <View style={[s.bubbleTail, { borderRightColor: '#141824' }]} />
          <Text style={s.bubbleText}>{message}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 30 },
  bgGlow: { position: 'absolute', top: '10%', width: SW * 0.8, height: SW * 0.8, borderRadius: SW * 0.4 },
  glowRing: { position: 'absolute', top: '12%', borderWidth: 2, borderStyle: 'dashed' },
  // Body
  bodyContainer: { alignItems: 'center' },
  // Head
  headSection: { alignItems: 'center' },
  faceFrame: { borderWidth: 3, overflow: 'hidden', shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  faceImage: { position: 'absolute' },
  blinkOverlay: { position: 'absolute', backgroundColor: '#0A0D14' },
  eyeHighlight: { position: 'absolute', top: '25%', left: '30%', width: 8, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF20' },
  hairFlowL: { position: 'absolute', left: -4, top: '10%', width: 0, height: 0, borderTopWidth: 40, borderTopColor: 'transparent' },
  hairFlowR: { position: 'absolute', right: -4, top: '10%', width: 0, height: 0, borderTopWidth: 40, borderTopColor: 'transparent' },
  stateRing: { position: 'absolute', bottom: 8, right: 8, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#FFFFFF30', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0D1480' },
  statePulse: { width: 8, height: 8, borderRadius: 4 },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  thinkingDots: { flexDirection: 'row', gap: 3 },
  thinkDot: { width: 4, height: 4, borderRadius: 2 },
  // Neck
  neck: { height: 30, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, alignItems: 'center' },
  neckShadow: { width: '60%', height: 8, borderRadius: 4, marginTop: 10 },
  // Shoulders
  shoulders: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  shoulder: { flex: 1, height: 60, marginRight: 1 },
  shoulderPad: { position: 'absolute', top: 8, left: 10, right: 10, height: 30, borderRadius: 20 },
  shoulderR: { flex: 1, height: 60, marginLeft: 1 },
  shoulderPadR: { position: 'absolute', top: 8, left: 10, right: 10, height: 30, borderRadius: 20 },
  // Collar
  collarArea: { alignItems: 'center', zIndex: 5 },
  collarWhite: { width: 0, height: 0, borderBottomWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  collarInner: { width: 0, height: 0, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -10 },
  // Torso
  torso: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  lapelL: { position: 'absolute', top: 0, left: '20%', width: 0, height: 0, borderRightWidth: 20, borderTopColor: 'transparent' },
  lapelR: { position: 'absolute', top: 0, right: '20%', width: 0, height: 0, borderLeftWidth: 20, borderTopColor: 'transparent' },
  centerLine: { width: 2, marginTop: 2 },
  badge: { position: 'absolute', top: '45%', left: 12, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontWeight: '900' },
  torsoBottom: { position: 'absolute', bottom: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  // Effects
  successGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: '#10B981' },
  thinkingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F59E0B20' },
  // Bubble
  bubble: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, backgroundColor: '#141824', borderWidth: 1, borderTopLeftRadius: 4 },
  bubbleTail: { position: 'absolute', top: -7, left: 16, width: 0, height: 0, borderTopWidth: 7, borderRightWidth: 10, borderTopColor: 'transparent' },
  bubbleText: { color: '#E2E8F0', fontSize: 14, lineHeight: 21, fontWeight: '500', textAlign: 'center' },
});
