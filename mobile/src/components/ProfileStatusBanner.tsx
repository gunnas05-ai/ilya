import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { apiClient } from '../services/api';
import { useNavigation } from '@react-navigation/native';

interface ProfileStatus {
  status: string;           // INCOMPLETE, PENDING_REVIEW, VERIFIED, SUSPENDED
  missingFields: string[];
  verificationNotes: string | null;
  completionPercent: number;
  canAccessLoads: boolean;
}

interface Props {
  status: ProfileStatus | null;
  onDismiss?: () => void;
  compact?: boolean;        // Ana sayfada buyuk, yuk sayfasinda tam ekran
}

export function ProfileStatusBanner({ status, onDismiss, compact = true }: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [dismissed, setDismissed] = useState(false);

  if (!status || status.status === 'VERIFIED' || dismissed) return null;

  const isIncomplete = status.status === 'INCOMPLETE';
  const isPending = status.status === 'PENDING_REVIEW';

  return (
    <View style={[
      styles.banner,
      {
        backgroundColor: isPending ? colors.info + '10' : colors.warning + '10',
        borderColor: isPending ? colors.info + '30' : colors.warning + '30',
      },
    ]}>
      <View style={styles.bannerContent}>
        <Text style={[typography.caption, { color: isPending ? colors.info : colors.warning, fontWeight: '700', flex: 1 }]}>
          {isPending
            ? '⏳ Profiliniz inceleniyor. Onaylandiginda bildirim alacaksiniz.'
            : `⚠️ Profiliniz %${status.completionPercent} tamamlandi. Yuk almak icin profilinizi tamamlayin.`}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
          {isIncomplete && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.warning }]}
              onPress={() => navigation.navigate('CarrierProfile')}
            >
              <Text style={[typography.small, { color: '#FFF', fontWeight: '700' }]}>Tamamla</Text>
            </TouchableOpacity>
          )}
          {compact && (
            <TouchableOpacity onPress={() => { setDismissed(true); onDismiss?.(); }}>
              <Text style={[typography.body, { color: colors.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Eksik alanlar */}
      {isIncomplete && status.missingFields.length > 0 && (
        <View style={{ marginTop: spacing.sm }}>
          {status.missingFields.slice(0, 5).map((f, i) => (
            <Text key={i} style={[typography.small, { color: colors.danger }]}>❌ {f}</Text>
          ))}
          {status.missingFields.length > 5 && (
            <Text style={[typography.small, { color: colors.textTertiary }]}>+{status.missingFields.length - 5} eksik daha</Text>
          )}
        </View>
      )}

      {/* Red notu */}
      {status.verificationNotes && (
        <Text style={[typography.small, { color: colors.danger, marginTop: spacing.xs, fontStyle: 'italic' }]}>
          📝 {status.verificationNotes}
        </Text>
      )}
    </View>
  );
}

/** Yük sayfası için tam ekran yönlendirme kartı */
export function ProfileRequiredScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<ProfileStatus | null>(null);

  useEffect(() => {
    apiClient.get('/users/profile/status').then(r => setStatus(r.data?.data || r.data)).catch(() => {});
  }, []);

  if (!status) return null;
  if (status.canAccessLoads) return null;

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      <View style={styles.fullContent}>
        <Text style={{ fontSize: 64, marginBottom: spacing.lg }}>🔒</Text>
        <Text style={[typography.h2, { color: colors.text, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm }]}>
          Profiliniz henüz tamamlanmadı
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }]}>
          Yük alabilmek için lütfen aşağıdaki bilgileri tamamlayın.
        </Text>

        {/* Eksik alan listesi */}
        <View style={[styles.missingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {status.missingFields.map((f, i) => (
            <View key={i} style={[styles.missingRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.danger }]}>❌</Text>
              <Text style={[typography.caption, { color: colors.text, marginLeft: spacing.sm }]}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.completeBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CarrierProfile')}
        >
          <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>Profili Tamamla</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
  },
  fullContent: {
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
  },
  missingBox: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  completeBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
