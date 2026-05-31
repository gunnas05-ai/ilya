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
  const mouthW = useRef(new Animated.Value(0)).current;
  const mouthAnim = useRef<any>(null);
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const smileAnim = useRef(new Animated.Value(0)).current;

  // Walk-in entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceX, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.spring(entranceScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(entranceOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    // Smile after entrance
    Animated.timing(smileAnim, { toValue: 1, duration: 800, delay: 1000, useNativeDriver: true }).start();
  }, []);

  // Blinking
  useEffect(() => {
    let active = true;
    const blink = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(blinkY, { toValue: 0.05, duration: 60, useNativeDriver: true }),
        Animated.timing(blinkY, { toValue: 1, duration: 120, useNativeDriver: true }),
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
        Animated.timing(breathe, { toValue: 1.015, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.985, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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
          Animated.timing(tilt, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(tilt, { toValue: -1, duration: 1800, useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [state]);

  // Lip sync when talking
  useEffect(() => {
    if (state === 'talking') {
      if (mouthAnim.current) mouthAnim.current.stop();
      mouthAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthW, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(mouthW, { toValue: 0.2, duration: 100, useNativeDriver: true }),
          Animated.timing(mouthW, { toValue: 0.8, duration: 90, useNativeDriver: true }),
          Animated.timing(mouthW, { toValue: 0.3, duration: 140, useNativeDriver: true }),
        ]),
      );
      mouthAnim.current.start();
    } else {
      if (mouthAnim.current) mouthAnim.current.stop();
      mouthW.setValue(0);
    }
  }, [state]);

  // Glow ring when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.parallel([
        Animated.loop(Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.45, duration: 1300, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.12, duration: 1300, useNativeDriver: true }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.35, duration: 1300, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 0.92, duration: 1300, useNativeDriver: true }),
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
        Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
      // Smile on success
      Animated.spring(smileAnim, { toValue: 1, tension: 80, useNativeDriver: true }).start();
    }
  }, [state]);

  // Thinking state — slight upward gaze
  const thinkingGaze = state === 'thinking' ? -5 : 0;

  const stateColors: Record<string, string> = {
    idle: '#FF6B00', greeting: '#FF6B00', listening: '#3B82F6', talking: '#FF6B00',
    thinking: '#F59E0B', success: '#10B981', error: '#EF4444',
  };
  const ringColor = stateColors[state] || '#FF6B00';

  return (
    <Animated.View style={[s.outer, { transform: [{ translateX: entranceX }, { scale: entranceScale }], opacity: entranceOpacity }]}>
      {/* Glow ring */}
      <Animated.View style={[s.glowRing, { borderColor: ringColor, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />

      {/* KAPTAN AI badge */}
      <View style={[s.badgeTag, { borderColor: ringColor }]}>
        <Text style={s.badgeTagText}>KAPTAN AI</Text>
      </View>

      {/* Avatar body */}
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        {/* Head + Hair */}
        <Animated.View style={[s.head, { borderColor: ringColor, transform: [{ rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) }, { translateY: thinkingGaze }] }]}>
          {/* Hair — behind head */}
          <View style={[s.hairBg, { backgroundColor: '#1A0D03' }]} />
          {/* Hair — sides */}
          <View style={[s.hairLeft, { borderRightColor: '#1A0D03' }]} />
          <View style={[s.hairRight, { borderLeftColor: '#1A0D03' }]} />
          {/* Hair — top wave */}
          <View style={[s.hairTop, { borderBottomColor: '#1A0D03' }]} />
          {/* Hair highlight */}
          <View style={[s.hairHighlight, { backgroundColor: '#3D2010' }]} />

          {/* Face */}
          <View style={s.face}>
            {/* Eyebrows — natural arch */}
            <View style={s.eyebrowsRow}>
              <View style={[s.eyebrow, { backgroundColor: '#3D1C00', transform: [{ rotate: '-5deg' }] }]} />
              <View style={[s.eyebrow, { backgroundColor: '#3D1C00', transform: [{ rotate: '5deg' }] }]} />
            </View>

            {/* Eyes with full detail */}
            <Animated.View style={[s.eyesRow, { transform: [{ scaleY: blinkY }] }]}>
              <View style={s.eyeOuter}>
                <View style={[s.eyeWhite, { backgroundColor: '#FFFFFF' }]}>
                  <View style={[s.iris, { backgroundColor: '#5B3A1A' }]}>
                    <View style={s.pupilDark} />
                    <View style={s.irisHighlight} />
                  </View>
                  <View style={[s.eyeShine, { backgroundColor: '#FFFFFF' }]} />
                </View>
                {/* Eyelashes */}
                <View style={[s.lashes, { borderBottomColor: '#1A0A00' }]} />
              </View>
              <View style={s.eyeOuter}>
                <View style={[s.eyeWhite, { backgroundColor: '#FFFFFF' }]}>
                  <View style={[s.iris, { backgroundColor: '#5B3A1A' }]}>
                    <View style={s.pupilDark} />
                    <View style={s.irisHighlight} />
                  </View>
                  <View style={[s.eyeShine, { backgroundColor: '#FFFFFF' }]} />
                </View>
                <View style={[s.lashes, { borderBottomColor: '#1A0A00' }]} />
              </View>
            </Animated.View>

            {/* Nose */}
            <View style={s.noseOuter}>
              <View style={[s.noseBridge, { backgroundColor: '#E8C0A0' }]} />
              <View style={[s.noseTip, { backgroundColor: '#F0C8B0' }]} />
            </View>

            {/* Mouth with smile */}
            <Animated.View style={[s.mouthArea, { transform: [{ scaleX: mouthW.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }, { scaleY: mouthW.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }] }]}>
              <Animated.View style={[s.mouthShape, { transform: [{ rotate: smileAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '2deg'] }) }] }]}>
                <View style={[s.upperLip, { backgroundColor: '#D4786A' }]} />
                <View style={[s.lowerLip, { backgroundColor: '#E08878' }]} />
              </Animated.View>
            </Animated.View>

            {/* Cheeks — subtle blush */}
            <View style={[s.cheek, { left: 4, backgroundColor: '#F0B8A820' }]} />
            <View style={[s.cheek, { right: 4, backgroundColor: '#F0B8A820' }]} />
          </View>
        </Animated.View>

        {/* Neck with subtle shadow */}
        <View style={s.neck}>
          <View style={[s.neckShadow, { backgroundColor: '#D4A88830' }]} />
        </View>

        {/* Body — professional outfit */}
        <View style={s.body}>
          {/* Collar */}
          <View style={[s.collarOuter, { borderBottomColor: '#FFFFFF' }]} />
          <View style={[s.collarInner, { borderBottomColor: '#E8E0D8' }]} />
          {/* Jacket */}
          <View style={[s.jacket, { backgroundColor: '#0F2645' }]}>
            {/* Lapel */}
            <View style={[s.lapel, { borderRightColor: '#1A3D6D' }]} />
            <View style={[s.lapelR, { borderLeftColor: '#1A3D6D' }]} />
            {/* KAPTAN badge */}
            <View style={[s.badge, { backgroundColor: '#FF6B00' }]}>
              <Text style={s.badgeText}>K</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Message bubble */}
      {message ? (
        <Animated.View style={[s.bubble, { borderColor: ringColor + '60' }]}>
          <View style={[s.bubbleTail, { borderRightColor: '#141824' }]} />
          <Text style={s.bubbleText}>{message}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  outer: { alignItems: 'center', paddingTop: 20 },
  glowRing: { position: 'absolute', top: 40, width: 170, height: 300, borderRadius: 100, borderWidth: 2, borderStyle: 'dashed' },
  badgeTag: { marginBottom: 12, paddingHorizontal: 18, paddingVertical: 5, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#0A0F1A' },
  badgeTagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  // Head
  head: { width: 120, height: 130, borderRadius: 60, backgroundColor: '#F2CBB0', borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  hairBg: { position: 'absolute', top: -8, width: 120, height: 55, borderRadius: 30 },
  hairLeft: { position: 'absolute', left: -4, top: 5, width: 0, height: 0, borderTopWidth: 75, borderRightWidth: 30, borderTopColor: 'transparent', zIndex: 1 },
  hairRight: { position: 'absolute', right: -4, top: 5, width: 0, height: 0, borderTopWidth: 75, borderLeftWidth: 30, borderTopColor: 'transparent', zIndex: 1 },
  hairTop: { position: 'absolute', top: -10, width: 0, height: 0, borderLeftWidth: 62, borderRightWidth: 62, borderBottomWidth: 45, borderLeftColor: 'transparent', borderRightColor: 'transparent', zIndex: 2 },
  hairHighlight: { position: 'absolute', top: 8, left: 15, width: 30, height: 6, borderRadius: 3, transform: [{ rotate: '-10deg' }] },
  // Face
  face: { alignItems: 'center', paddingTop: 30 },
  eyebrowsRow: { flexDirection: 'row', gap: 24, marginBottom: 0 },
  eyebrow: { width: 20, height: 3.5, borderRadius: 2 },
  eyesRow: { flexDirection: 'row', gap: 20, marginBottom: 6 },
  eyeOuter: { alignItems: 'center' },
  eyeWhite: { width: 20, height: 15, borderRadius: 9, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 0.5, borderColor: '#D4A890' },
  iris: { width: 11, height: 11, borderRadius: 5.5, alignItems: 'center', justifyContent: 'center' },
  pupilDark: { width: 5.5, height: 5.5, borderRadius: 2.75, backgroundColor: '#000000' },
  irisHighlight: { position: 'absolute', top: -1, right: -1, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF50' },
  eyeShine: { position: 'absolute', top: 2, right: 3, width: 3.5, height: 3, borderRadius: 1.5 },
  lashes: { marginTop: -1, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 4, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  noseOuter: { alignItems: 'center', marginBottom: 3 },
  noseBridge: { width: 5, height: 12, borderRadius: 2.5 },
  noseTip: { width: 10, height: 6, borderRadius: 5, marginTop: -2 },
  mouthArea: { alignItems: 'center', marginTop: 2 },
  mouthShape: { width: 24, height: 10, alignItems: 'center' },
  upperLip: { width: 22, height: 5.5, borderRadius: 3, marginBottom: -2 },
  lowerLip: { width: 20, height: 6, borderRadius: 4 },
  cheek: { position: 'absolute', bottom: 28, width: 18, height: 12, borderRadius: 9 },
  // Neck
  neck: { width: 34, height: 24, backgroundColor: '#E5BEA0', marginTop: -5, alignItems: 'center' },
  neckShadow: { width: 20, height: 10, borderRadius: 5, marginTop: 4 },
  // Body
  body: { alignItems: 'center', marginTop: -3 },
  collarOuter: { position: 'absolute', top: 2, width: 0, height: 0, borderLeftWidth: 38, borderRightWidth: 38, borderBottomWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent', zIndex: 3 },
  collarInner: { position: 'absolute', top: 5, width: 0, height: 0, borderLeftWidth: 24, borderRightWidth: 24, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', zIndex: 4 },
  jacket: { width: 85, height: 75, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingTop: 16 },
  lapel: { position: 'absolute', top: 12, left: 10, width: 0, height: 0, borderTopWidth: 35, borderRightWidth: 15, borderTopColor: 'transparent' },
  lapelR: { position: 'absolute', top: 12, right: 10, width: 0, height: 0, borderTopWidth: 35, borderLeftWidth: 15, borderTopColor: 'transparent' },
  badge: { position: 'absolute', top: 32, left: 8, width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  // Bubble
  bubble: { marginTop: 18, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, backgroundColor: '#141824', borderWidth: 1, maxWidth: 290, borderTopLeftRadius: 4 },
  bubbleTail: { position: 'absolute', top: -7, left: 12, width: 0, height: 0, borderTopWidth: 7, borderRightWidth: 10, borderTopColor: 'transparent' },
  bubbleText: { color: '#E2E8F0', fontSize: 14, lineHeight: 21, fontWeight: '500' },
});
