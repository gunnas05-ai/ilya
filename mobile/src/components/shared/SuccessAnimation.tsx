import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { LoadFormData } from '../../types/load';
import { CITIES } from '../../constants/cities';

interface SuccessAnimationProps {
  loadId: string;
  formData: Partial<LoadFormData>;
  onViewList: () => void;
  onAddPool: () => void;
  onEdit: () => void;
}

function getCityName(id?: string): string {
  if (!id) return '';
  const city = CITIES.find(c => c.id === id);
  return city?.name ?? id;
}

function getDistrictName(cityId: string | undefined, districtId: string | undefined): string {
  if (!cityId || !districtId) return '';
  const city = CITIES.find(c => c.id === cityId);
  const district = city?.districts.find(d => d.id === districtId);
  return district?.name ?? districtId;
}

export default function SuccessAnimation({ loadId, formData, onViewList, onAddPool, onEdit }: SuccessAnimationProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const cardSlide = useRef(new Animated.Value(80)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const loadTypeLabel = {
    tam_yuk: 'Tam Yük',
    kismi_yuk: 'Kısmi Yük',
    evden_eve: 'Evden Eve',
    sehir_ici: 'Şehir İçi',
  }[formData.loadType as string] || '';

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.timing(checkOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [scale, opacity, checkOpacity, slideUp, cardOpacity, cardSlide]);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Animated.View style={[styles.circle, { backgroundColor: colors.success, transform: [{ scale }], opacity }]}>
        <Animated.Text style={[styles.checkmark, { opacity: checkOpacity }]}>✓</Animated.Text>
      </Animated.View>

      <Animated.Text
        style={[typography.h2, { color: colors.text, marginTop: spacing.lg, transform: [{ translateY: slideUp }] }]}
      >
        Yük Başarıyla Oluşturuldu!
      </Animated.Text>

      <Animated.Text
        style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs, transform: [{ translateY: slideUp }] }]}
      >
        ID: {loadId}
      </Animated.Text>

      {/* Yük Önizleme Kartı */}
      <Animated.View
        style={[
          styles.previewCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: cardOpacity,
            transform: [{ translateY: cardSlide }],
          },
        ]}
      >
        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
          Yük Önizleme
        </Text>

        <View style={styles.previewRow}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Başlık</Text>
          <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>{formData.title}</Text>
        </View>

        <View style={styles.previewRow}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Tür</Text>
          <Text style={[typography.body, { color: colors.text }]}>{loadTypeLabel}</Text>
        </View>

        <View style={styles.previewRow}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Nereden</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            {getCityName(formData.fromCity)} / {getDistrictName(formData.fromCity, formData.fromDistrict)}
          </Text>
        </View>

        <View style={styles.previewRow}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Nereye</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            {getCityName(formData.toCity)} / {getDistrictName(formData.toCity, formData.toDistrict)}
          </Text>
        </View>

        <View style={styles.previewRow}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Tarih</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            {formData.pickupDate
              ? new Date(formData.pickupDate).toLocaleDateString('tr-TR')
              : '-'}
            {' → '}
            {formData.deliveryDate
              ? new Date(formData.deliveryDate).toLocaleDateString('tr-TR')
              : '-'}
          </Text>
        </View>

        <View style={styles.previewRow}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>İrtibat</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            {formData.contactName} | {formData.contactPhone}
          </Text>
        </View>

        <View style={[styles.previewDivider, { borderBottomColor: colors.border }]} />

        {/* Araç Detayı (varsa) */}
        {(formData.vehicleType || formData.homeVehicleType || formData.cityVehicleType) && (
          <View style={styles.previewRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Araç</Text>
            <Text style={[typography.body, { color: colors.text }]}>
              {formData.vehicleType || formData.homeVehicleType || formData.cityVehicleType}
            </Text>
          </View>
        )}

        {formData.trailerType && (
          <View style={styles.previewRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Dorse</Text>
            <Text style={[typography.body, { color: colors.text }]}>{formData.trailerType}</Text>
          </View>
        )}
      </Animated.View>

      {/* Düzenle Butonu */}
      <TouchableOpacity
        style={[styles.editBtn, { borderColor: colors.primary }]}
        onPress={onEdit}
        activeOpacity={0.8}
      >
        <Text style={[typography.label, { color: colors.primary }]}>Düzenle</Text>
      </TouchableOpacity>

      {/* Ana Butonlar */}
      <Animated.View
        style={[styles.buttonGroup, { opacity: cardOpacity }]}
      >
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={onViewList}
          activeOpacity={0.8}
        >
          <Text style={[typography.label, { color: colors.white }]}>Yükü Listele</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.primary }]}
          onPress={onAddPool}
          activeOpacity={0.8}
        >
          <Text style={[typography.label, { color: colors.primary }]}>Havuza Ekle</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'] + 40,
    paddingBottom: spacing['2xl'],
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewCard: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xl,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  previewDivider: {
    borderBottomWidth: 1,
    marginVertical: spacing.sm,
  },
  editBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing.md,
  },
  buttonGroup: {
    width: '100%',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
