import { apiClient } from './api';
import { CarrierScoreData } from '../components/CarrierScoreBadge';

export interface CarrierScorecardFull {
  carrierId: string;
  overallScore: number;
  scoreTier: string;
  tierLabel: string;
  tierColor: string;
  metrics: {
    onTimeDeliveryPct: number;
    claimsRatio: number;
    cancellationRate: number;
    avgResponseTimeMinutes: number;
    totalCompletedLoads: number;
    totalRevenue: number;
    averageRating: number;
    totalRatings: number;
    acceptanceRate: number;
  };
  restrictions: {
    escrowRequired: boolean;
    bidLimitPerDay: number;
    isRestricted: boolean;
  };
}

export interface ScorecardLeaderboardEntry {
  carrierId: string;
  overallScore: number;
  scoreTier: string;
  tierLabel: string;
  totalCompletedLoads: number;
  totalRevenue: number;
}

export const carrierScoreService = {
  /** Get own full scorecard */
  getMyScorecard: async (): Promise<CarrierScorecardFull> => {
    const res = await apiClient.get('/analytics/scorecard');
    return res.data?.data || res.data;
  },

  /** Get specific carrier's full scorecard */
  getCarrierScorecard: async (carrierId: string): Promise<CarrierScorecardFull> => {
    const res = await apiClient.get(`/analytics/scorecard/${carrierId}`);
    return res.data?.data || res.data;
  },

  /** Get lightweight bidder score for card display */
  getBidderScore: async (carrierId: string): Promise<CarrierScoreData> => {
    const res = await apiClient.get(`/analytics/scorecard/${carrierId}/summary`);
    return res.data?.data || res.data;
  },

  /** Get top-scored carriers leaderboard */
  getLeaderboard: async (limit = 20): Promise<ScorecardLeaderboardEntry[]> => {
    const res = await apiClient.get('/analytics/scorecards/leaderboard', { params: { limit } });
    return res.data?.data || res.data;
  },
};
