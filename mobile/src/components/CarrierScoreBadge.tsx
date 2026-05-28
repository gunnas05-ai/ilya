import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';

export type ScoreTier = 'excellent' | 'good' | 'fair' | 'at_risk';

export interface CarrierScoreData {
  overallScore: number;
  scoreTier: ScoreTier;
  tierLabel: string;
  tierColor: string;
  totalCompletedLoads?: number;
  escrowRequired?: boolean;
}

interface Props {
  score: CarrierScoreData;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export function getTierLabel(tier: ScoreTier): string {
  switch (tier) {
    case 'excellent': return 'Mükemmel';
    case 'good': return 'İyi';
    case 'fair': return 'Orta';
    case 'at_risk': return 'Riskli';
  }
}

export function getTierColor(tier: ScoreTier): { bg: string; text: string } {
  switch (tier) {
    case 'excellent': return { bg: '#10B98120', text: '#10B981' };
    case 'good': return { bg: '#F59E0B20', text: '#F59E0B' };
    case 'fair': return { bg: '#F9731620', text: '#F97316' };
    case 'at_risk': return { bg: '#EF444420', text: '#EF4444' };
  }
}

export default function CarrierScoreBadge({ score, size = 'md', onPress }: Props) {
  const { colors: themeColors } = useTheme();
  const tierColors = getTierColor(score.scoreTier);

  const dims = size === 'sm' ? { fontSize: 10, padH: 6, padV: 1, minW: 36 } :
               size === 'lg' ? { fontSize: 14, padH: 12, padV: 4, minW: 72 } :
               { fontSize: 12, padH: 8, padV: 2, minW: 52 };

  const content = (
    <View style={[
      styles.badge,
      {
        backgroundColor: score.scoreTier === 'at_risk' ? tierColors.bg : tierColors.bg,
        paddingHorizontal: dims.padH,
        paddingVertical: dims.padV,
      },
    ]}>
      {size !== 'sm' && (
        <Text style={[styles.tier, { color: tierColors.text, fontWeight: '600' }]}>
          {score.tierLabel} ·
        </Text>
      )}
      <Text style={[styles.score, {
        color: tierColors.text,
        fontSize: dims.fontSize,
        fontWeight: '800',
      }]}>
        %{score.overallScore}
      </Text>
      {score.totalCompletedLoads != null && size === 'lg' && (
        <Text style={[styles.info, { color: themeColors.textTertiary }]}>
          {' '}({score.totalCompletedLoads} yük)
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  score: {},
  tier: {
    fontSize: 11,
    marginRight: 2,
  },
  info: {
    fontSize: 10,
  },
});
