import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticLight, hapticSuccess } from '../../utils/haptic';
import Card from '../../components/shared/Card';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonusCredits: number;
  isActive: boolean;
}

export default function CreditPackageScreen() {
  const { colors } = useTheme();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreditPackage>>({});

  const fetchPackages = useCallback(async () => {
    try {
      const res = await apiClient.get('/billing/credits/packages');
      setPackages(res.data?.data || []);
    } catch { Alert.alert('Hata', 'Kontör verileri alınamadı.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const startEdit = (pkg: CreditPackage) => {
    hapticLight();
    setEditing(pkg.id);
    setEditForm({ credits: pkg.credits, price: pkg.price, bonusCredits: pkg.bonusCredits });
  };

  const handleSave = async (pkg: CreditPackage) => {
    hapticLight();
    setSaving(pkg.id);
    try {
      await apiClient.put(`/billing/credits/packages/${pkg.id}`, editForm);
      hapticSuccess();
      Alert.alert('✅ Kaydedildi', `${pkg.name} güncellendi.`);
      setEditing(null);
      fetchPackages();
    } catch {
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, ...editForm } : p));
      setEditing(null);
      Alert.alert('✅ Kaydedildi', `${pkg.name} yerel olarak güncellendi.`);
    } finally { setSaving(null); }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>Kontör Paketleri</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Paket fiyatlarını ve kontör miktarlarını düzenleyin.</Text>

      {packages.map((pkg) => {
        const isEditing = editing === pkg.id;
        const total = pkg.credits + (pkg.bonusCredits || 0);
        return (
          <Card key={pkg.id} accentColor={pkg.isActive ? colors.warning : colors.textTertiary} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]}>{pkg.name}</Text>
              <Text style={[typography.small, { color: pkg.isActive ? colors.success : colors.textTertiary }]}>{pkg.isActive ? '🟢 Aktif' : '⚫ Pasif'}</Text>
            </View>

            {!isEditing ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Kontör: <Text style={{ color: colors.warning, fontWeight: '700' }}>{total}</Text> ({pkg.credits} + {pkg.bonusCredits} hediye)</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Fiyat: <Text style={{ color: colors.primary, fontWeight: '700' }}>{pkg.price}₺</Text></Text>
                </View>
                <TouchableOpacity style={[styles.editBtn, { borderColor: colors.warning }]} onPress={() => startEdit(pkg)}>
                  <Text style={[typography.label, { color: colors.warning, fontWeight: '700' }]}>Düzenle</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <View style={styles.editRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>Kontör</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.warning, color: colors.text }]} value={String(editForm.credits || '')} onChangeText={(v) => setEditForm(p => ({ ...p, credits: parseInt(v) || 0 }))} keyboardType="numeric" />
                </View>
                <View style={styles.editRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>Hediye Kontör</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.warning, color: colors.text }]} value={String(editForm.bonusCredits || '')} onChangeText={(v) => setEditForm(p => ({ ...p, bonusCredits: parseInt(v) || 0 }))} keyboardType="numeric" />
                </View>
                <View style={styles.editRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>Fiyat (₺)</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.warning, color: colors.text }]} value={String(editForm.price || '')} onChangeText={(v) => setEditForm(p => ({ ...p, price: parseFloat(v) || 0 }))} keyboardType="decimal-pad" />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setEditing(null)}>
                    <Text style={[typography.label, { color: colors.text }]}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.warning, flex: 2 }]} onPress={() => handleSave(pkg)} disabled={saving === pkg.id}>
                    {saving === pkg.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Kaydet</Text>}
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
