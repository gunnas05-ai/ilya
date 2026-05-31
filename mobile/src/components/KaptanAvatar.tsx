import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

type AvatarState = 'idle' | 'greeting' | 'listening' | 'talking' | 'thinking' | 'success' | 'error';

interface Props { state: AvatarState; message?: string; }

export default function KaptanAvatar({ state, message }: Props) {
  const entranceX = useRef(new Animated.Value(400)).current;
  const entranceScale = useRef(new Animated.Value(0.85)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const blinkY = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const mouthScale = useRef(new Animated.Value(0)).current;
  const mouthAnim = useRef<any>(null);
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Walk-in entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceX, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.spring(entranceScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(entranceOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Blinking
  useEffect(() => {
    let active = true;
    const blink = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(blinkY, { toValue: 0.05, duration: 60, useNativeDriver: true }),
        Animated.timing(blinkY, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      setTimeout(blink, 2500 + Math.random() * 4000);
    };
    setTimeout(blink, 1500);
    return () => { active = false; };
  }, []);

  // Breathing
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.02, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.98, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Head tilt when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(tilt, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(tilt, { toValue: -1, duration: 1500, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      tilt.setValue(0);
    }
  }, [state]);

  // Lip sync when talking
  useEffect(() => {
    if (state === 'talking') {
      if (mouthAnim.current) mouthAnim.current.stop();
      mouthAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthScale, { toValue: 1, duration: 100 + Math.random() * 100, useNativeDriver: true }),
          Animated.timing(mouthScale, { toValue: 0.2, duration: 100 + Math.random() * 100, useNativeDriver: true }),
          Animated.timing(mouthScale, { toValue: 0.7, duration: 80 + Math.random() * 80, useNativeDriver: true }),
          Animated.timing(mouthScale, { toValue: 0.3, duration: 120 + Math.random() * 100, useNativeDriver: true }),
        ]),
      );
      mouthAnim.current.start();
    } else {
      if (mouthAnim.current) mouthAnim.current.stop();
      mouthScale.setValue(0);
    }
  }, [state]);

  // Glow ring when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.parallel([
        Animated.loop(Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.15, duration: 1200, useNativeDriver: true }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 0.95, duration: 1200, useNativeDriver: true }),
        ])),
      ]).start();
    }
  }, [state]);

  // Success glow
  useEffect(() => {
    if (state === 'success') {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
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

      {/* Name tag */}
      <View style={[s.nameTag, { borderColor: ringColor }]}>
        <Text style={s.nameText}>KAPTAN AI</Text>
      </View>

      {/* Avatar body group */}
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        {/* Head */}
        <Animated.View style={[s.head, { borderColor: ringColor, transform: [{ rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) }] }]}>
          {/* Hair back */}
          <View style={s.hairBack} />
          {/* Hair top */}
          <View style={s.hairTop}>
            <View style={[s.hairTopCurve, { borderBottomColor: '#1A0D05' }]} />
          </View>
          {/* Hair side */}
          <View style={[s.hairLeft, { borderRightColor: '#1A0D05' }]} />
          <View style={[s.hairRight, { borderLeftColor: '#1A0D05' }]} />
          {/* Face */}
          <View style={s.face}>
            {/* Eyebrows */}
            <View style={s.eyebrows}>
              <View style={[s.eyebrow, { backgroundColor: '#3D1C00' }]} />
              <View style={[s.eyebrow, { backgroundColor: '#3D1C00' }]} />
            </View>
            {/* Eyes */}
            <Animated.View style={[s.eyes, { transform: [{ scaleY: blinkY }] }]}>
              <View style={[s.eye, { backgroundColor: '#FFFFFF' }]}>
                <View style={[s.iris, { backgroundColor: '#4A2800' }]}>
                  <View style={s.pupil} />
                  <View style={s.eyeHighlight} />
                </View>
              </View>
              <View style={[s.eye, { backgroundColor: '#FFFFFF' }]}>
                <View style={[s.iris, { backgroundColor: '#4A2800' }]}>
                  <View style={s.pupil} />
                  <View style={s.eyeHighlight} />
                </View>
              </View>
            </Animated.View>
            {/* Nose */}
            <View style={s.nose} />
            {/* Mouth */}
            <Animated.View style={[s.mouth, { transform: [{ scaleY: mouthScale.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }] }]}>
              <View style={[s.lips, { backgroundColor: '#C96B6B' }]} />
            </Animated.View>
            {/* Cheeks */}
            <View style={[s.cheek, { left: 6, backgroundColor: '#F0C0B020' }]} />
            <View style={[s.cheek, { right: 6, backgroundColor: '#F0C0B020' }]} />
          </View>
        </Animated.View>

        {/* Neck */}
        <View style={s.neck} />

        {/* Body */}
        <View style={s.body}>
          {/* Collar */}
          <View style={[s.collar, { borderBottomColor: '#FFFFFF' }]} />
          <View style={[s.collarInner, { borderBottomColor: '#F5F0EB' }]} />
          {/* Jacket */}
          <View style={[s.jacket, { backgroundColor: '#1E3A5F' }]}>
            <View style={[s.jacketLine, { backgroundColor: '#2A5080' }]} />
            {/* KAPTAN badge */}
            <View style={[s.badge, { backgroundColor: '#FF6B00' }]}>
              <Text style={s.badgeText}>K</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Message bubble */}
      {message ? (
        <Animated.View style={[s.bubble, { borderColor: ringColor, opacity: entranceOpacity }]}>
          <View style={[s.bubbleArrow, { borderRightColor: '#1A1F2E' }]} />
          <Text style={s.bubbleText}>{message}</Text>
        </Animated.View>
      ) : null}

      {/* Success glow overlay */}
      <Animated.View style={[s.successGlow, { opacity: glowAnim }]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  outer: { alignItems: 'center', paddingTop: 30 },
  glowRing: { position: 'absolute', top: 50, width: 160, height: 280, borderRadius: 100, borderWidth: 2, borderStyle: 'dashed' },
  nameTag: { marginBottom: 10, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 10, borderWidth: 1, backgroundColor: '#0F172A' },
  nameText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  // Head
  head: { width: 110, height: 120, borderRadius: 55, backgroundColor: '#F5D0B0', borderWidth: 1.5, overflow: 'hidden', alignItems: 'center' },
  hairBack: { position: 'absolute', top: -5, width: 110, height: 50, backgroundColor: '#1A0D05', borderRadius: 10 },
  hairTop: { position: 'absolute', top: -8, width: 116, alignItems: 'center', zIndex: 2 },
  hairTopCurve: { width: 0, height: 0, borderLeftWidth: 58, borderRightWidth: 58, borderBottomWidth: 40, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  hairLeft: { position: 'absolute', left: -3, top: 10, width: 0, height: 0, borderTopWidth: 70, borderRightWidth: 25, borderTopColor: 'transparent', zIndex: 1 },
  hairRight: { position: 'absolute', right: -3, top: 10, width: 0, height: 0, borderTopWidth: 70, borderLeftWidth: 25, borderTopColor: 'transparent', zIndex: 1 },
  face: { flex: 1, alignItems: 'center', paddingTop: 28 },
  eyebrows: { flexDirection: 'row', gap: 22, marginBottom: 2 },
  eyebrow: { width: 18, height: 3, borderRadius: 1.5 },
  eyes: { flexDirection: 'row', gap: 18, marginBottom: 4 },
  eye: { width: 18, height: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 0.5, borderColor: '#D4B090' },
  iris: { width: 10, height: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  pupil: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#000000' },
  eyeHighlight: { position: 'absolute', top: 1, right: 1.5, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFFFFF80' },
  nose: { width: 6, height: 10, borderRadius: 3, backgroundColor: '#E0B898', marginBottom: 2 },
  mouth: { width: 22, height: 8, alignItems: 'center', justifyContent: 'center' },
  lips: { width: 18, height: 5, borderRadius: 3 },
  cheek: { position: 'absolute', bottom: 35, width: 14, height: 10, borderRadius: 7 },
  // Neck
  neck: { width: 30, height: 20, backgroundColor: '#E8C0A0', marginTop: -4 },
  // Body
  body: { alignItems: 'center', marginTop: -2 },
  collar: { position: 'absolute', top: 2, width: 0, height: 0, borderLeftWidth: 35, borderRightWidth: 35, borderBottomWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent', zIndex: 3 },
  collarInner: { position: 'absolute', top: 5, width: 0, height: 0, borderLeftWidth: 22, borderRightWidth: 22, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', zIndex: 4 },
  jacket: { width: 80, height: 70, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingTop: 14 },
  jacketLine: { position: 'absolute', top: 20, width: 2, height: 50 },
  badge: { position: 'absolute', top: 30, left: 8, width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  // Bubble
  bubble: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18, backgroundColor: '#1A1F2E', borderWidth: 1, maxWidth: 280, borderTopLeftRadius: 4 },
  bubbleArrow: { position: 'absolute', top: -6, left: 10, width: 0, height: 0, borderTopWidth: 6, borderRightWidth: 8, borderTopColor: 'transparent' },
  bubbleText: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  successGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: '#10B98120' },
});
