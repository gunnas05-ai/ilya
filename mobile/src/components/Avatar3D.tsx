import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SW } = Dimensions.get('window');
const AVATAR_IMG = require('../../assets/heykaptan.png');

type AvatarState = 'idle' | 'greeting' | 'listening' | 'talking' | 'thinking' | 'success' | 'error';

interface Props { state: AvatarState; height?: number; }

export default function Avatar3D({ state, height = 380 }: Props) {
  const faceSize = Math.min(SW * 0.42, 170);
  const breathe = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const mouthScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.9)).current;
  const leftHand = useRef(new Animated.Value(0)).current;
  const rightHand = useRef(new Animated.Value(0)).current;

  // Breathing
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.015, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0.985, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])); a.start(); return () => a.stop();
  }, []);

  // 3D Y-axis sway
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(rotateY, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(rotateY, { toValue: -1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])); a.start(); return () => a.stop();
  }, []);

  // Blink
  useEffect(() => {
    let active = true;
    const b = () => { if(!active) return;
      Animated.sequence([Animated.timing(blink,{toValue:0.05,duration:50,useNativeDriver:true}),Animated.timing(blink,{toValue:1,duration:100,useNativeDriver:true})]).start();
      setTimeout(b, 2800+Math.random()*4000);
    }; setTimeout(b,1500); return () => {active=false;};
  }, []);

  // State-based animations
  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 2000, useNativeDriver: true }),
      ])).start();
      Animated.parallel([
        Animated.loop(Animated.sequence([Animated.timing(ringOpacity,{toValue:0.5,duration:1500,useNativeDriver:true}),Animated.timing(ringOpacity,{toValue:0.08,duration:1500,useNativeDriver:true})])),
        Animated.loop(Animated.sequence([Animated.timing(ringScale,{toValue:1.3,duration:1500,useNativeDriver:true}),Animated.timing(ringScale,{toValue:0.85,duration:1500,useNativeDriver:true})])),
      ]).start();
    } else { tilt.setValue(0); ringOpacity.setValue(0); }
  }, [state]);

  // Talking: mouth + hand gestures
  useEffect(() => {
    if (state === 'talking' || state === 'greeting') {
      const mouth = Animated.loop(Animated.sequence([
        Animated.timing(mouthScale, { toValue: 1.6, duration: 100, useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 1.4, duration: 80, useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 1, duration: 140, useNativeDriver: true }),
      ])); mouth.start();
      Animated.loop(Animated.sequence([
        Animated.timing(leftHand, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(leftHand, { toValue: -0.5, duration: 600, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(rightHand, { toValue: -0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(rightHand, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])).start();
      return () => { mouth.stop(); leftHand.setValue(0); rightHand.setValue(0); };
    } else { mouthScale.setValue(1); leftHand.setValue(0); rightHand.setValue(0); }
  }, [state]);

  const ringColor = { idle:'#FF6B00',greeting:'#FF6B00',listening:'#3B82F6',talking:'#FF6B00',thinking:'#F59E0B',success:'#10B981',error:'#EF4444' }[state]||'#FF6B00';

  return (
    <View style={[s.outer, { height }]}>
      {/* BG glow */}
      <Animated.View style={[s.bgGlow, { backgroundColor: ringColor + '10', opacity: ringOpacity }]} />

      {/* 3D container with perspective */}
      <Animated.View style={[s.body3D, {
        transform: [
          { perspective: 1000 },
          { rotateY: rotateY.interpolate({ inputRange: [-1,1], outputRange: ['-10deg','10deg'] }) },
          { scale: breathe },
        ],
      }]}>
        {/* Glow ring */}
        <Animated.View style={[s.glowRing, {
          width: faceSize+50, height: faceSize+50, borderRadius: (faceSize+50)/2,
          borderColor: ringColor, opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }]} />

        {/* ── HEAD ── */}
        <Animated.View style={{ transform: [{ rotate: tilt.interpolate({ inputRange: [-1,1], outputRange: ['-2deg','2deg'] }) }] }}>
          <View style={[s.faceFrame, { width: faceSize, height: faceSize, borderRadius: faceSize/2, borderColor: ringColor }]}>
            <Image source={AVATAR_IMG} style={[s.faceImg, { width: faceSize, height: faceSize, borderRadius: faceSize/2 }]} resizeMode="cover" />
            {/* Blink overlay */}
            <Animated.View style={[s.blinkOverlay, { width: faceSize, height: faceSize, borderRadius: faceSize/2, opacity: Animated.subtract(1, blink) }]} />
          </View>
          {/* Hair sides */}
          <View style={[s.hairL, { borderRightColor: '#1A0D03', borderRightWidth: faceSize*0.07 }]} />
          <View style={[s.hairR, { borderLeftColor: '#1A0D03', borderLeftWidth: faceSize*0.07 }]} />
        </Animated.View>

        {/* ── NECK ── */}
        <View style={[s.neck, { width: faceSize*0.22, backgroundColor: '#E8C4A8' }]} />

        {/* ── SHOULDERS ── */}
        <View style={[s.shoulders, { width: faceSize*1.7 }]}>
          <View style={[s.shoulder, { backgroundColor: '#0F2645', borderBottomLeftRadius: faceSize*0.3 }]} />
          <View style={[s.shoulderR, { backgroundColor: '#0F2645', borderBottomRightRadius: faceSize*0.3 }]} />
        </View>

        {/* ── COLLAR ── */}
        <View style={s.collarArea}>
          <View style={[s.collarWhite, { borderBottomColor: '#FFF', borderLeftWidth: faceSize*0.2, borderRightWidth: faceSize*0.2 }]} />
          <View style={[s.collarInner, { borderBottomColor: '#F0EAE0', borderLeftWidth: faceSize*0.13, borderRightWidth: faceSize*0.13 }]} />
        </View>

        {/* ── TORSO ── */}
        <View style={[s.torso, { width: faceSize*1.5, backgroundColor: '#0F2645' }]}>
          {/* Badge */}
          <View style={[s.badge, { backgroundColor: '#FF6B00' }]}>
            <Animated.View style={{ transform: [{ scale: mouthScale }] }}><Image source={require('../../assets/icon.png')} style={{width:12,height:12}} /></Animated.View>
          </View>
        </View>

        {/* ── ARMS ── */}
        <Animated.View style={[s.armL, { transform: [{ rotate: leftHand.interpolate({ inputRange: [-1,1], outputRange: ['-15deg','15deg'] }) }] }]}>
          <View style={[s.arm, { backgroundColor: '#0F2645' }]} />
          <View style={[s.hand, { backgroundColor: '#F2CBB0' }]} />
        </Animated.View>
        <Animated.View style={[s.armR, { transform: [{ rotate: rightHand.interpolate({ inputRange: [-1,1], outputRange: ['15deg','-15deg'] }) }] }]}>
          <View style={[s.arm, { backgroundColor: '#0F2645' }]} />
          <View style={[s.hand, { backgroundColor: '#F2CBB0' }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bgGlow: { position: 'absolute', top: '10%', width: '80%', height: '60%', borderRadius: 100 },
  body3D: { alignItems: 'center' },
  glowRing: { position: 'absolute', top: -20, borderWidth: 2, borderStyle: 'dashed' },
  // Face
  faceFrame: { borderWidth: 3, overflow: 'hidden', shadowColor: '#FF6B00', shadowOffset: {width:0,height:0}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  faceImg: { position: 'absolute' },
  blinkOverlay: { position: 'absolute', backgroundColor: '#0A0D14' },
  hairL: { position: 'absolute', left: -3, top: '10%', width: 0, height: 0, borderTopWidth: 35, borderTopColor: 'transparent' },
  hairR: { position: 'absolute', right: -3, top: '10%', width: 0, height: 0, borderTopWidth: 35, borderTopColor: 'transparent' },
  // Neck
  neck: { height: 28, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  // Shoulders
  shoulders: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -5 },
  shoulder: { flex: 1, height: 55, marginRight: 1 },
  shoulderR: { flex: 1, height: 55, marginLeft: 1 },
  // Collar
  collarArea: { alignItems: 'center', marginTop: -2, zIndex: 5 },
  collarWhite: { width: 0, height: 0, borderBottomWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  collarInner: { width: 0, height: 0, borderBottomWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -8 },
  // Torso
  torso: { height: 65, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  badge: { position: 'absolute', top: 8, left: 10, width: 20, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  // Arms
  armL: { position: 'absolute', left: -30, top: '45%' },
  armR: { position: 'absolute', right: -30, top: '45%' },
  arm: { width: 14, height: 80, borderRadius: 7 },
  hand: { width: 16, height: 16, borderRadius: 8, marginTop: -4, alignSelf: 'center' },
});
