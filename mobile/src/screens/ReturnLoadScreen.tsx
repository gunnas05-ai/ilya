import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  Dimensions,
  Share,
} from 'react-native';
import MapView, { Marker, Callout, Circle } from 'react-native-maps';
import * as Speech from 'expo-speech';
import VoiceCommandBar from '../components/VoiceCommandBar';
import OfflineBar from '../components/shared/OfflineBar';
import ListSkeleton from '../components/shared/ListSkeleton';
import EmptyState from '../components/shared/EmptyState';
import ErrorState from '../components/shared/ErrorState';
import SwipeableCard from '../components/shared/SwipeableCard';
import Card from '../components/shared/Card';
import TimeSlotPicker from '../components/load-create/TimeSlotPicker';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptic';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { useReturnLoadStore } from '../store/returnLoadStore';
import { apiClient } from '../services/api';
import { LOAD_TYPES } from '../constants/loadConstants';
import { BID_DURATION_OPTIONS } from '../types/loadAccept';

const RADIUS_OPTIONS = [25, 50, 100, 250, 500];
const SCREEN_WIDTH = Dimensions.get('window').width;
type ViewMode = 'list' | 'map';

interface Props {
  navigation: any;
  route: any;
}

export default function ReturnLoadScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { results, total, radiusKm, loading, searched, error, searchReturnLoads, setRadius, reserveLoad, releaseReservation } = useReturnLoadStore();

  const { deliveryLat, deliveryLng } = route.params || {};

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedBidLoad, setSelectedBidLoad] = useState<string | null>(null);
  const [selectedMapLoad, setSelectedMapLoad] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNote, setBidNote] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('3');
  const [hasReturn, setHasReturn] = useState(false);
  const [validDuration, setValidDuration] = useState(1440);
  const [pickupTime, setPickupTime] = useState('');
  const [requestEscrow, setRequestEscrow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (deliveryLat && deliveryLng) {
      searchReturnLoads(deliveryLat, deliveryLng, radiusKm);
    }
  }, [deliveryLat, deliveryLng]);

  // Region for map (centered on delivery point, with radius visible)
  const mapRegion = useMemo(() => ({
    latitude: deliveryLat || 39.9,
    longitude: deliveryLng || 32.8,
    latitudeDelta: Math.max(0.5, radiusKm / 111),
    longitudeDelta: Math.max(0.5, radiusKm / (111 * Math.cos((deliveryLat || 39.9) * Math.PI / 180))),
  }), [deliveryLat, deliveryLng, radiusKm]);

  const handleRadiusChange = (r: number) => {
    hapticLight();
    setRadius(r);
    if (deliveryLat && deliveryLng) {
      searchReturnLoads(deliveryLat, deliveryLng, r);
    }
  };

  const handleReserveAndOpenBid = async (loadId: string) => {
    hapticMedium();
    const reserved = await reserveLoad(loadId);
    if (reserved) {
      hapticSuccess();
      setSelectedBidLoad(loadId);
    } else {
      Alert.alert('Rezerve', 'Bu yük şu anda başka bir taşıyıcı tarafından rezerve edilmiş.');
    }
  };

  const handleReserveOnly = async (loadId: string) => {
    hapticMedium();
    const reserved = await reserveLoad(loadId);
    if (reserved) {
      hapticSuccess();
      Alert.alert('Rezerve Edildi', 'Yük başarıyla rezerve edildi. Teklif vermek için "Teklif Ver" butonunu kullanın.');
    } else {
      Alert.alert('Rezerve', 'Bu yük şu anda başka bir taşıyıcı tarafından rezerve edilmiş.');
    }
  };

  const handleCancelBid = async (loadId: string) => {
    await releaseReservation(loadId);
    setSelectedBidLoad(null);
    setBidAmount('');
    setBidNote('');
    setPickupTime('');
    setRequestEscrow(false);
  };

  const handlePlaceBid = async (loadId: string) => {
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Uyarı', 'Geçerli bir teklif fiyatı giriniz.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/bids', {
        loadId,
        amount,
        note: bidNote || 'Geri dönüş yükü teklifi',
        estimatedDeliveryDays: parseInt(estimatedDays) || 3,
        hasReturnLoad: hasReturn,
        validDuration,
        pickupTime: pickupTime || undefined,
        requestEscrow,
      });
      await releaseReservation(loadId);
      Alert.alert('Başarılı', 'Teklifiniz başarıyla gönderildi.');
      setSelectedBidLoad(null);
      setBidAmount('');
      setBidNote('');
      setPickupTime('');
      setRequestEscrow(false);
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.message || 'Teklif gönderilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = (loadId: string) => {
    hapticLight();
    setFavorites((prev) =>
      prev.includes(loadId) ? prev.filter((id) => id !== loadId) : [...prev, loadId]
    );
  };

  const handleShare = async (load: any, score: number) => {
    try {
      await Share.share({
        message: `🔍 KAPTAN'da dönüş yükü buldum!\n\n${load.title}\n📍 ${load.fromCity} → ${load.toCity}\n💰 ${load.totalPrice?.toLocaleString('tr-TR') || 'Belirtilmemiş'} ₺\n🎯 Uyum: %${score}\n\nKAPTAN Lojistik ile boş dönmeyin!`,
      });
    } catch { /* ignore */ }
  };

  const handleSpeak = (load: any, score: number) => {
    const text = [
      `${load.title}`,
      `${load.fromCity} şehrinden ${load.toCity} şehrine`,
      load.totalTonnage ? `Tonaj: ${load.totalTonnage} ton` : '',
      load.volume ? `Hacim: ${load.volume} metreküp` : '',
      `Uyum skoru: yüzde ${score}`,
      load.totalPrice ? `Tahmini ödeme: ${load.totalPrice.toLocaleString('tr-TR')} Türk Lirası` : '',
      load.escrow ? 'Escrow garantili ödeme' : '',
      `Yükleme: ${load.fromDistrict}, Teslimat: ${load.toDistrict}`,
    ].filter(Boolean).join('. ');
    Speech.speak(text, { language: 'tr-TR', rate: 0.85 });
  };

  const handleVoiceCommand = (action: string, command: string) => {
    switch (action) {
      case 'show_nearby':
        // Re-triggers search which shows nearby loads
        if (deliveryLat && deliveryLng) {
          searchReturnLoads(deliveryLat, deliveryLng, radiusKm);
        }
        break;
      case 'filter_100':
        handleRadiusChange(100);
        break;
      case 'filter_escrow':
      case 'filter_escrow_safe':
        // Filter to only escrow loads - re-search and filter client side
        if (deliveryLat && deliveryLng) {
          searchReturnLoads(deliveryLat, deliveryLng, radiusKm);
          // The escrow filter is client-side through the existing search
          setTimeout(() => {
            Speech.speak(
              `Escrow garantili ${results.filter((r: any) => r.load?.escrow).length} yük bulundu`,
              { language: 'tr-TR', rate: 0.85 },
            );
          }, 500);
        }
        break;
      case 'open_route':
        if (results.length > 0 && deliveryLat && deliveryLng) {
          const best = results[0].load;
          const url = `https://www.openstreetmap.org/directions?engine=osrm_car&route=${deliveryLat},${deliveryLng};${best.pickupLatitude},${best.pickupLongitude}`;
          Alert.alert('Rota', `En yakın dönüş yükü: ${best.fromCity} → ${best.toCity}`, [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Rota', onPress: () => Share.share({ message: `Rota: ${url}` }) },
          ]);
        }
        break;
      case 'read_aloud':
        if (results.length > 0) {
          handleSpeak(results[0].load, results[0].compatibilityScore);
        }
        break;
      case 'show_istanbul':
        Speech.speak('İstanbul ilanları görüntüleniyor. Yarıçap 250 km\'ye ayarlandı.', { language: 'tr-TR', rate: 0.85 });
        handleRadiusChange(250);
        break;
      case 'filter_tonnage_10':
        if (deliveryLat && deliveryLng) {
          searchReturnLoads(deliveryLat, deliveryLng, radiusKm);
          Speech.speak('10 ton altındaki dönüş yükleri filtreleniyor', { language: 'tr-TR', rate: 0.85 });
        }
        break;
      case 'escrow_details':
        {
          const escrowItem = results.find((r: any) => r.load?.escrow);
          if (escrowItem) {
            Alert.alert(
              'Escrow Detayları',
              'Bu dönüş yükü güvenli ödeme (escrow) ile korunmaktadır.\n\n• Ödemeniz bloke edilecek\n• Teslimat onayından sonra serbest bırakılacak\n• Platform garantisi altında',
            );
          } else {
            Speech.speak('Escrow garantili dönüş yükü bulunamadı', { language: 'tr-TR', rate: 0.85 });
          }
        }
        break;
      case 'bid_5000':
        if (results.length > 0) {
          const first = results[0].load;
          handleReserveAndOpenBid(first.id);
          setTimeout(() => setBidAmount('5000'), 300);
          Speech.speak(`${first.title} için 5000 TL teklif hazırlandı`, { language: 'tr-TR', rate: 0.85 });
        }
        break;
      case 'accept_counter':
        Speech.speak('Karşı tekliflerinize yönlendiriliyorsunuz', { language: 'tr-TR', rate: 0.85 });
        navigation.navigate('MyBids');
        break;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.danger;
  };

  const renderResultCard = ({ item }: { item: any }) => {
    const load = item.load;
    const typeLabel = LOAD_TYPES.find((t) => t.value === load.loadType)?.label || load.loadType;
    const scoreColor = getScoreColor(item.compatibilityScore);
    const isFav = favorites.includes(load.id);

    return (
      <SwipeableCard
        onLeftAction={() => toggleFavorite(load.id)}
        leftActionLabel={isFav ? 'Çıkar' : 'Favori'}
        leftActionIcon={isFav ? '☆' : '★'}
        onRightAction={() => {
          if (selectedBidLoad === load.id) {
            handleCancelBid(load.id);
          } else {
            handleReserveAndOpenBid(load.id);
          }
        }}
        rightActionLabel={selectedBidLoad === load.id ? 'İptal' : 'Teklif'}
        rightActionIcon="→"
      >
      <Card accentColor={scoreColor}>
        {/* Score Badge + Title */}
        <View style={styles.scoreRow}>
          <TouchableOpacity
            onPress={() => {
              setViewMode('map');
              setSelectedMapLoad(load.id);
            }}
          >
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
              <Text style={[typography.h3, { color: scoreColor, fontWeight: '800' }]}>
                %{item.compatibilityScore}
              </Text>
              <Text style={[typography.caption, { color: scoreColor }]}>Uyum</Text>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text }]} numberOfLines={1}>
              {load.title}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                {typeLabel}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => toggleFavorite(load.id)} style={styles.favBtn}>
            <Text style={[typography.h3, { color: isFav ? colors.danger : colors.textTertiary }]}>
              {isFav ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <Text style={[typography.body, { color: colors.text }]}>{load.fromCity}</Text>
          <Text style={[typography.body, { color: colors.textTertiary }]}> → </Text>
          <Text style={[typography.body, { color: colors.text }]}>{load.toCity}</Text>
        </View>

        {/* Distance + Details */}
        <View style={styles.distanceRow}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            📍 Teslim noktasına {item.distanceKm} km (yol: ~{item.estimatedRoadKm || Math.round(item.distanceKm * 1.35)} km)
          </Text>
          {item.emptyKmPenalty > 0 && (
            <View style={[styles.detailTag, { backgroundColor: colors.danger + '10' }]}>
              <Text style={[typography.caption, { color: colors.danger }]}>⚠️ Boş KM: -{item.emptyKmPenalty}</Text>
            </View>
          )}
        </View>

        <View style={styles.detailTags}>
          {load.totalTonnage && (
            <View style={[styles.detailTag, { backgroundColor: colors.surface }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>⚖️ {load.totalTonnage} ton</Text>
            </View>
          )}
          {load.volume && (
            <View style={[styles.detailTag, { backgroundColor: colors.surface }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>📦 {load.volume} m³</Text>
            </View>
          )}
          {load.vehicleType && (
            <View style={[styles.detailTag, { backgroundColor: colors.surface }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>🚛 {load.vehicleType}</Text>
            </View>
          )}
          {load.totalPrice && (
            <View style={[styles.detailTag, { backgroundColor: colors.success + '10' }]}>
              <Text style={[typography.caption, { color: colors.success }]}>💰 {load.totalPrice.toLocaleString('tr-TR')} ₺</Text>
            </View>
          )}
          {load.escrow && (
            <View style={[styles.detailTag, { backgroundColor: colors.warning + '10' }]}>
              <Text style={[typography.caption, { color: colors.warning }]}>🔒 Escrow</Text>
            </View>
          )}
          {load.urgency === 'Yüksek' && (
            <View style={[styles.detailTag, { backgroundColor: colors.danger + '10' }]}>
              <Text style={[typography.caption, { color: colors.danger }]}>⚡ Acil</Text>
            </View>
          )}
        </View>

        {/* EX-015: Score breakdown with weighted S_match components */}
        <View style={[styles.breakdownBox, { backgroundColor: colors.surface }]}>
          <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>
            Skor Detayı (S_match)
          </Text>
          <View style={styles.breakdownRow}>
            {[
              { label: 'Araç', value: item.scoreBreakdown.vehicleMatch, weight: '30' },
              { label: 'Mesafe', value: item.scoreBreakdown.distanceScore, weight: '20' },
              { label: 'Tonaj', value: item.scoreBreakdown.tonnageMatch, weight: '15' },
              { label: 'Hacim', value: item.scoreBreakdown.volumeMatch, weight: '10' },
              { label: 'Tarih', value: item.scoreBreakdown.dateMatch, weight: '10' },
              { label: 'Rota', value: item.scoreBreakdown.routeEfficiency, weight: '10' },
              { label: 'Kazanç', value: item.scoreBreakdown.earningsRatio ?? 0, weight: '5' },
            ].map((s) => (
              <View key={s.label} style={styles.barItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 10 }]}>
                    {s.label} (%{s.weight})
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, fontWeight: '600' }]}>
                    {Math.round(s.value)}%
                  </Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.barFill, {
                    width: `${Math.min(100, Math.max(0, s.value))}%`,
                    backgroundColor: getScoreColor(s.value),
                  }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Extended Actions */}
        <View style={styles.cardActions}>
          {selectedBidLoad !== load.id && (
            <TouchableOpacity
              style={[styles.actionBtnSmall, { borderColor: colors.success }]}
              onPress={() => handleReserveOnly(load.id)}
            >
              <Text style={[typography.caption, { color: colors.success }]}>📌 Rezerv Et</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => selectedBidLoad === load.id
              ? handleCancelBid(load.id)
              : handleReserveAndOpenBid(load.id)
            }
          >
            <Text style={[typography.label, { color: colors.white, fontWeight: '700' }]}>
              {selectedBidLoad === load.id ? 'İptal' : 'Teklif Ver'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSmall, { borderColor: colors.primary }]}
            onPress={() => {
              setViewMode('map');
              setSelectedMapLoad(load.id);
            }}
          >
            <Text style={[typography.caption, { color: colors.primary }]}>🗺️ Harita</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSmall, { borderColor: colors.primary }]}
            onPress={() => {
              const url = `https://www.openstreetmap.org/directions?engine=osrm_car&route=${deliveryLat},${deliveryLng};${load.pickupLatitude},${load.pickupLongitude}`;
              Alert.alert('Rota', `${load.fromCity} → ${load.toCity}\n\nRota için harita uygulamanız açılacak.`, [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Aç', onPress: () => Share.share({ url, message: `Rota: ${url}` }) },
              ]);
            }}
          >
            <Text style={[typography.caption, { color: colors.primary }]}>🗺️ Rota</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSmall, { borderColor: colors.textTertiary }]}
            onPress={() => handleShare(load, item.compatibilityScore)}
          >
            <Text style={[typography.caption, { color: colors.textTertiary }]}>📤 Paylaş</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSmall, { borderColor: colors.textTertiary }]}
            onPress={() => handleSpeak(load, item.compatibilityScore)}
          >
            <Text style={[typography.caption, { color: colors.textTertiary }]}>🔊 Sesli Oku</Text>
          </TouchableOpacity>
        </View>

        {/* Bid Form */}
        {selectedBidLoad === load.id && (
          <View style={[styles.bidForm, { borderTopColor: colors.border }]}>
            <View style={styles.formGroup}>
              <Text style={[typography.label, { color: colors.text }]}>Teklif Fiyatı (₺)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="numeric"
                placeholder="Örn: 15000"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[typography.label, { color: colors.text }]}>Not</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 60 }]}
                value={bidNote}
                onChangeText={setBidNote}
                placeholder="Teslimat notu..."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.label, { color: colors.text }]}>Gün</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={estimatedDays}
                  onChangeText={setEstimatedDays}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={[styles.returnToggle, { borderColor: colors.border }]}
                onPress={() => setHasReturn(!hasReturn)}
              >
                <Text style={[typography.caption, { color: hasReturn ? colors.primary : colors.textTertiary }]}>
                  {hasReturn ? '✓' : '○'} Dönüş
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
                <Text style={[typography.label, { color: colors.text }]}>Yükü Alabileceği Saat</Text>
                <TimeSlotPicker
                  value={pickupTime}
                  onChange={setPickupTime}
                  label=""
                />
              </View>
              <TouchableOpacity
                style={[styles.escrowToggle, { borderColor: requestEscrow ? colors.primary : colors.border, backgroundColor: requestEscrow ? colors.primary + '10' : 'transparent' }]}
                onPress={() => setRequestEscrow(!requestEscrow)}
              >
                <Text style={[typography.caption, { color: requestEscrow ? colors.primary : colors.textTertiary, fontWeight: requestEscrow ? '600' : '400' }]}>
                  {requestEscrow ? '✓' : '○'} Escrow Ödeme İsteği
                </Text>
              </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={() => handlePlaceBid(load.id)}
              disabled={submitting}
            >
              <Text style={[typography.label, { color: colors.white, fontWeight: '700' }]}>
                {submitting ? 'Gönderiliyor...' : 'Teklif Gönder'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
      </SwipeableCard>
    );
  };

  const renderMapView = () => (
    <View style={styles.mapWrapper}>
      <MapView
        style={styles.map}
        initialRegion={mapRegion}
        onPress={() => setSelectedMapLoad(null)}
      >
        {/* Delivery point - Red marker */}
        {deliveryLat && deliveryLng && (
          <>
            <Marker
              coordinate={{ latitude: deliveryLat, longitude: deliveryLng }}
              title="Teslim Noktanız"
              description="Bu noktaya teslimat yaptınız"
              pinColor="red"
            />
            {/* Radius circle */}
            <Circle
              center={{ latitude: deliveryLat, longitude: deliveryLng }}
              radius={radiusKm * 1000}
              fillColor={colors.primary + '10'}
              strokeColor={colors.primary + '30'}
              strokeWidth={2}
            />
          </>
        )}

        {/* Return load markers - Blue */}
        {results.map((item: any) => {
          const load = item.load;
          if (!load.pickupLatitude || !load.pickupLongitude) return null;
          const isSelected = selectedMapLoad === load.id;
          const scoreColor = getScoreColor(item.compatibilityScore);
          return (
            <Marker
              key={load.id}
              coordinate={{
                latitude: load.pickupLatitude,
                longitude: load.pickupLongitude,
              }}
              pinColor={isSelected ? scoreColor : load.escrow ? '#F5A623' : '#3B82F6'}
              onPress={() => setSelectedMapLoad(load.id)}
            >
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={[typography.label, { fontWeight: '700', marginBottom: 2 }]}>{load.title}</Text>
                  <View style={[styles.scoreBadgeSmall, { backgroundColor: scoreColor + '20' }]}>
                    <Text style={[typography.caption, { color: scoreColor, fontWeight: '700' }]}>%{item.compatibilityScore} Uyum</Text>
                  </View>
                  <Text style={[typography.caption, { marginTop: 2 }]}>{load.fromCity} → {load.toCity}</Text>
                  <Text style={[typography.caption]}>{item.distanceKm} km • {load.totalTonnage || '?'} ton</Text>
                  {load.totalPrice && (
                    <Text style={[typography.label, { color: colors.success, fontWeight: '700', marginTop: 2 }]}>
                      {load.totalPrice.toLocaleString('tr-TR')} ₺
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Map overlay: selected load info */}
      {selectedMapLoad && (() => {
        const item = results.find((r: any) => r.load?.id === selectedMapLoad);
        if (!item) return null;
        const load = item.load;
        return (
          <View style={[styles.mapInfoOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                {load.title}
              </Text>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                {load.fromCity} → {load.toCity} • {item.distanceKm} km
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.mapOverlayBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setSelectedMapLoad(null);
                setViewMode('list');
                // Scroll to this item after brief delay
              }}
            >
              <Text style={[typography.caption, { color: colors.white, fontWeight: '600' }]}>Detay</Text>
            </TouchableOpacity>
          </View>
        );
      })()}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />



      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.info + '10', borderColor: colors.info + '30' }]}>
        <Text style={[typography.label, { color: colors.info, fontWeight: '600' }]}>
          🚛 Teslim noktanıza yakın dönüş yükleri
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
          Boş dönmeyin, rotanıza uygun yükleri bulun
        </Text>
      </View>

      {/* Radius Selector */}
      <View style={styles.radiusSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[typography.label, { color: colors.text }]}>Arama Yarıçapı</Text>
          {/* View mode toggle */}
          <View style={[styles.viewToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && { backgroundColor: colors.primary }]}
              onPress={() => { setViewMode('list'); hapticLight(); }}
            >
              <Text style={[typography.caption, { color: viewMode === 'list' ? colors.white : colors.text }]}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'map' && { backgroundColor: colors.primary }]}
              onPress={() => { setViewMode('map'); hapticLight(); }}
            >
              <Text style={[typography.caption, { color: viewMode === 'map' ? colors.white : colors.text }]}>🗺️</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.radiusChip,
                { borderColor: colors.border },
                radiusKm === r && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => handleRadiusChange(r)}
            >
              <Text style={[typography.caption, { color: radiusKm === r ? colors.white : colors.text }]}>
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Voice Commands */}
      <VoiceCommandBar onCommand={handleVoiceCommand} colors={colors} />

      {/* Results */}
      {loading ? (
        <ListSkeleton count={3} cardHeight={260} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => { if (deliveryLat && deliveryLng) searchReturnLoads(deliveryLat, deliveryLng, radiusKm); }} />
      ) : !searched ? (
        <EmptyState
          title="Teslimat konumu bekleniyor"
          description="Geri dönüş yüklerini görmek için önce bir teslimat yapmalısınız."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title={`${radiusKm} km yarıçapında uygun yük bulunamadı`}
          description="Daha geniş bir yarıçap seçmeyi deneyin veya filtrelerinizi değiştirin."
        />
      ) : viewMode === 'map' ? (
        renderMapView()
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, idx) => item.load?.id || `${idx}`}
          renderItem={renderResultCard}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
              {total} uygun dönüş yükü bulundu
              {favorites.length > 0 && ` • ${favorites.length} favori`}
            </Text>
          }
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
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  infoBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  radiusSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  radiusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    minHeight: 36,
    justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 32,
    justifyContent: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  favBtn: {
    padding: spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  distanceRow: {
    marginBottom: spacing.md,
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  breakdownBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
    minWidth: 80,
  },
  actionBtnSmall: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
    minWidth: 60,
  },
  bidForm: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  formGroup: {},
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  input: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 44,
    marginTop: 4,
  },
  returnToggle: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  escrowToggle: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  // Map styles
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapInfoOverlay: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapOverlayBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  calloutContainer: {
    minWidth: 160,
    padding: 4,
  },
  scoreBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginVertical: 2,
  },
});
