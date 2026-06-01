import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const AVATAR_IMG = require('../../assets/heykaptan.png');

type AvatarState = 'idle' | 'greeting' | 'listening' | 'talking' | 'thinking' | 'success' | 'error';

interface Props { state: AvatarState; }

/**
 * FaceTime-style avatar:
 * - Face walks in from right side
 * - Shows upper 1/4 body (head + shoulders)
 * - Fills screen like a video call
 * - Subtle breathing and blink for realism
 */
export default function Avatar3D({ state }: Props) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const blinkOverlay = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;
  const ringColor6 = { idle:'#FF6B00',greeting:'#FF6B00',listening:'#3B82F6',talking:'#FF6B00',thinking:'#F59E0B',success:'#10B981',error:'#EF4444' }[state]||'#FF6B00';

  // Walk-in from right — FaceTime answer feel
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, { toValue: 0, tension: 30, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Breathing
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.01, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0.99, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])); a.start(); return () => a.stop();
  }, []);

  // Natural blink
  useEffect(() => {
    let active = true;
    const b = () => { if(!active) return;
      Animated.sequence([
        Animated.timing(blinkOverlay,{toValue:1,duration:60,useNativeDriver:true}),
        Animated.timing(blinkOverlay,{toValue:0,duration:100,useNativeDriver:true}),
      ]).start();
      setTimeout(b, 2500+Math.random()*4000);
    }; setTimeout(b,1500); return () => {active=false;};
  }, []);

  // Ring pulse when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0.94, duration: 1000, useNativeDriver: true }),
      ])).start();
    } else { ringPulse.setValue(1); }
  }, [state]);

  // Face size — large, video-call proportions
  const faceW = SW * 0.75;
  const faceH = faceW * 1.2; // Portrait aspect

  return (
    <Animated.View style={[s.outer, { transform: [{ translateX: slideX }], opacity }]}>
      {/* ── FaceTime Frame ── */}
      <Animated.View style={[s.frame, { borderColor: ringColor6, transform: [{ scale: ringPulse }] }]}>
        {/* Main portrait — upper body visible, face centered */}
        <View style={[s.portraitClip, { width: faceW, height: faceH }]}>
          <Image
            source={AVATAR_IMG}
            style={[s.portraitImg, { width: faceW, height: faceH * 1.6, top: -faceH * 0.1 }]}
            resizeMode="cover"
          />
          {/* Blink overlay — closes over eyes */}
          <Animated.View style={[s.blinkBar, { opacity: blinkOverlay, width: faceW, top: faceH * 0.28 }]} />
        </View>

        {/* ── Video-call style overlays ── */}
        {/* Top gradient — cinematic vignette */}
        <View style={[s.vignetteTop, { width: faceW }]} />
        <View style={[s.vignetteBottom, { width: faceW }]} />

        {/* State ring — subtle animated border glow */}
        {state === 'listening' && (
          <View style={[s.listeningRing, { borderColor: '#3B82F6', width: faceW + 8, height: faceH + 8 }]} />
        )}

        {/* Name tag — FaceTime style */}
        <View style={s.nameTag}>
          <Animated.View style={[s.nameDot, { backgroundColor: ringColor6 }]} />
        </View>

        {/* State label */}
        <View style={s.stateBadge}>
          <Animated.View style={[s.stateDot, { backgroundColor: ringColor6 }]} />
        </View>
      </Animated.View>

      {/* Bottom bar — FaceTime controls feel */}
      <View style={s.controlBar}>
        <View style={[s.controlDot, { backgroundColor: state === 'listening' ? '#3B82F6' : '#FFFFFF30' }]} />
        <View style={[s.controlDot, { backgroundColor: state === 'talking' ? '#FF6B00' : '#FFFFFF30' }]} />
        <View style={[s.controlDot, { backgroundColor: state === 'thinking' ? '#F59E0B' : '#FFFFFF30' }]} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    borderWidth: 1.5, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width:0,height:8}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15,
  },
  portraitClip: { overflow: 'hidden', borderRadius: 22 },
  portraitImg: { position: 'absolute' },
  blinkBar: { position: 'absolute', height: 6, backgroundColor: '#0A0D14', borderRadius: 3 },
  vignetteTop: { position: 'absolute', top: 0, height: 60, opacity: 0.4 },
  vignetteBottom: { position: 'absolute', bottom: 0, height: 40, opacity: 0.6 },
  listeningRing: { position: 'absolute', top: -4, left: -4, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed' },
  nameTag: { position: 'absolute', top: 14, left: 14 },
  nameDot: { width: 10, height: 10, borderRadius: 5 },
  stateBadge: { position: 'absolute', bottom: 14, right: 14 },
  stateDot: { width: 8, height: 8, borderRadius: 4 },
  controlBar: { flexDirection: 'row', gap: 16, marginTop: 20, justifyContent: 'center' },
  controlDot: { width: 10, height: 10, borderRadius: 5 },
});
