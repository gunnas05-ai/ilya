import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { gibService } from '../../services/gibService';
import { hapticLight } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import Card from '../../components/shared/Card';

const STATUS_TABS = [
  { key: '', label: 'Tümü' },
  { key: 'draft', label: 'Taslak' },
  { key: 'pending', label: 'Onay Bekliyor' },
  { key: 'sent', label: 'Gönderildi' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF',
  pending: '#F59E0B',
  sent: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'Onay Bekliyor',
  sent: 'Gönderildi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal Edildi',
};

function InvoiceCard({ invoice, onPress, colors }: any) {
  return (
    <Card
      accentColor={STATUS_COLORS[invoice.status] || colors.primary}
      onPress={() => onPress(invoice.id)}
      style={{ marginBottom: spacing.md }}
    >
      <View style={styles.cardHeader}>
        <Text style={[typography.h3, { color: colors.text, flex: 1 }]} numberOfLines={1}>
          {invoice.invoiceNo}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[invoice.status] + '20' }]}>
          <Text style={[typography.caption, { color: STATUS_COLORS[invoice.status], fontWeight: '600' }]}>
            {STATUS_LABELS[invoice.status] || invoice.status}
          </Text>
        </View>
      </View>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
        {invoice.invoiceTypeLabel || invoice.invoiceType}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          {new Date(invoice.issueDate).toLocaleDateString('tr-TR')}
        </Text>
        <Text style={[typography.h3, { color: colors.text }]}>
          {Number(invoice.grandTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
        </Text>
      </View>
    </Card>
  );
}

export default function InvoiceListScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInvoices = useCallback(async (p = 1, isRefresh = false) => {
    if (p === 1 && !isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await gibService.getAll({
        status: activeTab || undefined,
        page: p,
        limit: 20,
      });
      const data = res.data || res;
      setInvoices(data.invoices || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setInvoices([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
    fetchInvoices(1);
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInvoices(page, true);
    });
    return unsubscribe;
  }, [navigation, page]);

  const handleTabChange = (key: string) => {
    hapticLight();
    setActiveTab(key);
  };

  const handleInvoicePress = (id: string) => {
    hapticLight();
    navigation.navigate('InvoiceDetail', { invoiceId: id });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchInvoices(1, true);
  };

  const handleRetry = () => {
    fetchInvoices(page);
  };

  const handleFabPress = () => {
    hapticLight();
    navigation.navigate('InvoiceCreate');
  };

  const renderContent = () => {
    if (loading && page === 1) {
      return <ListSkeleton />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={handleRetry} />;
    }

    if (invoices.length === 0) {
      return (
        <EmptyState
          title="Henüz belge bulunmuyor"
          description="Yeni bir e-belge oluşturmak için + butonuna tıklayın"
        />
      );
    }

    return (
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <InvoiceCard invoice={item} onPress={handleInvoicePress} colors={colors} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        onEndReached={() => {
          if (page < totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchInvoices(nextPage);
          }
        }}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />


      {/* Status Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => handleTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                typography.label,
                { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleFabPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.fabText, { color: colors.white }]}>+</Text>
      </TouchableOpacity>
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
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { fontSize: 28, fontWeight: '300', lineHeight: 30 },
});
