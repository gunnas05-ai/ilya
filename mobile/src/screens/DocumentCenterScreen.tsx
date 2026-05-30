import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import Card from '../components/shared/Card';
import EmptyState from '../components/shared/EmptyState';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface DocCategory {
  icon: string;
  title: string;
  desc: string;
  count: number;
  screen?: keyof RootStackParamList;
}

export default function DocumentCenterScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [categories] = useState<DocCategory[]>([
    { icon: '🧾', title: 'E-Fatura', desc: 'GİB onaylı e-faturalar', count: 0, screen: 'InvoiceList' },
    { icon: '📋', title: 'E-İrsaliye', desc: 'Dijital sevk irsaliyeleri', count: 0, screen: 'InvoiceList' },
    { icon: '📸', title: 'Teslimat Kanıtı', desc: 'ePOD fotoğraf ve imza', count: 0 },
    { icon: '🚛', title: 'CMR Belgeleri', desc: 'Uluslararası taşıma belgeleri', count: 0 },
    { icon: '📄', title: 'Sözleşmeler', desc: 'Taşıma ve hizmet sözleşmeleri', count: 0 },
    { icon: '🛡️', title: 'Sigorta Poliçeleri', desc: 'Yük ve araç sigortaları', count: 0 },
  ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>📁 Döküman Merkezi</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Tüm lojistik evraklarınız tek yerde</Text>

      {categories.length === 0 ? (
        <EmptyState emoji="📁" message="Henüz döküman bulunmuyor." description="Taşıma işlemleriniz ilerledikçe dökümanlarınız burada toplanacak." />
      ) : (
        categories.map((cat, i) => (
          <TouchableOpacity
            key={i}
            style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => cat.screen && navigation.navigate(cat.screen)}
            activeOpacity={cat.screen ? 0.7 : 1}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginRight: spacing.md }}>{cat.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{cat.title}</Text>
                <Text style={[typography.small, { color: colors.textSecondary }]}>{cat.desc}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.h3, { color: cat.count > 0 ? colors.primary : colors.textTertiary, fontWeight: '800' }]}>{cat.count}</Text>
                {cat.screen && <Text style={[typography.small, { color: colors.primary }]}>→</Text>}
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      <Card accentColor={colors.warning} style={{ marginTop: spacing.lg }}>
        <Text style={[typography.label, { color: colors.warning, fontWeight: '700', marginBottom: spacing.xs }]}>💡 Bilgi</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>
          E-fatura ve e-irsaliye belgeleriniz GİB (Gelir İdaresi Başkanlığı) onaylıdır. Teslimat kanıtları (ePOD) blokzincir ile zaman damgalı olarak saklanır.
        </Text>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm },
});
