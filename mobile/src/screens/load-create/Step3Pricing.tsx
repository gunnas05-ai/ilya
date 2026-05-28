import { forwardRef, useImperativeHandle, useMemo, useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { useLoadCreateStore } from '../../store/loadCreateStore';
import RadioGroup from '../../components/load-create/RadioGroup';
import FormField from '../../components/load-create/FormField';
import BottomSheet from '../../components/shared/BottomSheet';
import TimeSlotPicker from '../../components/load-create/TimeSlotPicker';
import Card from '../../components/shared/Card';
import { PriceSummary } from '../../types/load';
import { INSURANCE_PACKAGES } from '../../constants/loadConstants';
import { priceService, PriceEstimateResult, LaneHistoryEntry, MarketHeatmapEntry } from '../../services/priceService';
import { hapticLight } from '../../utils/haptic';

export interface Step3Handle {
  validateAndSave: () => void;
}

interface Step3Props {
  onSubmit: () => void;
}

export default forwardRef<Step3Handle, Step3Props>(function Step3Pricing({ onSubmit }, ref) {
  const { colors } = useTheme();
  const { formData, updateFormData, isSubmitting } = useLoadCreateStore();
  const [showAuctionStart, setShowAuctionStart] = useState(false);
  const [showAuctionEnd, setShowAuctionEnd] = useState(false);
  const [marketEstimate, setMarketEstimate] = useState<PriceEstimateResult | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [laneHistory, setLaneHistory] = useState<LaneHistoryEntry[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const priceSummary = useMemo<PriceSummary>(() => {
    const pricingType = formData.pricingType;
    let netAmount = 0;

    if (pricingType === 'tonaj') {
      const tonaj = formData.tonnage || 0;
      const pricePerTon = formData.pricePerTon || 0;
      netAmount = tonaj * pricePerTon;
    } else if (pricingType === 'komple') {
      netAmount = formData.totalPrice || 0;
    }

    const vatAmount = netAmount * 0.20;
    const insuranceAmount = formData.insurance ? netAmount * 0.02 : 0;
    const totalAmount = netAmount + vatAmount + insuranceAmount;

    return {
      netAmount,
      vatAmount,
      vatRate: 20,
      insuranceAmount,
      totalAmount,
      hasAuction: formData.isAuction || false,
      hasEscrow: formData.escrow || false,
    };
  }, [formData]);

  const validateAndSave = useCallback(() => {
    if (!formData.pricingType) {
      Alert.alert('Uyarı', 'Hesaplama tipi seçiniz (Tonaj Bazlı veya Komple Bazlı)');
      return;
    }
    if (formData.pricingType === 'tonaj') {
      if (!formData.tonnage || !formData.pricePerTon) {
        Alert.alert('Uyarı', 'Tonaj ve ton başı fiyat giriniz');
        return;
      }
    } else {
      if (!formData.totalPrice) {
        Alert.alert('Uyarı', 'Yük fiyatı giriniz');
        return;
      }
    }
    if (formData.insurance && !formData.insurancePackage) {
      Alert.alert('Uyarı', 'Sigorta paketi seçiniz');
      return;
    }
    if (formData.isAuction) {
      if (!formData.auctionMinPrice || !formData.auctionMaxPrice) {
        Alert.alert('Uyarı', 'İhale alt ve üst limit fiyatı giriniz');
        return;
      }
    }
    onSubmit();
  }, [formData, onSubmit]);

  useImperativeHandle(ref, () => ({ validateAndSave }), [validateAndSave]);

  const formatPrice = (amount: number) => {
    if (amount === 0) return '0 ₺';
    return amount.toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    });
  };

  const formatRaw = (amount: number) => {
    return amount.toLocaleString('tr-TR') + ' ₺';
  };

  const dates = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(d);
    }
    return result;
  }, []);

  const selectedInsurance = INSURANCE_PACKAGES.find(p => p.id === formData.insurancePackage);

  /** EX-006: Fetch market estimate + lane history in parallel */
  const fetchMarketEstimate = async () => {
    hapticLight();
    setLoadingEstimate(true);
    try {
      const result = await priceService.estimate({
        fromCity: formData.fromCity,
        toCity: formData.toCity,
        loadType: formData.loadType || undefined,
        tonnage: formData.tonnage,
        totalKg: formData.totalKg,
        isHomeMove: formData.loadType === 'evden_eve',
        hasElevator: (formData as any).senderElevator,
        coldChain: formData.coldChain,
      });
      setMarketEstimate(result);

      // Also fetch lane history
      if (formData.fromCity && formData.toCity) {
        setLoadingHistory(true);
        try {
          const hist = await priceService.getLaneRatesHistory(formData.fromCity, formData.toCity, 6);
          setLaneHistory(hist.history);
        } catch {
          setLaneHistory(null);
        } finally {
          setLoadingHistory(false);
        }
      }
    } catch {
      Alert.alert('Hata', 'Piyasa fiyatı alınamadı. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoadingEstimate(false);
    }
  };

  /** EX-006: Auto-fill form with AI-estimated market price */
  const applyMarketPrice = () => {
    if (!marketEstimate) return;
    hapticLight();
    const { minPrice, maxPrice } = marketEstimate.estimate;

    if (formData.pricingType === 'tonaj' && formData.tonnage) {
      const avgPricePerTon = Math.round((minPrice + maxPrice) / 2 / formData.tonnage);
      updateFormData({ pricePerTon: avgPricePerTon });
      Alert.alert(
        'Piyasa Fiyatı Uygulandı',
        `Ton başı ${formatRaw(avgPricePerTon)} olarak ayarlandı.\nTahmini toplam: ${formatRaw(Math.round((minPrice + maxPrice) / 2))}`,
      );
    } else if (formData.pricingType === 'komple') {
      const avgTotal = Math.round((minPrice + maxPrice) / 2);
      updateFormData({ totalPrice: avgTotal });
      Alert.alert(
        'Piyasa Fiyatı Uygulandı',
        `Komple yük fiyatı ${formatRaw(avgTotal)} olarak ayarlandı.`,
      );
    } else {
      Alert.alert('Uyarı', 'Önce hesaplama tipi seçiniz (Tonaj Bazlı veya Komple Bazlı)');
    }
  };

  /** Render lane history mini bars */
  const renderLaneHistory = () => {
    if (!laneHistory || laneHistory.length === 0) return null;
    const maxRate = Math.max(...laneHistory.map(h => h.rate));

    return (
      <Card accentColor={colors.info} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.md }]}>
          📊 Son 6 Ay Piyasa Trendi
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 100 }}>
          {laneHistory.map((entry, idx) => {
            const barHeight = maxRate > 0 ? (entry.rate / maxRate) * 72 : 0;
            return (
              <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[typography.small, { color: colors.text, fontWeight: '600', marginBottom: 2 }]}>
                  {formatRaw(entry.rate).replace('.00', '')}
                </Text>
                <View style={{
                  width: '100%',
                  height: Math.max(4, barHeight),
                  backgroundColor: idx === laneHistory.length - 1 ? colors.primary : colors.primary + '40',
                  borderRadius: radius.sm,
                }} />
                <Text style={[typography.small, { color: colors.textTertiary, marginTop: 4 }]}>
                  {entry.month}
                </Text>
              </View>
            );
          })}
        </View>
        {marketEstimate?.laneData && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
            <View>
              <Text style={[typography.small, { color: colors.textTertiary }]}>Güncel Piyasa</Text>
              <Text style={[typography.body, { color: colors.info, fontWeight: '700' }]}>
                {formatRaw(marketEstimate.laneData.avgRate)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[typography.small, { color: colors.textTertiary }]}>Trend</Text>
              <Text style={[typography.body, {
                color: marketEstimate.laneData.trend === 'up' ? colors.danger : colors.success,
                fontWeight: '700',
              }]}>
                {marketEstimate.laneData.trend === 'up' ? '📈 Yükseliş' : '📊 Dengeli'}
              </Text>
            </View>
          </View>
        )}
      </Card>
    );
  };

  /** EX-006: Render fuel staleness warning */
  const renderFuelStaleness = () => {
    if (!marketEstimate) return null;
    const { fuelPrices } = marketEstimate;
    const { hoursSinceUpdate, isStale, isVeryStale } = fuelPrices;

    return (
      <Card
        accentColor={isVeryStale ? colors.danger : isStale ? colors.warning : colors.success}
        style={{ marginBottom: spacing.md }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 18 }}>⛽</Text>
          <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginLeft: spacing.xs }]}>
            Güncel Yakıt Fiyatları
          </Text>
        </View>

        {/* Fuel staleness badge */}
        {isVeryStale && (
          <View style={[styles.staleBadge, { backgroundColor: colors.danger + '18' }]}>
            <Text style={[typography.small, { color: colors.danger, fontWeight: '700' }]}>
              ⚠️ Son güncelleme: {hoursSinceUpdate} saat önce — fiyatlar güncel değil!
            </Text>
          </View>
        )}
        {isStale && !isVeryStale && (
          <View style={[styles.staleBadge, { backgroundColor: colors.warning + '18' }]}>
            <Text style={[typography.small, { color: colors.warning, fontWeight: '600' }]}>
              ⏳ Son güncelleme: {hoursSinceUpdate} saat önce
            </Text>
          </View>
        )}
        {!isStale && (
          <View style={[styles.staleBadge, { backgroundColor: colors.success + '12' }]}>
            <Text style={[typography.small, { color: colors.success, fontWeight: '600' }]}>
              ✅ Güncel (son {hoursSinceUpdate}s önce)
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>Motorin</Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
              {fuelPrices.motorin} ₺/L
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>LPG</Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
              {fuelPrices.lpg} ₺/L
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>AdBlue</Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
              {fuelPrices.adblue} ₺/L
            </Text>
          </View>
        </View>
        <Text style={[typography.small, { color: colors.textTertiary, marginTop: spacing.xs }]}>
          Kaynak: EPDK | Güncelleme: {new Date(fuelPrices.updatedAt).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </Card>
    );
  };

  /** EX-006: Render market heatmap demand indicator */
  const renderHeatmap = () => {
    if (!marketEstimate?.marketHeatmap) return null;
    const hm = marketEstimate.marketHeatmap;

    const getDemandColor = (score: number) => {
      if (score >= 80) return colors.danger;
      if (score >= 60) return colors.warning;
      if (score >= 40) return colors.info;
      return colors.textTertiary;
    };

    return (
      <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.md }]}>
          🔥 Arz-Talep Analizi
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>Çıkış ({hm.fromCity})</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={[typography.h3, { color: getDemandColor(hm.fromDemandScore), fontWeight: '800' }]}>
                {hm.fromDemandScore}
              </Text>
              <Text style={[typography.small, { color: colors.textSecondary, marginLeft: 6 }]}>
                /100
              </Text>
            </View>
            <Text style={[typography.caption, { color: getDemandColor(hm.fromDemandScore), fontWeight: '600' }]}>
              Talep: {hm.fromDemandLabel}
            </Text>
          </View>
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[typography.h2, { color: colors.textTertiary }]}>→</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>Varış ({hm.toCity})</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={[typography.h3, { color: getDemandColor(hm.toDemandScore), fontWeight: '800' }]}>
                {hm.toDemandScore}
              </Text>
              <Text style={[typography.small, { color: colors.textSecondary, marginLeft: 6 }]}>
                /100
              </Text>
            </View>
            <Text style={[typography.caption, { color: getDemandColor(hm.toDemandScore), fontWeight: '600' }]}>
              Talep: {hm.toDemandLabel}
            </Text>
          </View>
        </View>
        <View style={[styles.heatmapRec, {
          backgroundColor: hm.netDemand > 0 ? colors.success + '10' : colors.warning + '10',
          marginTop: spacing.md,
        }]}>
          <Text style={[typography.small, {
            color: hm.netDemand > 0 ? colors.success : colors.warning,
            fontWeight: '600',
          }]}>
            {hm.recommendation}
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
          Fiyatlandırma
        </Text>

        {/* EX-006: Piyasa Fiyat Karşılaştırması */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={[typography.h3, { color: colors.text, flex: 1 }]}>
              🤖 AI Piyasa Analizi
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            EPDK yakıt fiyatları, lane bazlı piyasa verileri ve arz-talep dengesi ile hesaplanır.
          </Text>

          {/* Fetch estimate button */}
          {!marketEstimate && (
            <TouchableOpacity
              style={[styles.marketBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary }]}
              onPress={fetchMarketEstimate}
              disabled={loadingEstimate}
              activeOpacity={0.8}
            >
              {loadingEstimate ? (
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[typography.small, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                    EPDK fiyatları ve lane verileri alınıyor...
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>
                    🎯 Piyasa Fiyatını Gör
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}>
                    {formData.fromCity && formData.toCity
                      ? `${formData.fromCity} → ${formData.toCity} hattı için AI tahmini`
                      : 'Şehir bilgisi 1. adımdan alınır'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {marketEstimate && (
            <View>
              {/* AI Estimate Card */}
              <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>
                      AI Fiyat Tahmini
                    </Text>
                    <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}>
                      {formData.fromCity} → {formData.toCity}
                    </Text>
                  </View>
                  <View style={[styles.aiBadge, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[typography.small, { color: colors.primary, fontWeight: '700' }]}>
                      AI
                    </Text>
                  </View>
                </View>

                <Text style={[typography.h2, { color: colors.primary, fontWeight: '800', marginTop: spacing.md }]}>
                  {formatRaw(marketEstimate.estimate.minPrice)} — {formatRaw(marketEstimate.estimate.maxPrice)}
                </Text>

                {/* Breakdown */}
                <View style={[styles.breakdownBox, { backgroundColor: colors.background, marginTop: spacing.md }]}>
                  <View style={styles.breakdownRow}>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>⛽ Yakıt</Text>
                    <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>
                      {formatRaw(marketEstimate.estimate.breakdown.fuelCost)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>👷 İşçilik</Text>
                    <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>
                      {formatRaw(marketEstimate.estimate.breakdown.laborCost)}
                    </Text>
                  </View>
                  {marketEstimate.estimate.breakdown.specialCost > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={[typography.small, { color: colors.textSecondary }]}>📦 Özel Durum</Text>
                      <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>
                        {formatRaw(marketEstimate.estimate.breakdown.specialCost)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.breakdownRow}>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>⚡ Risk Faktörü</Text>
                    <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>
                      x{marketEstimate.estimate.breakdown.riskFactor}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>📅 Tahmini Süre</Text>
                    <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>
                      {marketEstimate.estimate.breakdown.estimatedDays} gün
                    </Text>
                  </View>
                </View>

                {/* EX-006: "Piyasa Fiyatını Kullan" auto-fill button */}
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: colors.success + '18', borderColor: colors.success }]}
                  onPress={applyMarketPrice}
                  activeOpacity={0.8}
                >
                  <Text style={[typography.label, { color: colors.success, fontWeight: '700' }]}>
                    📋 Piyasa Fiyatını Kullan
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}>
                    Form alanlarına AI tahmini otomatik yazılır
                  </Text>
                </TouchableOpacity>

                <Text style={[typography.small, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                  Geçerlilik: {new Date(marketEstimate.validUntil).toLocaleDateString('tr-TR')} tarihine kadar
                </Text>
              </Card>

              {/* EX-006: Fuel Prices with Staleness */}
              {renderFuelStaleness()}

              {/* EX-006: Lane Market Data */}
              {marketEstimate.laneData && (
                <Card accentColor={colors.info} style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                    <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>
                      📈 {marketEstimate.laneData.fromCity} → {marketEstimate.laneData.toCity}
                    </Text>
                    <View style={[styles.trendBadge, { backgroundColor: marketEstimate.laneData.trend === 'up' ? colors.danger + '18' : colors.success + '18' }]}>
                      <Text style={[typography.small, { color: marketEstimate.laneData.trend === 'up' ? colors.danger : colors.success, fontWeight: '700' }]}>
                        {marketEstimate.laneData.trend === 'up' ? '📈 Yükseliş' : '📊 Dengeli'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.small, { color: colors.textTertiary }]}>Piyasa Ort.</Text>
                      <Text style={[typography.h3, { color: colors.info, fontWeight: '800' }]}>
                        {formatRaw(marketEstimate.laneData.avgRate)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.small, { color: colors.textTertiary }]}>Piyasa Aralığı</Text>
                      <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {formatRaw(marketEstimate.laneData.minRate)} — {formatRaw(marketEstimate.laneData.maxRate)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>
                    İşlem hacmi: {marketEstimate.laneData.volume}
                  </Text>
                </Card>
              )}

              {/* EX-006: Lane Rate History Chart */}
              {loadingHistory ? (
                <View style={{ alignItems: 'center', padding: spacing.lg }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[typography.small, { color: colors.textTertiary, marginTop: spacing.sm }]}>
                    Lane geçmişi yükleniyor...
                  </Text>
                </View>
              ) : renderLaneHistory()}

              {/* EX-006: Market Heatmap */}
              {renderHeatmap()}

              {/* Market Comparison */}
              {marketEstimate.marketComparison && (
                <Card
                  accentColor={
                    marketEstimate.marketComparison.comparison === 'in_range' ? colors.success :
                    marketEstimate.marketComparison.comparison === 'below_market' ? colors.warning : colors.danger
                  }
                  style={{ marginBottom: spacing.md }}
                >
                  <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>
                    ⚖️ Sizin Tahmini Fiyat vs Piyasa
                  </Text>

                  <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
                    <View style={[styles.comparisonBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                      <Text style={[typography.small, { color: colors.textTertiary }]}>Sizin Fiyatınız</Text>
                      <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>
                        {formatRaw(marketEstimate.marketComparison.yourRange.min)} — {formatRaw(marketEstimate.marketComparison.yourRange.max)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[typography.caption, {
                    color: marketEstimate.marketComparison.comparison === 'in_range' ? colors.success :
                           marketEstimate.marketComparison.comparison === 'below_market' ? colors.warning : colors.danger,
                    fontWeight: '600',
                    marginTop: spacing.xs,
                  }]}>
                    {marketEstimate.marketComparison.comparison === 'in_range' ? '✅ ' :
                     marketEstimate.marketComparison.comparison === 'below_market' ? '⚠️ ' : '🔴 '}
                    {marketEstimate.marketComparison.recommendation}
                  </Text>
                </Card>
              )}

              {/* Refresh button */}
              <TouchableOpacity
                style={[styles.marketBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={fetchMarketEstimate}
                disabled={loadingEstimate}
                activeOpacity={0.8}
              >
                <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>
                  {loadingEstimate ? 'Hesaplanıyor...' : '🔄 Yeniden Hesapla'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bölüm Ayracı */}
        <View style={[styles.sectionDivider, { borderBottomColor: colors.border }]} />

        {/* İhale */}
        <RadioGroup
          label="Yük İhale Edilecek mi?"
          value={formData.isAuction === true ? 'evet' : formData.isAuction === false ? 'hayir' : null}
          options={[
            { value: 'evet', label: 'Evet' },
            { value: 'hayir', label: 'Hayır' },
          ]}
          onChange={(v) => updateFormData({ isAuction: v === 'evet' })}
        />

        {formData.isAuction && (
          <View style={[styles.auctionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
              İhale Bilgileri
            </Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <FormField
                  label="Alt Limit Fiyat"
                  value={formData.auctionMinPrice?.toString() || ''}
                  onChangeText={(t) => updateFormData({ auctionMinPrice: parseFloat(t) || undefined })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.half}>
                <FormField
                  label="Üst Limit Fiyat"
                  value={formData.auctionMaxPrice?.toString() || ''}
                  onChangeText={(t) => updateFormData({ auctionMaxPrice: parseFloat(t) || undefined })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* İhale Başlangıç Tarihi */}
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.sm }]}>
              İhale Başlangıç
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.datePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowAuctionStart(true)}
              >
                <Text style={[typography.body, { color: formData.auctionStartDate ? colors.text : colors.textTertiary }]}>
                  {formData.auctionStartDate
                    ? formData.auctionStartDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'Tarih Seç'}
                </Text>
              </TouchableOpacity>
              <TimeSlotPicker
                value={formData.auctionStartTime || ''}
                onChange={(t) => updateFormData({ auctionStartTime: t })}
              />
            </View>

            {/* İhale Bitiş Tarihi */}
            <Text style={[typography.label, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }]}>
              İhale Bitiş
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.datePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowAuctionEnd(true)}
              >
                <Text style={[typography.body, { color: formData.auctionEndDate ? colors.text : colors.textTertiary }]}>
                  {formData.auctionEndDate
                    ? formData.auctionEndDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'Tarih Seç'}
                </Text>
              </TouchableOpacity>
              <TimeSlotPicker
                value={formData.auctionEndTime || ''}
                onChange={(t) => updateFormData({ auctionEndTime: t })}
              />
            </View>

            {/* BottomSheet: Auction Start Date */}
            <BottomSheet visible={showAuctionStart} onClose={() => setShowAuctionStart(false)}>
              <View style={styles.bottomSheetContent}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, textAlign: 'center' }]}>
                  İhale Başlangıç Tarihi
                </Text>
                <View style={styles.dateGrid}>
                  {dates.map((d) => {
                    const isSelected = formData.auctionStartDate && d.toDateString() === formData.auctionStartDate.toDateString();
                    const isPast = d < new Date(new Date().toDateString());
                    return (
                      <TouchableOpacity
                        key={d.toISOString()}
                        style={[
                          styles.dateItem,
                          {
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                            opacity: isPast ? 0.3 : 1,
                          },
                        ]}
                        onPress={() => {
                          if (!isPast) {
                            updateFormData({ auctionStartDate: d });
                            setShowAuctionStart(false);
                          }
                        }}
                        disabled={isPast}
                      >
                        <Text style={[typography.caption, { color: isSelected ? colors.white : colors.text, fontWeight: isSelected ? '700' : '400' }]}>
                          {d.getDate()}
                        </Text>
                        <Text style={[typography.caption, { color: isSelected ? colors.white : colors.textTertiary, fontSize: 9 }]}>
                          {d.toLocaleDateString('tr-TR', { month: 'short' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </BottomSheet>

            {/* BottomSheet: Auction End Date */}
            <BottomSheet visible={showAuctionEnd} onClose={() => setShowAuctionEnd(false)}>
              <View style={styles.bottomSheetContent}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, textAlign: 'center' }]}>
                  İhale Bitiş Tarihi
                </Text>
                <View style={styles.dateGrid}>
                  {dates.map((d) => {
                    const isSelected = formData.auctionEndDate && d.toDateString() === formData.auctionEndDate.toDateString();
                    const isPast = d < new Date(new Date().toDateString());
                    return (
                      <TouchableOpacity
                        key={d.toISOString()}
                        style={[
                          styles.dateItem,
                          {
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                            opacity: isPast ? 0.3 : 1,
                          },
                        ]}
                        onPress={() => {
                          if (!isPast) {
                            updateFormData({ auctionEndDate: d });
                            setShowAuctionEnd(false);
                          }
                        }}
                        disabled={isPast}
                      >
                        <Text style={[typography.caption, { color: isSelected ? colors.white : colors.text, fontWeight: isSelected ? '700' : '400' }]}>
                          {d.getDate()}
                        </Text>
                        <Text style={[typography.caption, { color: isSelected ? colors.white : colors.textTertiary, fontSize: 9 }]}>
                          {d.toLocaleDateString('tr-TR', { month: 'short' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </BottomSheet>
          </View>
        )}

        {/* Kapıda Ödeme */}
        <RadioGroup
          label="Kapıda Ödeme Var mı?"
          value={formData.cod === true ? 'evet' : formData.cod === false ? 'hayir' : null}
          options={[
            { value: 'evet', label: 'Evet' },
            { value: 'hayir', label: 'Hayır' },
          ]}
          onChange={(v) => updateFormData({ cod: v === 'evet' })}
        />

        {/* Sigorta */}
        <RadioGroup
          label="Sigorta İstiyor musunuz?"
          value={formData.insurance === true ? 'evet' : formData.insurance === false ? 'hayir' : null}
          options={[
            { value: 'evet', label: 'Evet' },
            { value: 'hayir', label: 'Hayır' },
          ]}
          onChange={(v) => updateFormData({ insurance: v === 'evet', insurancePackage: undefined })}
        />

        {formData.insurance && (
          <View style={[styles.insuranceList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
              Sigorta Paketi Seçiniz
            </Text>
            {INSURANCE_PACKAGES.map((pkg) => {
              const isSelected = formData.insurancePackage === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.insuranceCard,
                    {
                      backgroundColor: isSelected ? colors.primary + '15' : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => updateFormData({ insurancePackage: pkg.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.insuranceInfo}>
                    <Text style={[typography.label, { color: isSelected ? colors.primary : colors.text }]}>
                      {pkg.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      {pkg.description}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                      Limit: {pkg.coverage.toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                  <Text style={[typography.h3, { color: isSelected ? colors.primary : colors.text }]}>
                    {pkg.price}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Güvenli Ödeme */}
        <RadioGroup
          label="Güvenli Ödeme (Escrow) İstiyor musunuz?"
          value={formData.escrow === true ? 'evet' : formData.escrow === false ? 'hayir' : null}
          options={[
            { value: 'evet', label: 'Evet' },
            { value: 'hayir', label: 'Hayır' },
          ]}
          onChange={(v) => updateFormData({ escrow: v === 'evet' })}
        />

        {/* Bölüm Ayracı */}
        <View style={[styles.sectionDivider, { borderBottomColor: colors.border, marginTop: spacing.lg }]} />

        {/* Manuel Fiyat Hesaplama */}
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.md }]}>
          Manuel Fiyat Hesaplama
        </Text>

        <RadioGroup
          label="Hesaplama Tipi"
          value={formData.pricingType || ''}
          options={[
            { value: 'tonaj', label: 'Tonaj Bazlı' },
            { value: 'komple', label: 'Komple / Adet Bazlı' },
          ]}
          onChange={(v) => updateFormData({ pricingType: v as 'tonaj' | 'komple' })}
          required
        />

        {formData.pricingType === 'tonaj' && (
          <View>
            <FormField
              label="Toplam Tonaj"
              value={formData.tonnage?.toString() || ''}
              onChangeText={(t) => updateFormData({ tonnage: parseFloat(t) || undefined })}
              keyboardType="numeric"
            />
            <FormField
              label="Ton Başı Fiyat (₺)"
              value={formData.pricePerTon?.toString() || ''}
              onChangeText={(t) => updateFormData({ pricePerTon: parseFloat(t) || undefined })}
              keyboardType="numeric"
            />
          </View>
        )}

        {formData.pricingType === 'komple' && (
          <View>
            <FormField
              label="Toplam Yük (Kg)"
              value={formData.totalKg?.toString() || ''}
              onChangeText={(t) => updateFormData({ totalKg: parseFloat(t) || undefined })}
              keyboardType="numeric"
            />
            <FormField
              label="Komple Yük Fiyatı (₺)"
              value={formData.totalPrice?.toString() || ''}
              onChangeText={(t) => updateFormData({ totalPrice: parseFloat(t) || undefined })}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Fiyat Özeti */}
        {formData.pricingType && (priceSummary.netAmount > 0) && (
          <View style={[styles.summaryBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
              Fiyat Özeti
            </Text>

            <View style={styles.summaryRow}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>Net Tutar</Text>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                {formatPrice(priceSummary.netAmount)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                KDV (%{priceSummary.vatRate})
              </Text>
              <Text style={[typography.body, { color: colors.text }]}>
                {formatPrice(priceSummary.vatAmount)}
              </Text>
            </View>

            {priceSummary.insuranceAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[typography.body, { color: colors.textSecondary }]}>Sigorta</Text>
                <Text style={[typography.body, { color: colors.text }]}>
                  {formatPrice(priceSummary.insuranceAmount)}
                </Text>
              </View>
            )}

            {selectedInsurance && (
              <View style={styles.summaryRow}>
                <Text style={[typography.body, { color: colors.textSecondary }]}>Sigorta Paketi</Text>
                <Text style={[typography.body, { color: colors.text }]}>{selectedInsurance.name}</Text>
              </View>
            )}

            {priceSummary.hasAuction && (
              <View style={styles.summaryRow}>
                <Text style={[typography.body, { color: colors.warning }]}>İhale Durumu</Text>
                <Text style={[typography.body, { color: colors.warning }]}>Aktif</Text>
              </View>
            )}

            {priceSummary.hasEscrow && (
              <View style={styles.summaryRow}>
                <Text style={[typography.body, { color: colors.info }]}>Güvenli Ödeme</Text>
                <Text style={[typography.body, { color: colors.info }]}>Aktif</Text>
              </View>
            )}

            <View style={[styles.divider, { borderBottomColor: colors.border }]} />

            <View style={styles.summaryRow}>
              <Text style={[typography.h3, { color: colors.text }]}>Toplam</Text>
              <Text style={[typography.h3, { color: colors.primary }]}>
                {formatPrice(priceSummary.totalAmount)}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  bottomSheetContent: {},
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  dateItem: {
    width: '14%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  auctionBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  datePicker: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  insuranceList: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  insuranceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    minHeight: 64,
  },
  insuranceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  summaryBox: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  divider: {
    borderBottomWidth: 1,
    marginVertical: spacing.sm,
  },
  marketBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  trendBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  comparisonBox: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sectionDivider: {
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  staleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  breakdownBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  aiBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  applyBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 52,
    justifyContent: 'center',
  },
  heatmapRec: {
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
