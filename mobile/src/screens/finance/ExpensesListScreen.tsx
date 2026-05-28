import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { financeService } from '../../services/financeService';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme';

import Card from '../../components/shared/Card';

const formatCurrency = (val: number) => `₺${Number(val).toFixed(2)}`;
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR');

export default function ExpensesListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await financeService.getExpenses();
      setExpenses(data || []);
    } catch (e) {
      console.log('Error fetching expenses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

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


      {loading && expenses.length === 0 ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map(i => (
            <SkeletonLoader key={i} width="100%" height={80} borderRadius={spacing.radius.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id}
          refreshing={loading}
          onRefresh={fetchExpenses}
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
