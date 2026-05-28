import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { restaurantService } from '../services/restaurantService';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptic';
import OfflineBar from '../components/shared/OfflineBar';
import ListSkeleton from '../components/shared/ListSkeleton';
import ErrorState from '../components/shared/ErrorState';
import EmptyState from '../components/shared/EmptyState';
import Card from '../components/shared/Card';

const STATUS_CONFIG: Record<string, { label: string; colorKey: string; nextLabel: string; nextStatus: string }> = {
  pending:    { label: 'Bekliyor',    colorKey: 'warning', nextLabel: 'Onayla',       nextStatus: 'confirmed' },
  confirmed:  { label: 'Onaylandı',   colorKey: 'info',    nextLabel: 'Hazırla',       nextStatus: 'preparing' },
  preparing:  { label: 'Hazırlanıyor',colorKey: 'primary', nextLabel: 'Hazır',         nextStatus: 'ready' },
  ready:      { label: 'Hazır',       colorKey: 'success', nextLabel: 'Tamamla',       nextStatus: 'completed' },
  completed:  { label: 'Tamamlandı',  colorKey: 'success', nextLabel: '',              nextStatus: '' },
  cancelled:  { label: 'İptal',       colorKey: 'danger',  nextLabel: '',              nextStatus: '' },
};

export default function KitchenScreen() {
  const { colors, isDark } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setError(null);
    try {
      const data = await restaurantService.getMyKitchenReservations();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  const getETA = (reservedAt: string) => {
    const eta = new Date(reservedAt).getTime();
    const now = Date.now();
    const diffMin = Math.max(0, Math.round((eta - now) / 60000));
    if (diffMin <= 0) return 'Şimdi';
    if (diffMin < 60) return `${diffMin} dk`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours}s ${mins}dk`;
  };

  const getETAColor = (reservedAt: string) => {
    const diffMin = Math.round((new Date(reservedAt).getTime() - Date.now()) / 60000);
    if (diffMin <= 5) return colors.danger;
    if (diffMin <= 15) return colors.warning;
    return colors.success;
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string, orderLabel: string) => {
    hapticMedium();
    try {
      await restaurantService.updateReservationStatus(orderId, newStatus);
      hapticSuccess();
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch {
      Alert.alert('Hata', 'Durum güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  // Filter to only show active orders (not completed/cancelled by default)
  const activeOrders = orders.filter((o: any) =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
  );

  // Group by status
  const grouped = activeOrders.reduce((acc: Record<string, any[]>, o: any) => {
    (acc[o.status] = acc[o.status] || []).push(o);
    return acc;
  }, {});

  // Sort groups: preparing first (most urgent), then confirmed, pending, ready
  const groupOrder = ['preparing', 'confirmed', 'pending', 'ready'];
  const sortedGroups = groupOrder.filter(g => grouped[g]?.length).map(g => ({ status: g, orders: grouped[g], ...STATUS_CONFIG[g] }));

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }}><OfflineBar /><ListSkeleton /></View>;
  }

  if (error) {
    return <View style={{ flex: 1, backgroundColor: colors.background }}><OfflineBar /><ErrorState message={error} onRetry={fetchOrders} /></View>;
  }

  const getStatusColor = (key: string) => {
    const map: Record<string, string> = {
      primary: colors.primary,
      info: colors.info,
      warning: colors.warning,
      success: colors.success,
      danger: colors.danger,
    };
    return map[key] || colors.textTertiary;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800' }]}>Mutfak Ekranı</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {activeOrders.length} aktif sipariş
          </Text>
        </View>

        {sortedGroups.length === 0 ? (
          <EmptyState emoji="🍳" title="Bekleyen sipariş yok" description="Şu an için hazırlanması gereken bir sipariş bulunmuyor." />
        ) : (
          sortedGroups.map(group => (
            <View key={group.status} style={{ marginBottom: spacing.lg }}>
              {/* Group header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <View style={[styles.groupDot, { backgroundColor: getStatusColor(group.colorKey) }]} />
                <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginLeft: spacing.sm }]}>
                  {group.label}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: getStatusColor(group.colorKey) + '20' }]}>
                  <Text style={[typography.caption, { color: getStatusColor(group.colorKey), fontWeight: '700' }]}>{group.orders.length}</Text>
                </View>
              </View>

              {/* Order cards */}
              {group.orders.map((order: any) => {
                const isOpen = expanded === order.id;
                const items = order.items || [];
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

                return (
                  <Card key={order.id} accentColor={getStatusColor(cfg.colorKey)} style={{ marginBottom: spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => { hapticLight(); setExpanded(isOpen ? null : order.id); }}
                      activeOpacity={0.7}
                    >
                      {/* Order header */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                            {items.length > 0 ? `${items.length} kalem sipariş` : 'Sipariş'}
                          </Text>
                          <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}>
                            #{order.id?.slice(0, 8)}
                          </Text>
                        </View>
                        {/* ETA */}
                        <View style={[styles.etaBadge, { backgroundColor: getETAColor(order.reservedAt) + '15' }]}>
                          <Text style={[typography.caption, { color: getETAColor(order.reservedAt), fontWeight: '700' }]}>
                            {getETA(order.reservedAt)}
                          </Text>
                        </View>
                        <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: spacing.sm }]}>
                          {isOpen ? '▲' : '▼'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Expanded detail */}
                    {isOpen && (
                      <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                        {/* Items list */}
                        {items.length > 0 && (
                          <View style={{ marginBottom: spacing.md }}>
                            <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>Sipariş Kalemleri</Text>
                            {items.map((item: any, idx: number) => (
                              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                                <Text style={[typography.small, { color: colors.text }]}>
                                  {item.name} × {item.quantity}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Notes */}
                        {order.notes && (
                          <View style={[styles.noteBox, { backgroundColor: colors.surface }]}>
                            <Text style={[typography.small, { color: colors.textTertiary }]}>Not:</Text>
                            <Text style={[typography.small, { color: colors.text }]}>{order.notes}</Text>
                          </View>
                        )}

                        {/* Action button */}
                        {cfg.nextStatus ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: getStatusColor(cfg.colorKey) }]}
                            onPress={() => {
                              Alert.alert(
                                cfg.nextLabel,
                                `Sipariş durumunu "${cfg.nextLabel}" olarak güncellemek istediğinize emin misiniz?`,
                                [
                                  { text: 'İptal', style: 'cancel' },
                                  { text: cfg.nextLabel, onPress: () => handleStatusUpdate(order.id, cfg.nextStatus, cfg.nextLabel) },
                                ]
                              );
                            }}
                          >
                            <Text style={[typography.label, { color: colors.white, fontWeight: '700' }]}>{cfg.nextLabel}</Text>
                          </TouchableOpacity>
                        ) : null}

                        {/* Secondary actions for non-terminal states */}
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: colors.danger }]}
                            onPress={() => {
                              Alert.alert('İptal Et', 'Bu siparişi iptal etmek istediğinize emin misiniz?', [
                                { text: 'Vazgeç', style: 'cancel' },
                                { text: 'İptal Et', style: 'destructive', onPress: () => handleStatusUpdate(order.id, 'cancelled', 'İptal') },
                              ]);
                            }}
                          >
                            <Text style={[typography.caption, { color: colors.danger }]}>İptal Et</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          ))
        )}

        {/* Footer */}
        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <Text style={[typography.small, { color: colors.textTertiary }]}>
            KAPTAN Mutfak Yönetimi v1.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  countBadge: { marginLeft: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  etaBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  noteBox: { padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.md },
  actionBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.sm },
  cancelBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
});
