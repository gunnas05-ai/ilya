import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { spacing, radius, typography } from '../theme';
import { apiClient } from '../services/api';
import { handleError } from '../services/errorService';
import ErrorState from '../components/shared/ErrorState';
import { hapticLight, hapticMedium } from '../utils/haptic';
import Card from '../components/shared/Card';

interface WalletData {
  availableBalance: number;
  escrowBalance: number;
  pendingRelease: number;
  cashbackBalance: number;
  iban?: string;
  bankName?: string;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

const TX_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  credit: { label: 'Yükleme', icon: '📥', color: '#10B981' },
  debit: { label: 'Çekim', icon: '📤', color: '#EF4444' },
  escrow_lock: { label: 'Escrow Bloke', icon: '🔒', color: '#F59E0B' },
  escrow_release: { label: 'Escrow Serbest', icon: '🔓', color: '#10B981' },
  withdrawal: { label: 'Banka Transferi', icon: '🏦', color: '#3B82F6' },
  commission: { label: 'Komisyon', icon: '💸', color: '#8B5CF6' },
  refund: { label: 'İade', icon: '↩️', color: '#EC4899' },
  cashback: { label: 'Cashback', icon: '🎁', color: '#10B981' },
  fuel_advance: { label: 'Yakıt Avansı', icon: '⛽', color: '#F59E0B' },
};

export default function WalletScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      setError(null);
      const [walletRes, txRes] = await Promise.all([
        apiClient.get('/escrow/wallet'),
        apiClient.get('/escrow/wallet/transactions?limit=20'),
      ]);
      setWallet(walletRes.data?.data || walletRes.data);
      setTransactions(txRes.data?.data || txRes.data || []);
    } catch (e) {
      handleError(e, { screen: 'Wallet', action: 'fetchWallet' });
      setError('Cüzdan bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const handleWithdraw = () => {
    if (!wallet?.iban) {
      Alert.alert('IBAN Gerekli', 'Para çekmek için önce IBAN eklemelisiniz.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'IBAN Ekle', onPress: () => navigation.navigate('CarrierProfile') },
      ]);
      return;
    }

    Alert.alert('Para Çekme', `Mevcut bakiye: ${wallet.availableBalance.toLocaleString('tr-TR')} TL\n\nNe kadar çekmek istersiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Tümünü Çek',
        onPress: async () => {
          setWithdrawing(true);
          try {
            await apiClient.post('/escrow/withdraw/iban', {
              amount: wallet.availableBalance,
              iban: wallet.iban,
            });
            hapticMedium();
            Alert.alert('Başarılı', 'Para çekme talebiniz alındı. 1-3 iş günü içinde hesabınıza aktarılacaktır.');
            fetchWallet();
          } catch (err: any) {
            Alert.alert('Hata', err.response?.data?.message || 'İşlem gerçekleştirilemedi.');
          } finally {
            setWithdrawing(false);
          }
        },
      },
    ]);
  };

  const getTxStyle = (type: string) => {
    return TX_TYPE_LABELS[type] || { label: type, icon: '💳', color: colors.textTertiary };
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState message={error} onRetry={fetchWallet} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWallet(); }} />}
    >
      {/* ── Bakiye Kartı ── */}
      <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Toplam Bakiye</Text>
        <Text style={[typography.display, { color: colors.primary, fontWeight: '900', marginTop: spacing.xs }]}>
          {wallet ? (wallet.availableBalance + wallet.pendingRelease).toLocaleString('tr-TR') : '0'} ₺
        </Text>
        <View style={styles.balanceGrid}>
          <View style={styles.balanceItem}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>Kullanılabilir</Text>
            <Text style={[typography.h3, { color: colors.success, fontWeight: '700' }]}>
              {wallet?.availableBalance?.toLocaleString('tr-TR') || '0'} ₺
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>Escrow'da</Text>
            <Text style={[typography.h3, { color: colors.warning, fontWeight: '700' }]}>
              {wallet?.escrowBalance?.toLocaleString('tr-TR') || '0'} ₺
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>Cashback</Text>
            <Text style={[typography.h3, { color: colors.info, fontWeight: '700' }]}>
              {wallet?.cashbackBalance?.toLocaleString('tr-TR') || '0'} ₺
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Hızlı İşlemler ── */}
      <View style={[styles.quickActions, { borderColor: colors.border }]}>
        {[
          { label: 'Para Çek', onPress: handleWithdraw, disabled: withdrawing },
          { label: 'Finans Durumu', onPress: () => navigation.navigate('Finance') },
          { label: 'IBAN / Banka Bilgilerim', onPress: () => navigation.navigate('CarrierProfile') },
          { label: 'Kayıtlı Kartlarım', onPress: () => navigation.navigate('SavedCards') },
          { label: 'Kontör Satın Al', onPress: () => navigation.navigate('CreditShop') },
          { label: 'İşlem Geçmişi', onPress: () => navigation.navigate('BillingHistory') },
          { label: 'Yakıt Avansı', onPress: () => Alert.alert('Yakında', 'Yakıt avansı özelliği yakında kullanımda olacak.') },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.quickBtnVertical, { backgroundColor: colors.primary + '08', borderColor: colors.border }]}
            onPress={item.onPress}
            disabled={(item as any).disabled}
            activeOpacity={0.7}
          >
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{item.label}</Text>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── QuickPay Bilgisi ── */}
      <Card accentColor={colors.success} style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 24 }}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.success, fontWeight: '700' }]}>QuickPay Aktif</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Teslimat onayından 5 dakika sonra ödemeniz hesabınıza geçer.
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Kontör Bakiyesi ── */}
      <Card accentColor={colors.warning} style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ fontSize: 24 }}>🧾</Text>
            <View>
              <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>E-Belge Kontör</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Fatura ve irsaliye için</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
            <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>Kontör Al →</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── İşlem Geçmişi ── */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
        📋 İşlem Geçmişi
      </Text>

      {transactions.length === 0 ? (
        <Card accentColor={colors.textTertiary}>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
            Henüz işlem bulunmamaktadır.
          </Text>
        </Card>
      ) : (
        transactions.slice(0, 20).map((tx) => {
          const style = getTxStyle(tx.type);
          return (
            <Card key={tx.id} accentColor={style.color} style={{ marginBottom: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ fontSize: 20 }}>{style.icon}</Text>
                  <View>
                    <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
                      {style.label}
                    </Text>
                    <Text style={[typography.small, { color: colors.textTertiary }]}>
                      {tx.description || new Date(tx.createdAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                </View>
                <Text style={[typography.caption, {
                  color: tx.amount > 0 && (tx.type === 'credit' || tx.type === 'escrow_release' || tx.type === 'cashback')
                    ? colors.success : colors.text,
                  fontWeight: '700',
                }]}>
                  {tx.amount > 0 && (tx.type === 'credit' || tx.type === 'escrow_release' || tx.type === 'cashback') ? '+' : ''}
                  {tx.amount?.toLocaleString('tr-TR')} ₺
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  balanceGrid: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  balanceItem: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(45,212,191,0.05)',
  },
  quickActions: {
    flexDirection: 'column',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 6,
  },
  quickBtnVertical: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 50,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 60,
    justifyContent: 'center',
  },
  quickIcon: { fontSize: 24 },
});
