import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

type AvatarState = 'idle' | 'greeting' | 'listening' | 'talking' | 'thinking' | 'success' | 'error';

interface Props {
  state: AvatarState;
  message?: string;
}

export default function KaptanAvatar({ state, message }: Props) {
  const walkX = useRef(new Animated.Value(300)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const nodAnim = useRef(new Animated.Value(0)).current;
  const pulseRing = useRef(new Animated.Value(0)).current;

  // Entry animation: walk in from right
  useEffect(() => {
    Animated.parallel([
      Animated.spring(walkX, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Blink animation (every 3-5 seconds)
  useEffect(() => {
    const blink = () => {
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.1, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();
      setTimeout(blink, 3000 + Math.random() * 4000);
    };
    const timer = setTimeout(blink, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Breathing animation
  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.03, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0.97, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, []);

  // Nod when listening
  useEffect(() => {
    if (state === 'listening') {
      const nod = Animated.loop(
        Animated.sequence([
          Animated.timing(nodAnim, { toValue: 3, duration: 1200, useNativeDriver: true }),
          Animated.timing(nodAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      );
      nod.start();
      return () => nod.stop();
    } else {
      nodAnim.setValue(0);
    }
  }, [state]);

  // Pulse ring when listening
  useEffect(() => {
    if (state === 'listening') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseRing, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseRing, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [state]);

  const getStateColor = () => {
    switch (state) {
      case 'listening': return '#3B82F6';
      case 'talking': return '#FF6B00';
      case 'thinking': return '#F59E0B';
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      default: return '#FF6B00';
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: walkX }, { scale }], opacity }]}>
      {/* Pulse ring */}
      {state === 'listening' && (
        <Animated.View style={[styles.pulseRing, { opacity: pulseRing.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }), transform: [{ scale: pulseRing.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }] }]} />
      )}

      {/* Avatar body */}
      <Animated.View style={[styles.avatarBody, { transform: [{ scale: breatheAnim }, { translateY: nodAnim }] }]}>
        {/* Head */}
        <View style={[styles.head, { borderColor: getStateColor() }]}>
          {/* Hair */}
          <View style={styles.hair}>
            <View style={[styles.hairTop, { borderBottomColor: '#2D1B0E' }]} />
          </View>
          {/* Eyes */}
          <View style={styles.eyes}>
            <Animated.View style={[styles.eye, { transform: [{ scaleY: blinkAnim }] }]}>
              <View style={[styles.pupil, { backgroundColor: '#1A0A00' }]} />
            </Animated.View>
            <Animated.View style={[styles.eye, { transform: [{ scaleY: blinkAnim }] }]}>
              <View style={[styles.pupil, { backgroundColor: '#1A0A00' }]} />
            </Animated.View>
          </View>
          {/* Mouth */}
          <Animated.View style={[styles.mouth, {
            transform: [{ scaleY: state === 'talking' ? (Math.random() * 0.5 + 0.5) : 1 }],
            height: state === 'talking' ? 8 : 3,
          }]} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={[styles.torso, { backgroundColor: '#1E3A5F' }]}>
            <View style={[styles.collar, { borderBottomColor: '#FFFFFF' }]} />
          </View>
        </View>
      </Animated.View>

      {/* Message bubble */}
      {message && (
        <Animated.View style={[styles.bubble, { borderColor: getStateColor() }]}>
          <Text style={styles.bubbleText} numberOfLines={3}>{message}</Text>
        </Animated.View>
      )}

      {/* State indicator */}
      <View style={[styles.stateDot, { backgroundColor: getStateColor() }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 20 },
  pulseRing: { position: 'absolute', top: 30, width: 120, height: 120, borderRadius: 60, backgroundColor: '#FF6B0030', borderWidth: 2, borderColor: '#FF6B0060' },
  avatarBody: { alignItems: 'center' },
  head: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5D0B0', borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hair: { position: 'absolute', top: -5, width: 86, alignItems: 'center' },
  hairTop: { width: 0, height: 0, borderLeftWidth: 43, borderRightWidth: 43, borderBottomWidth: 30, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  eyes: { flexDirection: 'row', gap: 16, marginTop: 6 },
  eye: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pupil: { width: 5, height: 5, borderRadius: 2.5 },
  mouth: { width: 14, borderRadius: 3, backgroundColor: '#C4957A', marginTop: 6 },
  body: { marginTop: -5 },
  torso: { width: 60, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  collar: { width: 0, height: 0, borderLeftWidth: 15, borderRightWidth: 15, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', position: 'absolute', top: 5 },
  bubble: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, maxWidth: 300, borderTopLeftRadius: 4 },
  bubbleText: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  stateDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
});
