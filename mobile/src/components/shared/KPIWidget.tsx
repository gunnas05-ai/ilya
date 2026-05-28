import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing } from '../../theme';
import Card from './Card';

interface KPIWidgetProps {
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  trend?: {
    value: string;
    type: 'up' | 'down' | 'neutral';
  };
  style?: any;
  onPress?: () => void;
}

export function KPIWidget({ title, value, subtitle, accentColor, trend, style, onPress }: KPIWidgetProps) {
  const { colors } = useTheme();

  let trendColor = colors.textSecondary;
  let trendIndicator = '';

  if (trend) {
    if (trend.type === 'up') {
      trendColor = colors.success;
      trendIndicator = '▲ ';
    } else if (trend.type === 'down') {
      trendColor = colors.danger;
      trendIndicator = '▼ ';
    }
  }

  return (
    <Card accentColor={accentColor} style={[styles.card, style]} onPress={onPress}>
      {/* Title */}
      <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
        {title}
      </Text>

      {/* Value */}
      <Text style={[typography.h1, { color: colors.text, marginVertical: spacing.xs, fontWeight: '700' }]}>
        {value}
      </Text>

      {/* Footer / Trend Info */}
      <View style={styles.footer}>
        {trend && (
          <Text style={[typography.small, { color: trendColor, fontWeight: '600', marginRight: spacing.xs }]}>
            {trendIndicator}{trend.value}
          </Text>
        )}
        {subtitle && (
          <Text style={[typography.small, { color: colors.textTertiary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
