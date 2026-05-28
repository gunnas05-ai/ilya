import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { vehicleService } from '../../services/vehicleService';
import { hapticLight, hapticMedium } from '../../utils/haptic';
import Card from '../../components/shared/Card';
import ListSkeleton from '../../components/shared/ListSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import OfflineBar from '../../components/shared/OfflineBar';

const FUEL_LABELS: Record<string, string> = { benzin: 'Benzin', dizel: 'Dizel', lpg: 'LPG', elektrik: 'Elektrik', hibrit: 'Hibrit' };
const TRANS_LABELS: Record<string, string> = { manuel: 'Manuel', otomatik: 'Otomatik', yari_otomatik: 'Yarı Otomatik' };

export default function MyVehiclesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try { const data = await vehicleService.getMyVehicles(); setVehicles(Array.isArray(data) ? data : []); } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { fetch(); }, []));

  const handleSaleAction = async (vehicle: any) => {
    hapticMedium();
    // Check if vehicle already has an active listing — if so, go to manage
    if (vehicle.status === 'active' || vehicle.hasActiveListing) {
      navigation.navigate('ListingsBrowse');
      return;
    }
    try {
      const criteria = await vehicleService.checkSaleCriteria(vehicle.id);
      if (!criteria.passed) {
        Alert.alert('Eksik Bilgiler', 'Aracinizi satisa cikarmak icin lutfen asagidaki bilgileri tamamlayin:\n\n' + criteria.missing.join('\n'), [
          { text: 'Iptal', style: 'cancel' },
          { text: 'Duzenle', onPress: () => navigation.navigate('VehicleForm', { vehicle: JSON.stringify(vehicle), editMode: true, missingFields: criteria.missing }) },
        ]);
        return;
      }
      navigation.navigate('VehicleSale', { vehicle: JSON.stringify(vehicle) });
    } catch { navigation.navigate('VehicleSale', { vehicle: JSON.stringify(vehicle) }); }
  };

  const handleDelete = (vehicle: any) => {
    hapticLight();
    Alert.alert('Aracı Sil', `${vehicle.brand} ${vehicle.model} aracını silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await vehicleService.delete(vehicle.id); fetch(); } },
    ]);
  };

  if (loading) return <View style={{ flex:1, backgroundColor:colors.background }}><OfflineBar /><ListSkeleton /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={colors.primary} />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800' }]}>Araçlarım</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('VehicleForm', { editMode: false })}>
            <Text style={[typography.label, { color: colors.white, fontWeight: '700' }]}>+ Araç Ekle</Text>
          </TouchableOpacity>
        </View>

        {vehicles.length === 0 ? (
          <EmptyState emoji="🚗" title="Henüz aracınız yok" description="Araç ekleyerek satışa çıkarabilirsiniz." />
        ) : (
          vehicles.map((v: any) => (
            <Card key={v.id} accentColor={v.status === 'sold' ? colors.success : v.status === 'active' ? colors.primary : colors.warning} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row' }}>
                {v.photos?.[0]?.url && <Image source={{ uri: v.photos[0].url }} style={styles.thumb} />}
                <View style={{ flex: 1, marginLeft: v.photos?.[0]?.url ? spacing.sm : 0 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{v.brand} {v.model} ({v.year})</Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>{v.mileage?.toLocaleString('tr-TR')} km • {FUEL_LABELS[v.fuelType] || v.fuelType} • {TRANS_LABELS[v.transmission] || v.transmission}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}><Text style={[typography.caption, { color: colors.primary }]}>{(v.photos || []).length} 📸</Text></View>
                    <View style={[styles.badge, { backgroundColor: colors.info + '15' }]}><Text style={[typography.caption, { color: colors.info }]}>{v.status === 'sold' ? 'Satıldı' : v.status === 'active' ? 'Satışta' : 'Taslak'}</Text></View>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.primary }]} onPress={() => navigation.navigate('VehicleForm', { vehicle: JSON.stringify(v), editMode: true })}>
                  <Text style={[typography.caption, { color: colors.primary }]}>Düzenle</Text>
                </TouchableOpacity>
                {v.status !== 'sold' && (
                  <TouchableOpacity style={[styles.smallBtn, { backgroundColor: v.status === 'active' ? colors.info : colors.success, borderColor: v.status === 'active' ? colors.info : colors.success }]} onPress={() => handleSaleAction(v)}>
                    <Text style={[typography.caption, { color: colors.white, fontWeight: '700' }]}>{v.status === 'active' ? 'Satisi Yonet' : 'Aracini Sat'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.danger }]} onPress={() => handleDelete(v)}>
                  <Text style={[typography.caption, { color: colors.danger }]}>Sil</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  thumb: { width: 80, height: 60, borderRadius: radius.sm, backgroundColor: '#ddd' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  smallBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
});
