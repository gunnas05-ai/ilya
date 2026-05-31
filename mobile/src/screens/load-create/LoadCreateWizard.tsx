import { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { useLoadCreateStore } from '../../store/loadCreateStore';
import { useAuthStore } from '../../store/authStore';
import StepIndicator from '../../components/load-create/StepIndicator';
import Step1Common, { Step1Handle } from './Step1Common';
import Step2Dynamic, { Step2Handle } from './Step2Dynamic';
import Step3Pricing, { Step3Handle } from './Step3Pricing';
import SuccessAnimation from '../../components/shared/SuccessAnimation';
import OfflineBar from '../../components/shared/OfflineBar';
import { hapticLight } from '../../utils/haptic';
import { offlineQueue } from '../../services/offlineQueue';
import { useTrackingStore } from '../../store/trackingStore';
import { createTrackingFromLoad } from '../../services/trackingService';

interface LoadCreateWizardProps {
  onClose?: () => void;
}

export default function LoadCreateWizard({ onClose }: LoadCreateWizardProps) {
  const navigation = useNavigation();
  const handleClose = useCallback(() => {
    if (onClose) onClose();
    else navigation.goBack();
  }, [onClose, navigation]);

  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isGuest, logout } = useAuthStore();
  const { formData, isSubmitting, reset, setSubmitting, setSavedId, setStep, loadDraft } = useLoadCreateStore();

  // Mount'ta draft yukle (AI verisi yoksa)
  useEffect(() => {
    if (!formData.fromCity && !formData.toCity && !formData.title) {
      loadDraft();
    }
  }, []);
  const { addTrackedLoad } = useTrackingStore();
  const [localStep, setLocalStep] = useState(1);
  const [savedIdState, setSavedIdState] = useState<string | null>(null);

  const step1Ref = useRef<Step1Handle>(null);
  const step2Ref = useRef<Step2Handle>(null);
  const step3Ref = useRef<Step3Handle>(null);

  if (isGuest) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.xl }}>
        <Text style={{ fontSize: 64, marginBottom: spacing.md }}>✨</Text>
        <Text style={[typography.h2, { color: colors.text, fontWeight: '800', textAlign: 'center' }]}>
          İşlem Yapmak İçin Üye Olunuz
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.xl }]}>
          Misafir kullanıcılar yük ilanı oluşturamaz veya sisteme veri girişi yapamaz. Tüm özellikleri aktif etmek için lütfen giriş yapın veya üye olun!
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#FF6B00',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
            borderRadius: radius.md,
            width: '100%',
            alignItems: 'center',
            shadowColor: '#FF6B00',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 5,
            elevation: 6,
          }}
          onPress={() => {
            logout();
          }}
          activeOpacity={0.8}
        >
          <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>Üye Ol / Giriş Yap 🚀</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: spacing.lg,
            padding: spacing.md,
          }}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Text style={[typography.label, { color: colors.textSecondary, fontWeight: '600' }]}>Kapat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = localStep;

  const handleNextStep = useCallback(() => {
    hapticLight();
    if (currentStep === 1) {
      step1Ref.current?.validateAndNext();
    } else if (currentStep === 2) {
      step2Ref.current?.validateAndNext();
    }
  }, [currentStep]);

  const handlePrevStep = () => {
    hapticLight();
    if (currentStep > 1) {
      setLocalStep((s) => Math.max(s - 1, 1));
    }
  };

  const handleBack = () => {
    hapticLight();
    if (currentStep > 1) {
      handlePrevStep();
    } else {
      Alert.alert('Çıkış', 'Yük ekleme işlemini iptal etmek istediğinize emin misiniz?', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çık', style: 'destructive', onPress: handleClose },
      ]);
    }
  };

  const handleSave = useCallback(async () => {
    hapticLight();
    step3Ref.current?.validateAndSave();
  }, []);

  // Called by Step3Pricing's validateAndSave after validation passes
  const doSave = useCallback(async () => {
    setSubmitting(true);
    try {
      const now = new Date();
      const id = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

      setSavedId(id);
      setSavedIdState(id);

      await offlineQueue.enqueue({ id, ...formData });

      // Create GPS tracking record for this load
      const tracking = createTrackingFromLoad(
        id,
        formData,
        'device_user_1',    // current device user as creator
        null                  // receiver will be set when load is accepted (Module 02)
      );
      await addTrackedLoad(tracking);
    } catch (error) {
      console.error('Yük kaydetme hatası:', error);
      Alert.alert('Hata', 'Yük kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, setSubmitting, setSavedId, addTrackedLoad]);

  const handleEdit = () => {
    setSavedIdState(null);
    setLocalStep(1);
    setStep(1);
  };

  const handleDone = () => {
    reset();
    setSavedIdState(null);
    handleClose();
  };

  if (savedIdState) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SuccessAnimation
          loadId={savedIdState}
          formData={formData}
          onViewList={handleDone}
          onAddPool={handleDone}
          onEdit={handleEdit}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />

      <StepIndicator currentStep={currentStep} />

      <View style={styles.content}>
        {currentStep === 1 && <Step1Common ref={step1Ref} onNext={() => setLocalStep(2)} />}
        {currentStep === 2 && <Step2Dynamic ref={step2Ref} onNext={() => setLocalStep(3)} />}
        {currentStep === 3 && <Step3Pricing ref={step3Ref} onSubmit={doSave} />}
      </View>

      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={handlePrevStep}
            activeOpacity={0.7}
          >
            <Text style={[typography.label, { color: colors.text }]}>Geri</Text>
          </TouchableOpacity>
        )}
        {currentStep < 3 && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1 }]}
            onPress={handleNextStep}
            activeOpacity={0.8}
          >
            <Text style={[typography.label, { color: colors.white }]}>Devam Et</Text>
          </TouchableOpacity>
        )}
        {currentStep === 3 && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Text style={[typography.label, { color: colors.white }]}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: { width: 80 },
  content: { flex: 1 },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
