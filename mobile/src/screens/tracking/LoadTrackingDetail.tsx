import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import DocumentStatusCard from '../../components/DocumentStatusCard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { useTrackingStore } from '../../store/trackingStore';
import { usePoiStore } from '../../store/poiStore';
import { simulateLoadProgress, calculateDistance, formatDistance, estimateTravelTime, calculateSmartETA } from '../../services/trackingService';

type ViewMode = 'text' | 'map';

interface Props {
  navigation: any;
  route: any;
}

const CURRENT_USER = 'device_user_1';

export default function LoadTrackingDetail({ navigation, route }: Props) {
  const { loadId } = route.params;
  const { colors } = useTheme();
  const { getLoad, updateLocation, verifyDelivery } = useTrackingStore();
  const [docStatus, setDocStatus] = useState<any>(null);
  
  // POI Store
  const {
    fuelStations, restaurants, showFuelStations, showRestaurants, loadingFuel, loadingRestaurants,
    toggleFuelStations, toggleRestaurants, fetchFuelStationsAlongRoute, fetchRestaurantsAlongRoute, clearPOIs
  } = usePoiStore();

  const [viewMode, setViewMode] = useState<ViewMode>('text');

  const tracking = getLoad(loadId);

  useEffect(() => {
    if (!tracking) {
      navigation.goBack();
      return;
    }
    
    // Fetch POIs when tracking loads
    if (tracking.pickupLocation && tracking.deliveryLocation) {
      const waypoints = [tracking.pickupLocation, tracking.currentLocation, tracking.deliveryLocation];
      fetchFuelStationsAlongRoute(waypoints, 10);
      fetchRestaurantsAlongRoute(waypoints, 10);
    }
    
    return () => clearPOIs();
  }, [tracking?.id]); // Only re-run if ID changes

  if (!tracking) return null;

  // UX-004: Share tracking link via WhatsApp/SMS/etc (Enhanced E-22)
  const handleShareTracking = async () => {
    try {
      const { Share, Linking } = require('react-native');
      const { apiClient } = require('../../services/api');
      const res = await apiClient.post(`/tracking/${tracking.id}/share`);
      const shareUrl = res.data?.data?.shareUrl || res.data?.shareUrl || `https://kaptan.app/track/${tracking.id}`;

      const smartEta = calculateSmartETA({
        distanceKm: distToDelivery,
        roadType: distToDelivery > 200 ? 'highway' : 'divided',
        includeRestBreaks: true,
      });

      const fromCityName = tracking.route?.fromCity || '';
      const toCityName = tracking.route?.toCity || '';

      const shareMessage = [
        `🚛 KAPTAN Canlı Yük Takibi`,
        ``,
        `${fromCityName} → ${toCityName}`,
        `📍 Konum: ${tracking.currentLocation?.latitude?.toFixed(4)}, ${tracking.currentLocation?.longitude?.toFixed(4)}`,
        `⏱️ ETA: ${smartEta.displayText}`,
        `📅 Varış: ~${smartEta.arrivalEstimate}`,
        `🛣️ Kalan: ${formatDistance(distToDelivery)}`,
        ``,
        `🔗 Canlı Takip: ${shareUrl}`,
        ``,
        `KAPTAN Lojistik Platformu`,
      ].join('\n');

      // WhatsApp + SMS secenekleri
      Alert.alert('Takip Linkini Paylaş', 'Hangi uygulama ile paylaşmak istersiniz?', [
        {
          text: 'WhatsApp',
          onPress: () => {
            const waMessage = encodeURIComponent(shareMessage);
            Linking.openURL(`whatsapp://send?text=${waMessage}`).catch(() => {
              // Fallback: web WhatsApp
              Linking.openURL(`https://wa.me/?text=${waMessage}`);
            });
          },
        },
        {
          text: 'SMS',
          onPress: () => {
            const smsMessage = encodeURIComponent(shareMessage);
            Linking.openURL(`sms:?body=${smsMessage}`).catch(() => {
              Share.share({ message: shareMessage, url: shareUrl });
            });
          },
        },
        {
          text: 'Diğer',
          onPress: () => {
            Share.share({ message: shareMessage, url: shareUrl });
          },
        },
        { text: 'Kapat', style: 'cancel' },
      ]);
    } catch {
      Alert.alert('Paylaşım', 'Takip linki kopyalandı. Alıcıya gönderebilirsiniz.');
    }
  };

  const isCreator = tracking.creatorId === CURRENT_USER;
  const distToDelivery = calculateDistance(
    tracking.currentLocation.latitude,
    tracking.currentLocation.longitude,
    tracking.deliveryLocation.latitude,
    tracking.deliveryLocation.longitude
  );

  const distFromPickup = calculateDistance(
    tracking.pickupLocation.latitude,
    tracking.pickupLocation.longitude,
    tracking.currentLocation.latitude,
    tracking.currentLocation.longitude
  );

  const handleRefreshGPS = async () => {
    const progress = Math.random() * 0.2;
    const currentP = tracking.status === 'beklemede' ? 0 : tracking.status === 'yolda' ? 0.5 : 1;
    const updated = simulateLoadProgress(tracking, Math.min(1, currentP + progress));
    await updateLocation(loadId, updated.currentLocation);
    Alert.alert('Konum Güncellendi', 'GPS konumu başarıyla güncellendi.');
  };

  const handleSimulateArrival = async () => {
    const updated = simulateLoadProgress(tracking, 1);
    await updateLocation(loadId, updated.currentLocation);
    Alert.alert('Teslim Edildi', 'Yük teslim noktasına ulaştı olarak işaretlendi.');
  };

  const handleVerifyDelivery = async (method: 'qr' | 'photo' | 'otp' | 'gps') => {
    if (method === 'gps') {
      // GPS verification: confirm delivery location matches
      const distToDelivery = calculateDistance(
        tracking.currentLocation.latitude,
        tracking.currentLocation.longitude,
        tracking.deliveryLocation.latitude,
        tracking.deliveryLocation.longitude
      );
      if (distToDelivery > 1) {
        Alert.alert(
          'GPS Doğrulama',
          `Teslim noktasına ${formatDistance(distToDelivery)} uzaklıktasınız. Doğrulama için teslim noktasında olmalısınız.`,
        );
        return;
      }
    } else if (method === 'qr') {
      Alert.alert(
        'QR Kod Doğrulama',
        'Teslimat sırasında alıcıya QR kodunu okutun.\n\nSimülasyon: QR doğrulama başarılı.',
        [{ text: 'Tamam', onPress: () => {} }],
      );
    } else if (method === 'photo') {
      Alert.alert(
        'Fotoğraf Yükleme',
        'Teslim edilen yükün fotoğrafını çekin.\n\nSimülasyon: Fotoğraf yüklendi.',
        [{ text: 'Tamam', onPress: () => {} }],
      );
    } else if (method === 'otp') {
      Alert.alert(
        'OTP Kod Onayı',
        'Alıcıya gönderilen 6 haneli kodu girin.\n\nSimülasyon: OTP doğrulama başarılı.',
        [{ text: 'Tamam', onPress: () => {} }],
      );
    }
    await verifyDelivery(loadId, method);
  };

  const statusColor = () => {
    switch (tracking.status) {
      case 'yolda': return colors.info;
      case 'teslim_edildi': return colors.success;
      default: return colors.warning;
    }
  };

  const statusLabel = () => {
    switch (tracking.status) {
      case 'yolda': return 'Yolda';
      case 'teslim_edildi': return 'Teslim Edildi';
      default: return 'Beklemede';
    }
  };

  const roleLabel = isCreator ? 'Yükü Gönderen' : 'Yükü Alan';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>


      {/* View Mode Toggle */}
      <View style={[styles.toggleRow, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'text'
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { borderColor: colors.border },
          ]}
          onPress={() => setViewMode('text')}
        >
          <Text style={[typography.label, { color: viewMode === 'text' ? '#FFF' : colors.text }]}>
            Metin Görünüm
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'map' && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[typography.label, { color: viewMode === 'map' ? '#FFF' : colors.text }]}>
            Harita Görünüm
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor() + '15', borderColor: statusColor() }]}>
          <Text style={[typography.h3, { color: statusColor() }]}>{statusLabel()}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Son güncelleme: {new Date(tracking.updatedAt).toLocaleString('tr-TR')}
          </Text>
        </View>

        {viewMode === 'text' ? (
          <>
            {/* Text Mode - Distance & Info */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
                Yük Durumu
              </Text>

              <View style={styles.infoRow}>
                <Text style={[typography.label, { color: colors.textTertiary }]}>
                  Güzergah
                </Text>
                <Text style={[typography.body, { color: colors.text }]}>
                  {tracking.route.fromCity} → {tracking.route.toCity}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[typography.h3, { color: colors.primary, marginBottom: spacing.md }]}>
                📍 Yük sana {formatDistance(distToDelivery)} uzaklıkta
              </Text>

              <View style={styles.infoGrid}>
                <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[typography.label, { color: colors.textTertiary }]}>Alınan Nokta</Text>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {tracking.route.fromCity}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {formatDistance(distFromPickup)} uzakta
                  </Text>
                </View>

                <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[typography.label, { color: colors.textTertiary }]}>Teslim Noktası</Text>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {tracking.route.toCity}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {formatDistance(distToDelivery)} kaldı
                  </Text>
                </View>
              </View>

              <View style={[styles.etaBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                <Text style={[typography.label, { color: colors.primary }]}>
                  Tahmini Varış Süresi
                </Text>
                <Text style={[typography.h2, { color: colors.primary, marginTop: spacing.xs }]}>
                  {tracking.estimatedArrival || 'Hesaplanıyor...'}
                </Text>
              </View>

              {tracking.receiverId && (
                <View style={styles.infoRow}>
                  <Text style={[typography.label, { color: colors.textTertiary }]}>
                    Yükü Alacak Kişiye Mesafe
                  </Text>
                  <Text style={[typography.body, { color: colors.info, fontWeight: '600' }]}>
                    {tracking.distanceToReceiver ? formatDistance(tracking.distanceToReceiver) : 'Hesaplanıyor...'}
                  </Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Text style={[typography.label, { color: colors.textTertiary }]}>
                  Yük Tipi
                </Text>
                <Text style={[typography.body, { color: colors.text }]}>
                  {tracking.loadType === 'tam_yuk' ? 'Tam Yük'
                    : tracking.loadType === 'kismi_yuk' ? 'Kısmi Yük'
                    : tracking.loadType === 'evden_eve' ? 'Evden Eve'
                    : tracking.loadType === 'sehir_ici' ? 'Şehir İçi'
                    : tracking.loadType}
                </Text>
              </View>
            </View>

            {/* Truck Navigation Button */}
            <TouchableOpacity
              style={[styles.truckNavBtn, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}
              onPress={() => navigation.navigate('TruckNavigation', {
                loadId,
                originLat: tracking.currentLocation.latitude,
                originLng: tracking.currentLocation.longitude,
                destLat: tracking.deliveryLocation.latitude,
                destLng: tracking.deliveryLocation.longitude,
                fromCity: tracking.route.fromCity,
                toCity: tracking.route.toCity,
              })}
              activeOpacity={0.8}
            >
              <Ionicons name="bus" size={22} color={colors.warning} />
              <Text style={[typography.label, { color: colors.warning, marginLeft: spacing.sm, fontWeight: '600' }]}>
                Kamyon Navigasyonu
              </Text>
              <Text style={[typography.small, { color: colors.textTertiary, marginLeft: 'auto' }]}>
                Köprü/Tonaj Kontrolü →
              </Text>
            </TouchableOpacity>

            {/* GPS Kontrol Butonları */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleRefreshGPS}
              >
                <Text style={[typography.label, { color: '#FFF' }]}>🔄 Konumu Güncelle</Text>
              </TouchableOpacity>
              {tracking.status !== 'teslim_edildi' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.success }]}
                  onPress={handleSimulateArrival}
                >
                  <Text style={[typography.label, { color: '#FFF' }]}>✓ Teslim Edildi</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Delivery Verification - required before return load */}
            {tracking.status === 'teslim_edildi' && !tracking.deliveryVerified && (
              <View style={[styles.verifySection, { backgroundColor: colors.warning + '10', borderColor: colors.warning }]}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                  📋 Teslim Doğrulama
                </Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.md }]}>
                  Geri dönüş yüklerini görmek için teslimatınızı doğrulayın
                </Text>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: spacing.md }]}
                    onPress={() => navigation.navigate('DeliveryProof', { loadId })}
                  >
                    <Text style={[typography.h3, { color: '#FFF' }]}>ePOD Sihirbazını Başlat</Text>
                  </TouchableOpacity>
              </View>
            )}

            {/* Return Load Trigger - only after delivery verification */}
            {tracking.status === 'teslim_edildi' && tracking.deliveryVerified && (
              <TouchableOpacity
                style={[styles.returnLoadBtn, { backgroundColor: colors.info }]}
                onPress={() => navigation.navigate('ReturnLoad', {
                  deliveryLat: tracking.deliveryLocation.latitude,
                  deliveryLng: tracking.deliveryLocation.longitude,
                })}
              >
                <Text style={[typography.h3, { color: '#FFF' }]}>🔄 Geri Dönüş Yükü Bul</Text>
                <Text style={[typography.caption, { color: '#FFF', opacity: 0.8, marginTop: 2 }]}>
                  Boş dönmeyin, rotanıza uygun yükleri bulun
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {/* Map Mode */}
            
            {/* POI Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
              <TouchableOpacity
                style={[
                  styles.poiFilterBtn,
                  { backgroundColor: showFuelStations ? colors.primary : colors.card, borderColor: showFuelStations ? colors.primary : colors.border }
                ]}
                onPress={toggleFuelStations}
              >
                <Text style={{ color: showFuelStations ? '#FFF' : colors.text }}>
                  ⛽ Yakıt İstasyonları {loadingFuel ? '...' : `(${fuelStations.length})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.poiFilterBtn,
                  { backgroundColor: showRestaurants ? colors.primary : colors.card, borderColor: showRestaurants ? colors.primary : colors.border, marginLeft: spacing.sm }
                ]}
                onPress={toggleRestaurants}
              >
                <Text style={{ color: showRestaurants ? '#FFF' : colors.text }}>
                  🍽️ Restoranlar {loadingRestaurants ? '...' : `(${restaurants.length})`}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: tracking.currentLocation.latitude,
                  longitude: tracking.currentLocation.longitude,
                  latitudeDelta: Math.abs(tracking.pickupLocation.latitude - tracking.deliveryLocation.latitude) + 0.5,
                  longitudeDelta: Math.abs(tracking.pickupLocation.longitude - tracking.deliveryLocation.longitude) + 0.5,
                }}
              >
                {/* POI Markers: Fuel */}
                {showFuelStations && fuelStations.map((station, i) => (
                  <Marker
                    key={`fuel-${station.station?.id || i}`}
                    coordinate={{
                      latitude: station.station?.latitude || 0,
                      longitude: station.station?.longitude || 0,
                    }}
                    pinColor="purple"
                  >
                    <Callout tooltip>
                      <View style={[styles.calloutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[typography.label, { color: colors.text }]}>⛽ {station.station?.name || station.station?.brand?.name}</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>
                          Tır Parkı: {station.station?.hasTirParking ? 'Var' : 'Yok'}
                        </Text>
                        {station.station?.discountPercentage > 0 && (
                          <Text style={[typography.caption, { color: colors.success, fontWeight: 'bold' }]}>
                            %{(station.station?.discountPercentage * 100).toFixed(0)} Kaptan İndirimi
                          </Text>
                        )}
                      </View>
                    </Callout>
                  </Marker>
                ))}

                {/* POI Markers: Restaurants */}
                {showRestaurants && restaurants.map((rest, i) => (
                  <Marker
                    key={`rest-${rest.restaurant?.id || i}`}
                    coordinate={{
                      latitude: rest.restaurant?.latitude || 0,
                      longitude: rest.restaurant?.longitude || 0,
                    }}
                    pinColor="orange"
                  >
                    <Callout tooltip>
                      <View style={[styles.calloutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[typography.label, { color: colors.text }]}>🍽️ {rest.restaurant?.name}</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>
                          Puan: ⭐ {rest.restaurant?.averageRating?.toFixed(1) || 'Yeni'}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>
                          Tır Parkı: {rest.restaurant?.hasTirParking ? 'Var' : 'Yok'}
                        </Text>
                      </View>
                    </Callout>
                  </Marker>
                ))}

                {/* Pickup Marker */}
                <Marker
                  coordinate={{
                    latitude: tracking.pickupLocation.latitude,
                    longitude: tracking.pickupLocation.longitude,
                  }}
                  title="Alınacak Nokta"
                  description={tracking.route.fromCity}
                  pinColor="green"
                />

                {/* Current Location Marker */}
                <Marker
                  coordinate={{
                    latitude: tracking.currentLocation.latitude,
                    longitude: tracking.currentLocation.longitude,
                  }}
                  title="Yük Konumu"
                  description={`${roleLabel}: ${tracking.title}`}
                  pinColor="blue"
                />

                {/* Delivery Marker */}
                <Marker
                  coordinate={{
                    latitude: tracking.deliveryLocation.latitude,
                    longitude: tracking.deliveryLocation.longitude,
                  }}
                  title="Teslim Noktası"
                  description={tracking.route.toCity}
                  pinColor="red"
                />

                {/* Route Line */}
                <Polyline
                  coordinates={[
                    tracking.pickupLocation,
                    tracking.currentLocation,
                    tracking.deliveryLocation,
                  ]}
                  strokeColor={colors.primary}
                  strokeWidth={3}
                  lineDashPattern={[10, 5]}
                />
              </MapView>
            </View>

            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'green' }]} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Alınacak</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'blue' }]} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Yük</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'red' }]} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Teslim</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'purple' }]} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Yakıt</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'orange' }]} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Yemek</Text>
              </View>
            </View>
          </>
        )}

        {/* 📋 Evrak Durumu */}
        <View style={{ marginTop: spacing.md }}>
          <DocumentStatusCard shipmentId={loadId} />
        </View>
      </ScrollView>
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'] + 40,
  },
  statusBanner: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoBox: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  etaBox: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  truckNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 52,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  returnLoadBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  verifySection: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  verifyGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  verifyBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  mapContainer: {
    height: 400,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  map: {
    flex: 1,
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  poiFilterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
});
