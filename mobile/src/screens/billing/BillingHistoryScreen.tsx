import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import Card from '../../components/shared/Card';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description?: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  subscription: { label: 'Abonelik', icon: '📦', color: '#10B981' },
  credits: { label: 'Kontör', icon: '🧾', color: '#F59E0B' },
  escrow_deposit: { label: 'Escrow Yatırma', icon: '🔒', color: '#3B82F6' },
  escrow_release: { label: 'Escrow Serbest', icon: '🔓', color: '#10B981' },
  commission: { label: 'Komisyon', icon: '💸', color: '#8B5CF6' },
  refund: { label: 'İade', icon: '↩️', color: '#EC4899' },
  early_payment: { label: 'Erken Ödeme', icon: '⚡', color: '#F59E0B' },
  insurance: { label: 'Sigorta', icon: '🛡️', color: '#3B82F6' },
  fuel_card: { label: 'Yakıt Kartı', icon: '⛽', color: '#F59E0B' },
};

export default function BillingHistoryScreen() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditTxs, setCreditTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'payments' | 'credits'>('payments');

  const fetchData = useCallback(async () => {
    try {
      const [payRes, creditRes] = await Promise.all([
        apiClient.get('/payment/transactions'),
        apiClient.get('/billing/credits/transactions'),
      ]);
      const payData = payRes.data?.data;
      setTransactions(payData?.transactions || payData || []);
      setCreditTxs(creditRes.data?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTypeStyle = (type: string) => TYPE_LABELS[type] || { label: type, icon: '💳', color: colors.textTertiary };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
    >
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
        Ödeme Geçmişi
      </Text>

      {/* Tab switcher */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { key: 'payments' as const, label: '💳 Ödemeler' },
          { key: 'credits' as const, label: '🧾 Kontör' },
        ].map((t) => (
          <Text
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, {
              color: tab === t.key ? '#FFF' : colors.textTertiary,
              backgroundColor: tab === t.key ? colors.primary : 'transparent',
            }]}
          >{t.label}</Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : tab === 'payments' ? (
        transactions.length === 0 ? (
          <Card accentColor={colors.textTertiary} style={{ marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Henüz ödeme işlemi bulunmuyor.</Text>
          </Card>
        ) : (
          transactions.map((tx: any, i: number) => {
            const style = getTypeStyle(tx.type);
            return (
              <Card key={tx.id || i} accentColor={style.color} style={{ marginBottom: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={{ fontSize: 20 }}>{style.icon}</Text>
                    <View>
                      <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{style.label}</Text>
                      <Text style={[typography.small, { color: colors.textTertiary }]}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('tr-TR') : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[typography.caption, {
                      color: tx.status === 'success' ? colors.success : tx.status === 'failed' ? colors.danger : colors.warning,
                      fontWeight: '700',
                    }]}>
                      {(tx.amount / 100).toFixed(2)} ₺
                    </Text>
                    <Text style={[typography.small, { color: colors.textTertiary }]}>{tx.status}</Text>
                  </View>
                </View>
              </Card>
            );
          })
        )
      ) : (
        creditTxs.length === 0 ? (
          <Card accentColor={colors.textTertiary} style={{ marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Henüz kontör işlemi bulunmuyor.</Text>
          </Card>
        ) : (
          creditTxs.map((tx: any, i: number) => (
            <Card key={tx.id || i} accentColor={tx.amount > 0 ? colors.success : colors.warning} style={{ marginBottom: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
                    {tx.type === 'purchase' ? '📥 Satın Alma' : tx.type === 'usage' ? '📤 Kullanım' : tx.type === 'bonus' ? '🎁 Hediye' : tx.type === 'refund' ? '↩️ İade' : tx.type}
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('tr-TR') : ''} • Bakiye: {tx.balanceAfter}
                  </Text>
                </View>
                <Text style={[typography.caption, {
                  color: tx.amount > 0 ? colors.success : colors.danger,
                  fontWeight: '700',
                }]}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} kontör
                </Text>
              </View>
            </Card>
          ))
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: 4, marginBottom: spacing.md },
  tab: { flex: 1, textAlign: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm, fontSize: 13, fontWeight: '600', overflow: 'hidden' },
});
