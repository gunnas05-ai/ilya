import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import Card from '../../components/shared/Card';

export default function PartReviewsScreen({ route }: any) {
  const { userId, userName } = route.params || {};
  const { colors } = useTheme();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    apiClient.get(`/part-market/reviews/user/${userId}`).then((res) => {
      setReviews(res.data?.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0.0';

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>Değerlendirmeler</Text>
      {userName && <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>{userName}</Text>}

      <Card accentColor={colors.warning} style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text style={[typography.display, { color: colors.warning, fontWeight: '900' }]}>{avgRating}</Text>
          <View>
            <Text style={[typography.h3, { color: colors.text }]}>{'★'.repeat(Math.round(Number(avgRating)))}{'☆'.repeat(5 - Math.round(Number(avgRating)))}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{reviews.length} değerlendirme</Text>
          </View>
        </View>
      </Card>

      {reviews.length === 0 ? (
        <Card accentColor={colors.textTertiary}><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Henüz değerlendirme yok.</Text></Card>
      ) : reviews.map((r: any) => (
        <Card key={r.id} accentColor={r.rating >= 4 ? colors.success : r.rating >= 3 ? colors.warning : colors.danger} style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
            <Text style={[typography.small, { color: colors.textTertiary }]}>{new Date(r.createdAt).toLocaleDateString('tr-TR')}</Text>
          </View>
          {r.comment && <Text style={[typography.caption, { color: colors.text }]}>{r.comment}</Text>}
          <Text style={[typography.small, { color: colors.textTertiary, marginTop: spacing.xs }]}>{r.reviewType === 'buyer_to_seller' ? 'Alıcı → Satıcı' : 'Satıcı → Alıcı'}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { justifyContent: 'center', alignItems: 'center' },
});
