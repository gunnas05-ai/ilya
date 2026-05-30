import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { financeService } from '../../services/financeService';
import * as ImagePicker from 'expo-image-picker';
import { PremiumButton } from '../../components/PremiumButton';
import BottomSheet from '../../components/shared/BottomSheet';
import { showToast } from '../../utils/toast';
import { financeValidation } from '../../validations/financeValidation';
import { Input } from '../../components/shared';
import OcrResultCard from '../../components/shared/OcrResultCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme';
import { tr } from '../../i18n/tr';

export default function AddExpenseScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [errors, setErrors] = useState<{ amount?: string }>({});

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return showToast(tr.finance.cameraPermission, 'error');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      processOcr(result.assets[0].uri);
    }
  };

  const processOcr = async (uri: string) => {
    setLoading(true);
    setOcrResult(null);
    try {
      const response = await financeService.uploadOcrReceipt(uri, 'image/jpeg');
      setOcrResult(response);
      if (response.parsedData?.amount) {
        setAmount(response.parsedData.amount.toString());
        setErrors({});
        showToast(tr.finance.ocrSuccess, 'success');
      } else {
        showToast('Fiş okundu ancak tutar tespit edilemedi. Lütfen manuel giriniz.', 'info');
      }
    } catch (e) {
      showToast(tr.finance.ocrError, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (errors.amount) {
      setErrors({ ...errors, amount: undefined });
    }
  };

  const handleSubmit = async () => {
    const validation = financeValidation.validateExpense(amount);
    if (!validation.valid) {
      setErrors({ amount: validation.error || tr.finance.amountRequired });
      return showToast(validation.error || tr.finance.amountRequired, 'warning');
    }
    
    setLoading(true);
    try {
      await financeService.addExpense({
        amount: parseFloat(amount),
        description,
        date: new Date().toISOString()
      });
      showToast(tr.finance.successSave, 'success');
      setSheetVisible(false);
      setTimeout(() => navigation.goBack(), 300);
    } catch (e) {
      showToast(tr.finance.errorSave, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>


      <View style={styles.content}>
        <PremiumButton 
          title="Yeni Harcama Ekle" 
          onPress={() => setSheetVisible(true)} 
          style={{ marginTop: spacing.xl }}
        />
      </View>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
            {tr.finance.bottomSheetTitle}
          </Text>

          <PremiumButton 
            title={tr.finance.ocrButton}
            onPress={handlePickImage} 
            loading={loading}
            style={styles.ocrButton}
          />
          
          {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

          {/* EX-017: OCR confidence score + extracted fields */}
          {ocrResult && (
            <OcrResultCard
              documentType={ocrResult.documentType || 'receipt'}
              confidenceScore={ocrResult.confidenceScore}
              status={ocrResult.status}
              parsedData={ocrResult.parsedData}
            />
          )}

          <View style={styles.form}>
            <Input
              label="Harcama Tutarı (₺)"
              placeholder={tr.finance.amountPlaceholder}
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              error={errors.amount}
              success={amount.length > 0 && !errors.amount}
            />
            <Input
              label="Açıklama"
              placeholder={tr.finance.expenseDescPlaceholder}
              value={description}
              onChangeText={setDescription}
            />
            <PremiumButton 
              title={tr.finance.saveExpense}
              onPress={handleSubmit} 
              loading={loading}
              type="success"
              style={styles.submitButton}
            />
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
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
    paddingTop: Platform.OS === 'ios' ? spacing.xl + spacing.sm : spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  content: { padding: spacing.xl },
  ocrButton: { marginBottom: spacing.xl },
  preview: { width: '100%', height: 200, borderRadius: spacing.radius.lg, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  submitButton: { marginTop: spacing.sm }
});
