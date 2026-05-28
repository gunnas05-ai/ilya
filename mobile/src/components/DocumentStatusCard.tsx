import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { apiClient } from '../services/api';

const DOC_ICONS: Record<string, string> = { cmr: '📋', invoice: '🧾', insurance: '🛡️', weight_ticket: '⚖️', delivery_note: '📦', customs: '🌍', adr: '⚠️', other: '📎' };
const DOC_LABELS: Record<string, string> = { cmr: 'CMR Belgesi', invoice: 'Fatura', insurance: 'Sigorta', weight_ticket: 'Tartı Fişi', delivery_note: 'İrsaliye', customs: 'Gümrük', adr: 'ADR', other: 'Diğer' };
const REQUIRED = ['cmr', 'invoice', 'delivery_note'];

interface Props { shipmentId: string; }

export default function DocumentStatusCard({ shipmentId }: Props) {
  const { colors } = useTheme();
  const [docs, setDocs] = useState<any[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get(`/documents/shipment/${shipmentId}`).catch(() => ({ data: { data: [] } })),
      apiClient.get(`/documents/missing/${shipmentId}`).catch(() => ({ data: { data: [] } })),
    ]).then(([d, m]) => {
      setDocs(d.data?.data || d.data || []);
      setMissing(m.data?.data || m.data || []);
      setLoading(false);
    });
  }, [shipmentId]);

  if (loading) return <View style={{ padding: spacing.md }}><ActivityIndicator size="small" color={colors.primary} /></View>;

  const allOk = missing.length === 0;

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: allOk ? colors.success + '40' : colors.warning + '40', marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>📋 Evrak Durumu</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: allOk ? colors.success : colors.warning }}>
          {allOk ? '✅ Tam' : `⚠️ ${missing.length} eksik`}
        </Text>
      </View>

      {docs.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: missing.length > 0 ? 8 : 0 }}>
          {docs.filter((d: any) => d.status !== 'rejected').map((d: any) => (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 }}>
              <Text style={{ fontSize: 12 }}>{DOC_ICONS[d.type] || '📎'}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>{DOC_LABELS[d.type] || d.type}</Text>
              {d.status === 'verified' && <Text style={{ fontSize: 10, color: colors.success }}>✓</Text>}
            </View>
          ))}
        </View>
      )}

      {missing.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {missing.map((t: string) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger + '10', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.danger }}>❌ {DOC_LABELS[t] || t} gerekli</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
