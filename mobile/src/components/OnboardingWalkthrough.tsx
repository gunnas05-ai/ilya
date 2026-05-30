import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';

const ONBOARDING_KEY = '@onboarding_complete';
const { width: SCREEN_W } = Dimensions.get('window');

interface Step {
  icon: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { icon: '🚛', title: 'Yükünü Bul, Kazan', description: 'Binlerce yük arasından sana en uygun olanları yapay zeka ile bul. Boş dönme, kazanmaya başla.' },
  { icon: '⛽', title: 'Yol Üstü Hizmetler', description: 'En ucuz akaryakıt, TIR parkı olan lezzet durakları, yol üstü ihtiyaçların için rehberin.' },
  { icon: '🛡️', title: 'Güvenli Ödeme', description: 'Escrow sistemi ile ödemen güvende. Teslimatta ödemen otomatik serbest kalır.' },
  { icon: '📊', title: 'Her Şey Elinin Altında', description: 'E-fatura, gelir-gider takibi, araç al-sat, ikinci el pazarı — hepsi tek uygulamada.' },
];

export default function OnboardingWalkthrough({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const goNext = async () => {
    if (step < STEPS.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setStep(s => s + 1);
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onComplete();
    }
  };

  const s = STEPS[step];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.emoji}>{s.icon}</Text>
        <Text style={[typography.h1, { color: colors.text, fontWeight: '900', textAlign: 'center', marginTop: spacing.xl }]}>{s.title}</Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.xl, lineHeight: 24 }]}>{s.description}</Text>
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === step ? colors.primary : colors.border, width: i === step ? 24 : 8 }]} />
          ))}
        </View>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>{step < STEPS.length - 1 ? 'Devam' : 'Başla! 🚀'}</Text>
        </TouchableOpacity>
        {step < STEPS.length - 1 && (
          <TouchableOpacity onPress={goNext}>
            <Text style={[typography.body, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.md }]}>Atla</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val === 'true';
  } catch { return false; }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  emoji: { fontSize: 96 },
  bottom: { paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'], paddingTop: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.xl },
  dot: { height: 8, borderRadius: 4 },
  btn: { paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});
