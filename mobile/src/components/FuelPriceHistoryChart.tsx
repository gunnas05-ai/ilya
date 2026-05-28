import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { fuelStationService } from '../services/fuelStationService';

interface Props {
  stationId: string;
  fuelType: string;
  days?: number;
}

export default function FuelPriceHistoryChart({ stationId, fuelType, days = 14 }: Props) {
  const { colors } = useTheme();
  const [history, setHistory] = useState<any[]>([]);
  const [trend, setTrend] = useState<number>(0);
  const [trendPct, setTrendPct] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(days);

  useEffect(() => {
    setLoading(true);
    fuelStationService.getPriceHistory(stationId, fuelType, rangeDays)
      .then((res: any) => {
        const data = res.data?.history || res.history || [];
        setHistory(data);
        setTrend(res.data?.trend || res.trend || 0);
        setTrendPct(res.data?.trendPercent || res.trendPercent || 0);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [stationId, fuelType, rangeDays]);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} />;
  }

  if (history.length === 0) {
    return <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center', padding: spacing.md }]}>Henüz fiyat geçmişi bulunmuyor</Text>;
  }

  const prices = history.map((h: any) => Number(h.price));
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice || 1;

  return (
    <View>
      {/* Trend indicator */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>
          {fuelType === 'motorin' ? '⛽ Motorin' : fuelType === 'lpg' ? '🔥 LPG' : `🛢️ ${fuelType}`}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={[typography.caption, {
            color: trend > 0 ? colors.danger : trend < 0 ? colors.success : colors.textTertiary,
            fontWeight: '700',
          }]}>
            {trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️'} {trend > 0 ? '+' : ''}{trend.toFixed(2)} ₺ (%{trendPct > 0 ? '+' : ''}{trendPct}%)
          </Text>
        </View>
      </View>

      {/* Mini line chart */}
      <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
        {prices.map((price, i) => {
          const barHeight = ((price - minPrice) / range) * 56 + 8;
          return (
            <View key={i} style={styles.barWrapper}>
              <Text style={[styles.barLabel, { color: colors.textTertiary }]}>
                {price.toFixed(2)}
              </Text>
              <View style={[styles.bar, {
                height: barHeight,
                backgroundColor: i === prices.length - 1 ? colors.primary : colors.primary + '50',
                flex: 1,
                maxWidth: 24,
              }]} />
            </View>
          );
        })}
      </View>

      {/* Current price */}
      <Text style={[typography.body, { color: colors.text, fontWeight: '700', textAlign: 'center' }]}>
        Güncel: {prices[prices.length - 1]?.toFixed(2)} ₺
      </Text>

      {/* Date range toggle */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
        {[7, 14, 30].map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.rangeBtn, { borderColor: colors.border, backgroundColor: rangeDays === d ? colors.primary + '15' : 'transparent' }]}
            onPress={() => setRangeDays(d)}
          >
            <Text style={[typography.small, { color: rangeDays === d ? colors.primary : colors.textTertiary }]}>
              {d} gün
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 8,
    marginBottom: 2,
  },
  rangeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
