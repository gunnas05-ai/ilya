import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import Card from './Card';

interface OcrResultCardProps {
  documentType: string;
  confidenceScore: number | null;
  status: string;
  parsedData: Record<string, any> | null;
}

const DOC_LABELS: Record<string, string> = {
  receipt: 'Fiş / Fatura',
  rate_confirmation: 'Taşıma Sözleşmesi',
  driver_license: 'Ehliyet',
  src_document: 'SRC Belgesi',
};

const RECEIPT_FIELDS: [string, string][] = [
  ['amount', 'Tutar'], ['date', 'Tarih'], ['taxNo', 'Vergi No'], ['vendorName', 'İşletme'],
];

const RATE_CONFIRM_FIELDS: [string, string][] = [
  ['price', 'Navlun Bedeli'], ['fromCity', 'Çıkış'], ['toCity', 'Varış'],
  ['shipperName', 'Yükleyen'], ['carrierName', 'Taşıyan'], ['loadNo', 'Yük No'],
];

const LICENSE_FIELDS: [string, string][] = [
  ['tcKimlikNo', 'T.C. Kimlik No'], ['licenseNo', 'Belge No'],
  ['firstName', 'Ad'], ['lastName', 'Soyad'],
  ['birthDate', 'Doğum Tarihi'], ['expiryDate', 'Son Geçerlilik'], ['bloodType', 'Kan Grubu'],
];

const SRC_FIELDS: [string, string][] = [
  ['srcNo', 'SRC Belge No'], ['holderName', 'Ad Soyad'],
  ['expiryDate', 'Son Geçerlilik'], ['category', 'Yetki Kategorisi'],
];

function getFields(type: string): [string, string][] {
  const map: Record<string, [string, string][]> = {
    receipt: RECEIPT_FIELDS,
    rate_confirmation: RATE_CONFIRM_FIELDS,
    driver_license: LICENSE_FIELDS,
    src_document: SRC_FIELDS,
  };
  return map[type] || [];
}

function getScoreColor(score: number, isDark: boolean, colors: any) {
  if (score >= 80) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

function formatFieldValue(key: string, value: any): string {
  if (value === null || value === undefined) return '—';
  if (key === 'amount' || key === 'price') {
    const n = parseFloat(value);
    return isNaN(n) ? String(value) : `${n.toLocaleString('tr-TR')} ₺`;
  }
  return String(value);
}

export default function OcrResultCard({ documentType, confidenceScore, status, parsedData }: OcrResultCardProps) {
  const { colors, isDark } = useTheme();
  const isProcessed = status === 'processed';
  const isFailed = status === 'failed';
  const docLabel = DOC_LABELS[documentType] || documentType;

  const scoreColor = confidenceScore != null ? getScoreColor(confidenceScore, isDark, colors) : colors.textTertiary;

  const fields = isProcessed ? getFields(documentType) : [];

  return (
    <Card accentColor={isFailed ? colors.danger : isProcessed ? colors.success : colors.warning} style={{ marginBottom: spacing.md }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{docLabel}</Text>
        <View style={[styles.statusBadge, { backgroundColor: isFailed ? colors.danger + '15' : isProcessed ? colors.success + '15' : colors.warning + '15' }]}>
          <Text style={[typography.caption, { color: isFailed ? colors.danger : isProcessed ? colors.success : colors.warning, fontWeight: '600' }]}>
            {isFailed ? 'Başarısız' : isProcessed ? 'Okundu' : 'İşleniyor...'}
          </Text>
        </View>
      </View>

      {/* Confidence score bar */}
      {confidenceScore != null && isProcessed && (
        <View style={{ marginBottom: fields.length > 0 ? spacing.md : 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Doğruluk Skoru</Text>
            <Text style={[typography.caption, { color: scoreColor, fontWeight: '700' }]}>%{Math.round(confidenceScore)}</Text>
          </View>
          <View style={[styles.scoreTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.scoreFill, { width: `${Math.min(100, Math.max(0, confidenceScore))}%`, backgroundColor: scoreColor }]} />
          </View>
        </View>
      )}

      {/* Extracted fields */}
      {fields.length > 0 && (
        <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {fields.map(([key, label]) => {
            const value = parsedData?.[key];
            return (
              <View key={key} style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
                <Text style={[typography.small, { color: colors.textTertiary }]}>{label}</Text>
                <Text style={[typography.small, { color: value != null ? colors.text : colors.textTertiary, fontWeight: value != null ? '600' : '400' }]}>
                  {formatFieldValue(key, value)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  scoreTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  scoreFill: { height: 8, borderRadius: 4 },
  fieldBox: { borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth },
});
