import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { hapticLight } from '../utils/haptic';

interface LoadCardProps {
  load: any;
  onPress: () => void;
  showDistance?: boolean;
  distance?: number | null;
}

export default function LoadCard({ load, onPress, showDistance, distance }: LoadCardProps) {
  const { colors } = useTheme();

  const typeLabels: Record<string, string> = {
    tam_yuk: 'Tam Yük', kismi_yuk: 'Kısmi', evden_eve: 'Evden Eve', sehir_ici: 'Şehir İçi',
  };

  const statusLabels: Record<string, string> = {
    beklemede: 'Bekliyor', yolda: 'Yolda', teslim_edildi: 'Teslim', iptal: 'İptal',
  };

  const statusColors: Record<string, string> = {
    beklemede: colors.warning, yolda: colors.info, teslim_edildi: colors.success, iptal: colors.danger,
  };

  const price = Number(load.totalPrice || load.price || 0);
  const typeLabel = typeLabels[load.loadType] || load.loadType || 'Yük';
  const statusLabel = statusLabels[load.status] || load.status || 'Bekliyor';
  const statusColor = statusColors[load.status] || colors.textTertiary;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => { hapticLight(); onPress(); }}
      activeOpacity={0.8}
    >
      {/* Sol aksan çubuğu — KAPTAN_MASTER §1.2 */}
      <View style={[styles.accent, { backgroundColor: colors.primary }]} />

      <View style={styles.body}>
        {/* Üst satır: Başlık + Fiyat */}
        <View style={styles.topRow}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {load.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 }}>
              <Text style={[styles.typeTag, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>
                {typeLabel}
              </Text>
              <Text style={[styles.statusTag, { color: statusColor, backgroundColor: statusColor + '15' }]}>
                {statusLabel}
              </Text>
              {load.weight && (
                <Text style={[styles.detail, { color: colors.textSecondary }]}>{load.weight}</Text>
              )}
            </View>
          </View>
          <Text style={[styles.price, { color: colors.textAccent || colors.primary }]}>
            {price.toLocaleString('tr-TR')} ₺
          </Text>
        </View>

        {/* Orta satır: Rota + Mesafe */}
        <View style={styles.routeRow}>
          <Text style={[styles.route, { color: colors.text }]}>
            📍 {load.fromCity || load.originCity || '?'}  →  📍 {load.toCity || load.destCity || '?'}
          </Text>
          {showDistance && distance != null && (
            <Text style={[styles.distance, { color: colors.textTertiary || colors.textSecondary }]}>
              {Math.round(distance)} km
            </Text>
          )}
        </View>

        {/* Alt satır: Araç tipi + Tarih */}
        <View style={styles.bottomRow}>
          <Text style={[styles.detail, { color: colors.textTertiary }]}>
            🚛 {load.vehicleType || 'Belirtilmemiş'}
          </Text>
          {load.pickupDate && (
            <Text style={[styles.detail, { color: colors.textTertiary }]}>
              📅 {new Date(load.pickupDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  accent: {
    width: 5,
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  typeTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusTag: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
  },
  route: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  detail: {
    fontSize: 11,
    fontWeight: '500',
  },
});
