import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { financeService } from '../../services/financeService';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { useTheme } from '../../hooks/useTheme';
import { handleError } from '../../services/errorService';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme';

import Card from '../../components/shared/Card';

const formatCurrency = (val: number) => `₺${Number(val).toFixed(2)}`;
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR');

export default function ExpensesListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = async () => {
    if (!refreshing) setLoading(true);
    try {
      setError(null);
      const data = await financeService.getExpenses();
      setExpenses(data || []);
    } catch (e) {
      handleError(e, { screen: 'ExpensesList', action: 'fetchExpenses' });
      setError('Giderler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const renderItem = ({ item }: any) => (
    <Card accentColor={colors.danger}>
      <View style={styles.itemHeader}>
        <Text style={[styles.category, { color: colors.text }]}>{item.category?.nameTr || 'Gider'}</Text>
        <Text style={[styles.amount, { color: colors.danger }]}>-{formatCurrency(item.amount)}</Text>
      </View>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>{item.description || 'Açıklama yok'}</Text>
      <Text style={[styles.date, { color: colors.textTertiary }]}>{formatDate(item.date)}</Text>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? (
        <ErrorState message={error} onRetry={fetchExpenses} />
      ) : loading && expenses.length === 0 ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map(i => (
            <SkeletonLoader key={i} width="100%" height={80} borderRadius={spacing.radius.lg} />
          ))}
        </View>
      ) : expenses.length === 0 ? (
        <EmptyState emoji="📋" message="Henüz gider kaydı bulunmamaktadır." />
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xl + spacing.sm : spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  list: { padding: spacing.lg, gap: spacing.md },
  item: { padding: spacing.lg, borderRadius: spacing.radius.lg, borderWidth: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  category: { fontWeight: '600', fontSize: 16 },
  amount: { fontWeight: 'bold', fontSize: 16 },
  desc: { fontSize: 14, marginBottom: 4 },
  date: { fontSize: 12 }
});
