import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { financeService } from '../../services/financeService';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { KPIWidget } from '../../components/shared';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { handleError } from '../../services/errorService';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme';
import { tr } from '../../i18n/tr';

const formatCurrency = (val: number) => `₺${Number(val).toFixed(2)}`;

export default function FinanceDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    if (!refreshing) setLoading(true);
    try {
      setError(null);
      const summary = await financeService.getDashboardSummary();
      setData(summary);
    } catch (e) {
      handleError(e, { screen: 'FinanceDashboard', action: 'fetchDashboard' });
      setError('Finansal veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {error ? (
          <ErrorState message={error} onRetry={fetchDashboard} />
        ) : loading && !data ? (
          <View style={styles.cards}>
            <SkeletonLoader width="100%" height={120} borderRadius={spacing.radius.xl} />
            <View style={styles.rowCards}>
               <SkeletonLoader width="47%" height={100} borderRadius={spacing.radius.xl} />
               <SkeletonLoader width="47%" height={100} borderRadius={spacing.radius.xl} />
            </View>
          </View>
        ) : data ? (
          <View style={styles.cards}>
            <KPIWidget
              title={tr.finance.netProfit}
              value={formatCurrency(data.netProfit || 0)}
              accentColor={data.netProfit >= 0 ? colors.success : colors.danger}
              trend={{
                value: data.netProfit >= 0 ? '%12 artış' : '%5 düşüş',
                type: data.netProfit >= 0 ? 'up' : 'down'
              }}
              subtitle="Son 30 günlük finansal özet"
            />
            
            <View style={styles.rowCards}>
              <KPIWidget
                title={tr.finance.totalIncome}
                value={formatCurrency(data.totalIncome || 0)}
                accentColor={colors.success}
                subtitle="Toplam Gelir"
                style={{ flex: 1 }}
              />
              <KPIWidget
                title={tr.finance.totalExpense}
                value={formatCurrency(data.totalExpense || 0)}
                accentColor={colors.danger}
                subtitle="Toplam Gider"
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('ExpensesList')}
              />
            </View>

            {/* Quick Actions Container */}
            <View style={styles.actionsContainer}>
              <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, fontWeight: '700' }]}>
                Hızlı İşlemler
              </Text>
              
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AddExpense')}
                activeOpacity={0.85}
              >
                <Text style={[typography.body, { color: colors.white, fontWeight: '700' }]}>
                  ➕ Gider / Fiş Ekle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { borderColor: colors.primary, borderWidth: 1.5 }]}
                onPress={() => navigation.navigate('ExpensesList')}
                activeOpacity={0.85}
              >
                <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>
                  📋 Tüm Giderleri Listele
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <EmptyState emoji="💰" message="Finansal veri bulunamadı." />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  cards: { gap: spacing.lg },
  rowCards: { flexDirection: 'row', gap: spacing.lg },
  actionsContainer: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  primaryActionBtn: {
    paddingVertical: spacing.md,
    borderRadius: spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryActionBtn: {
    paddingVertical: spacing.md,
    borderRadius: spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
});
