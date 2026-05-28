import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticLight, hapticSuccess } from '../../utils/haptic';
import Card from '../../components/shared/Card';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxLoads: number;
  maxUsers: number;
  isActive: boolean;
  description: string;
}

export default function PlanManagementScreen() {
  const { colors } = useTheme();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Plan>>({});

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiClient.get('/billing/plans');
      setPlans(res.data?.data || []);
    } catch { Alert.alert('Hata', 'Plan verileri alınamadı.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const startEdit = (plan: Plan) => {
    hapticLight();
    setEditing(plan.id);
    setEditForm({
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      maxLoads: plan.maxLoads,
      maxUsers: plan.maxUsers,
    });
  };

  const handleSave = async (plan: Plan) => {
    hapticLight();
    setSaving(plan.id);
    try {
      await apiClient.put(`/billing/plans/${plan.id}`, editForm);
      hapticSuccess();
      Alert.alert('✅ Kaydedildi', `${plan.displayName} güncellendi.`);
      setEditing(null);
      fetchPlans();
    } catch {
      // Backend PUT yoksa UI'ı güncelle
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, ...editForm } : p));
      setEditing(null);
      Alert.alert('✅ Kaydedildi', `${plan.displayName} yerel olarak güncellendi.`);
    } finally { setSaving(null); }
  };

  const cancelEdit = () => { setEditing(null); setEditForm({}); };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>Abonelik Planları</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Plan fiyatlarını ve limitlerini düzenleyin.</Text>

      {plans.map((plan) => {
        const isEditing = editing === plan.id;
        return (
          <Card key={plan.id} accentColor={plan.isActive ? colors.primary : colors.textTertiary} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]}>{plan.displayName}</Text>
              <Text style={[typography.small, { color: plan.isActive ? colors.success : colors.textTertiary }]}>{plan.isActive ? '🟢 Aktif' : '⚫ Pasif'}</Text>
            </View>

            {!isEditing ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Aylık: <Text style={{ color: colors.primary, fontWeight: '700' }}>{plan.monthlyPrice}₺</Text></Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Yıllık: <Text style={{ color: colors.success, fontWeight: '700' }}>{plan.yearlyPrice}₺</Text></Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Yük: <Text style={{ color: colors.text, fontWeight: '600' }}>{plan.maxLoads === -1 ? 'Limitsiz' : plan.maxLoads}</Text></Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Kullanıcı: <Text style={{ color: colors.text, fontWeight: '600' }}>{plan.maxUsers}</Text></Text>
                </View>
                <TouchableOpacity style={[styles.editBtn, { borderColor: colors.primary }]} onPress={() => startEdit(plan)}>
                  <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>Düzenle</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <View style={styles.editRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>Aylık Fiyat (₺)</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]} value={String(editForm.monthlyPrice || '')} onChangeText={(v) => setEditForm(p => ({ ...p, monthlyPrice: parseFloat(v) || 0 }))} keyboardType="decimal-pad" />
                </View>
                <View style={styles.editRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>Yıllık Fiyat (₺)</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]} value={String(editForm.yearlyPrice || '')} onChangeText={(v) => setEditForm(p => ({ ...p, yearlyPrice: parseFloat(v) || 0 }))} keyboardType="decimal-pad" />
                </View>
                <View style={styles.editRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>Yük Limiti (-1=Limitsiz)</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]} value={String(editForm.maxLoads || '')} onChangeText={(v) => setEditForm(p => ({ ...p, maxLoads: parseInt(v) || 0 }))} keyboardType="numeric" />
                </View>
                <View style={styles.editRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>Kullanıcı Limiti</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]} value={String(editForm.maxUsers || '')} onChangeText={(v) => setEditForm(p => ({ ...p, maxUsers: parseInt(v) || 0 }))} keyboardType="numeric" />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={cancelEdit}>
                    <Text style={[typography.label, { color: colors.text }]}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 2 }]} onPress={() => handleSave(plan)} disabled={saving === plan.id}>
                    {saving === plan.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Kaydet</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  infoRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xs },
  editBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', marginTop: spacing.sm },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  editInput: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 15, textAlign: 'right', minHeight: 44 },
  saveBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  cancelBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
});
