import React, { useState, useEffect } from 'react';
import { PhoneInput } from '../components/shared/PhoneInput';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal, 
  KeyboardAvoidingView, 
  Platform,
  Image
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import Card from '../components/shared/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import FuelPriceHistoryChart from '../components/FuelPriceHistoryChart';
import { fuelStationService } from '../services/fuelStationService';
import { useAuthStore } from '../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

// Haversine distance calculator helper
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return parseFloat(d.toFixed(1));
}

export default function FuelStationsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { isGuest, logout, user } = useAuthStore();

  const handleGuestGuard = (onSuccess: () => void) => {
    if (isGuest) {
      Alert.alert(
        'Misafir Modu',
        'İşlem yapmak için üye olunuz.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Üye Ol / Giriş Yap', onPress: () => {
            logout();
            navigation.navigate('Login');
          }}
        ]
      );
    } else {
      onSuccess();
    }
  };

  // States
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStationId, setExpandedStationId] = useState<string | null>(null);
  
  // Location States
  const [userLat, setUserLat] = useState(40.7854); // Default to Düzce/Kaynaşlı
  const [userLng, setUserLng] = useState(31.3021);

  // Price report & review states
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [selectedStationForPrice, setSelectedStationForPrice] = useState<any>(null);
  const [selectedFuelType, setSelectedFuelType] = useState<string>('MOTORIN');
  const [newPrice, setNewPrice] = useState('');
  
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedStationForReview, setSelectedStationForReview] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Add / Edit Form States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false); // false for Add, true for Edit
  const [selectedStationForEdit, setSelectedStationForEdit] = useState<any>(null);
  
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('Opet');
  const [formAddress, setFormAddress] = useState('');
  const [formWorkingHours, setFormWorkingHours] = useState('7/24 Açık');
  const [formPhone, setFormPhone] = useState('');
  const [formCapacity, setFormCapacity] = useState('50');
  
  // Coordinate Picker States
  const [formLat, setFormLat] = useState('40.7854');
  const [formLng, setFormLng] = useState('31.3021');

  // Search States
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearched, setIsSearched] = useState(false);

  // Map Modal States
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedStationForMap, setSelectedStationForMap] = useState<any>(null);

  // EX-010: EPDK + Staleness + Bulk Import + History states
  const [epdkData, setEpdkData] = useState<any>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkStationId, setBulkStationId] = useState<string | null>(null);
  const [bulkPrices, setBulkPrices] = useState<Array<{ fuelType: string; price: string }>>([
    { fuelType: 'motorin', price: '' }, { fuelType: 'kursunsuz', price: '' },
    { fuelType: 'lpg', price: '' }, { fuelType: 'adblue', price: '' },
  ]);
  const [historyModalStationId, setHistoryModalStationId] = useState<string | null>(null);
  const [historyFuelType, setHistoryFuelType] = useState('motorin');

  const handleGetLocationForForm = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum tespiti için izin vermelisiniz.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setFormLat(loc.coords.latitude.toString());
      setFormLng(loc.coords.longitude.toString());
      Alert.alert('Başarılı', 'Konum koordinatları başarıyla alındı.');
    } catch (e) {
      Alert.alert('Hata', 'Konum koordinatları alınamadı.');
    }
  };

  // Prices states for form
  const [priceDizel, setPriceDizel] = useState('');
  const [priceBenzin, setPriceBenzin] = useState('');
  const [priceLpg, setPriceLpg] = useState('');
  const [priceAdblue, setPriceAdblue] = useState('');
  const [priceElektrik, setPriceElektrik] = useState('');

  // Photo uploading states
  const [formPhotoUri, setFormPhotoUri] = useState<string | null>(null);
  const [formPhotoBase64, setFormPhotoBase64] = useState<string | null>(null);

  // Services checkbox checklist
  const [formServices, setFormServices] = useState<Record<string, boolean>>({
    market: false,
    kafe: false,
    tuvalet: false,
    dus: false,
    lokanta: false,
    arac_yikama: false,
    lastik_tamir: false,
    kamera: false,
  });

  const brands = ['Opet', 'Shell', 'BP', 'Petrol Ofisi', 'Total', 'Diğer'];
  const serviceKeys = [
    { key: 'market', label: '🏪 Market' },
    { key: 'kafe', label: '☕ Kafe' },
    { key: 'tuvalet', label: '🚽 Tuvalet' },
    { key: 'dus', label: '🚿 Duş' },
    { key: 'lokanta', label: '🍽️ Lokanta' },
    { key: 'arac_yikama', label: '🧼 Araç Yıkama' },
    { key: 'lastik_tamir', label: '🔧 Lastik Tamiri' },
    { key: 'kamera', label: '📹 Güvenlik Kamerası' },
  ];

  // Request current GPS location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLat(loc.coords.latitude);
          setUserLng(loc.coords.longitude);
        }
      } catch (e) {
        console.log('Error getting location, using default Düzce coordinates:', e);
      }
    })();
  }, []);

  useEffect(() => {
    fetchStations();
    // EX-010: Fetch EPDK reference prices
    fuelStationService.getEpdkReference().then((res: any) => {
      setEpdkData(res.data || res);
    }).catch(() => {});
  }, [userLat, userLng]);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const res = await fuelStationService.getAll();
      const rawStations = res.data?.stations || res.stations || res || [];
      
      // Calculate distances & sort by distance ASC
      const mapped = rawStations.map((s: any) => {
        const dist = getDistance(userLat, userLng, s.latitude || 40.7854, s.longitude || 31.3021);
        return {
          ...s,
          distanceKm: dist
        };
      });
      mapped.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
      setStations(mapped);
    } catch (err) {
      console.log('Error fetching fuel stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery) {
      handleClearSearch();
      return;
    }
    setLoading(true);
    setSearchModalVisible(false);
    try {
      const res = await fuelStationService.getAll({ search: searchQuery });
      const rawStations = res.data?.stations || res.stations || res || [];
      
      // Calculate distances & sort by distance ASC
      const mapped = rawStations.map((s: any) => {
        const dist = getDistance(userLat, userLng, s.latitude || 40.7854, s.longitude || 31.3021);
        return {
          ...s,
          distanceKm: dist
        };
      });
      mapped.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
      setStations(mapped);
      setIsSearched(true);
    } catch (err) {
      console.log('Error searching fuel stations:', err);
    } finally {
      setLoading(false);
    }
  };

  // EX-010: Calculate price staleness (hours since last update)
  const getPriceStaleness = (station: any): { hours: number; isStale: boolean; isVeryStale: boolean } | null => {
    const prices = station.prices;
    if (!prices || prices.length === 0) return null;
    const now = new Date();
    // Find the most recent price update
    let latestUpdate: Date | null = null;
    for (const p of prices) {
      const upd = p.updatedAt ? new Date(p.updatedAt) : p.createdAt ? new Date(p.createdAt) : null;
      if (upd && (!latestUpdate || upd > latestUpdate)) latestUpdate = upd;
    }
    if (!latestUpdate) return null;
    const hours = Math.round((now.getTime() - latestUpdate.getTime()) / (1000 * 60 * 60));
    return { hours, isStale: hours > 24, isVeryStale: hours > 48 };
  };

  // EX-010: Bulk import handler
  const handleBulkImport = async () => {
    if (!bulkStationId) return;
    const prices = bulkPrices
      .filter(p => p.price && parseFloat(p.price) > 0)
      .map(p => ({ fuelType: p.fuelType, price: parseFloat(p.price) }));
    if (prices.length === 0) { Alert.alert('Uyarı', 'En az bir fiyat giriniz.'); return; }
    try {
      const res = await fuelStationService.bulkImportPrices(bulkStationId, prices);
      const data = res.data || res;
      Alert.alert(
        'Başarılı',
        `${data.imported || data.total || prices.length} fiyat güncellendi.${data.errors ? `\n${data.errors.length} hata oluştu.` : ''}`,
      );
      setShowBulkImport(false);
      fetchStations();
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.message || 'Toplu güncelleme başarısız.');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearched(false);
    fetchStations();
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Fotoğraf eklemek için galeri izni vermelisiniz.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // Compress and resize the image to be under 2MB
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        setFormPhotoUri(manipResult.uri);
        setFormPhotoBase64(`data:image/jpeg;base64,${manipResult.base64}`);
      } catch (error) {
        console.log('Error manipulating/compressing image:', error);
        setFormPhotoUri(asset.uri);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedStationForEdit(null);
    setFormName('');
    setFormBrand('Opet');
    setFormAddress('');
    setFormWorkingHours('7/24 Açık');
    setFormPhone('');
    setFormCapacity('50');
    setFormLat('40.7854');
    setFormLng('31.3021');
    
    setPriceDizel('');
    setPriceBenzin('');
    setPriceLpg('');
    setPriceAdblue('');
    setPriceElektrik('');

    setFormPhotoUri(null);
    setFormPhotoBase64(null);

    const resetSvcs: Record<string, boolean> = {};
    serviceKeys.forEach(s => {
      resetSvcs[s.key] = false;
    });
    setFormServices(resetSvcs);

    setEditModalVisible(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditMode(true);
    setSelectedStationForEdit(s);
    setFormName(s.name);
    setFormBrand(s.brand || 'Opet');
    setFormAddress(s.fullAddress || '');
    setFormWorkingHours(s.workingHoursText || '7/24 Açık');
    setFormPhone(s.phone || '');
    setFormCapacity(s.parkingCapacity?.toString() || '50');
    setFormLat(s.latitude ? s.latitude.toString() : '40.7854');
    setFormLng(s.longitude ? s.longitude.toString() : '31.3021');

    // Load existing prices
    const dizelPrice = s.prices?.find((p: any) => p.fuelType === 'motorin')?.price || '';
    const benzinPrice = s.prices?.find((p: any) => p.fuelType === 'kursunsuz')?.price || '';
    const lpgPrice = s.prices?.find((p: any) => p.fuelType === 'lpg')?.price || '';
    const adbluePrice = s.prices?.find((p: any) => p.fuelType === 'adblue')?.price || '';
    const elektrikPrice = s.prices?.find((p: any) => p.fuelType === 'elektrik_sarj')?.price || '';

    setPriceDizel(dizelPrice ? dizelPrice.toString() : '');
    setPriceBenzin(benzinPrice ? benzinPrice.toString() : '');
    setPriceLpg(lpgPrice ? lpgPrice.toString() : '');
    setPriceAdblue(adbluePrice ? adbluePrice.toString() : '');
    setPriceElektrik(elektrikPrice ? elektrikPrice.toString() : '');

    setFormPhotoUri(s.brandLogo || null); // Show brandLogo as current photo
    setFormPhotoBase64(null);

    // Load services
    const currentSvcs: Record<string, boolean> = {};
    serviceKeys.forEach(sk => {
      currentSvcs[sk.key] = s.services?.some((item: any) => item.serviceType === sk.key) || false;
    });
    setFormServices(currentSvcs);

    setEditModalVisible(true);
  };

  const handleSaveStation = async () => {
    if (!formName || !formAddress) {
      Alert.alert('Hata', 'Lütfen İstasyon Adı ve Adres alanlarını doldurun.');
      return;
    }

    const pricePayload = [
      { fuelType: 'motorin', price: parseFloat(priceDizel) || 0 },
      { fuelType: 'kursunsuz', price: parseFloat(priceBenzin) || 0 },
      { fuelType: 'lpg', price: parseFloat(priceLpg) || 0 },
      { fuelType: 'adblue', price: parseFloat(priceAdblue) || 0 },
      { fuelType: 'elektrik_sarj', price: parseFloat(priceElektrik) || 0 },
    ].filter(p => p.price > 0);

    const servicePayload = Object.keys(formServices)
      .filter(key => formServices[key])
      .map(key => key);

    const payload = {
      name: formName,
      brand: formBrand,
      brandColor: getBrandColor(formBrand),
      fullAddress: formAddress,
      latitude: parseFloat(formLat) || 40.7854,
      longitude: parseFloat(formLng) || 31.3021,
      phone: formPhone,
      workingHoursText: formWorkingHours,
      is247: formWorkingHours.toLowerCase().includes('24') || formWorkingHours.toLowerCase().includes('7'),
      parkingCapacity: parseInt(formCapacity) || 0,
      brandLogo: formPhotoBase64 || formPhotoUri || null, // store image base64
      prices: pricePayload,
      services: servicePayload,
    };

    try {
      if (editMode && selectedStationForEdit) {
        await fuelStationService.update(selectedStationForEdit.id, payload);
        Alert.alert('Başarılı', 'İstasyon başarıyla güncellendi.');
      } else {
        await fuelStationService.create(payload);
        Alert.alert('Başarılı', 'Yeni istasyon başarıyla eklendi.');
      }
      setEditModalVisible(false);
      fetchStations();
    } catch (err) {
      Alert.alert('Hata', 'İstasyon kaydedilirken bir hata oluştu.');
      console.log(err);
    }
  };

  const handleDeleteStation = (s: any) => {
    Alert.alert(
      'İstasyonu Sil',
      'Bu istasyonu silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await fuelStationService.delete(s.id);
              Alert.alert('Başarılı', 'İstasyon başarıyla silindi.');
              setExpandedStationId(null);
              fetchStations();
            } catch (err) {
              Alert.alert('Hata', 'İstasyon silinirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleReportPriceSubmit = async () => {
    if (!newPrice || isNaN(parseFloat(newPrice))) {
      Alert.alert('Hata', 'Lütfen geçerli bir fiyat girin.');
      return;
    }
    try {
      await fuelStationService.reportPrice(selectedStationForPrice.id, {
        fuelType: selectedFuelType.toLowerCase() === 'motorin' ? 'motorin' : selectedFuelType.toLowerCase() === 'benzin' ? 'kursunsuz' : 'lpg',
        price: parseFloat(newPrice),
      });
      Alert.alert('Teşekkürler!', 'Fiyat güncellemesi başarıyla kaydedildi.');
      setPriceModalVisible(false);
      setNewPrice('');
      fetchStations();
    } catch (err) {
      Alert.alert('Hata', 'Fiyat bildirilemedi.');
    }
  };

  const handleAddReviewSubmit = async () => {
    if (!comment) {
      Alert.alert('Hata', 'Lütfen bir yorum yazın.');
      return;
    }
    try {
      await fuelStationService.addReview(selectedStationForReview.id, rating, comment);
      Alert.alert('Başarılı', 'Yorumunuz başarıyla kaydedildi.');
      setReviewModalVisible(false);
      setComment('');
      fetchStations();
    } catch (err) {
      Alert.alert('Hata', 'Yorum kaydedilemedi.');
    }
  };

  const getBrandColor = (brandName: string) => {
    switch (brandName?.toLowerCase()) {
      case 'opet': return '#005EA9';
      case 'shell': return '#FFD500';
      case 'bp': return '#009A44';
      case 'petrol ofisi': return '#E30613';
      case 'total': return '#FF5A00';
      default: return '#FF6B00';
    }
  };

  const getFuelPriceText = (pricesList: any[], typeName: string) => {
    const found = pricesList?.find(p => p.fuelType === typeName);
    return found?.price != null ? `${Number(found.price).toFixed(2)} ₺` : 'N/A';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#0ea5e9' }]}
            onPress={() => setSearchModalVisible(true)}
          >
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>🔍 Arama Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleGuestGuard(handleOpenAdd)}
          >
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>➕ İstasyon Ekle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Search Banner */}
      {isSearched && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: colors.card, 
          padding: spacing.sm, 
          marginHorizontal: spacing.lg, 
          borderRadius: radius.md, 
          marginBottom: spacing.xs, 
          borderWidth: 1, 
          borderColor: '#FF6B00' 
        }}>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
            Arama Sonucu: "{searchQuery}"
          </Text>
          <TouchableOpacity onPress={handleClearSearch}>
            <Text style={{ color: '#E30613', fontWeight: '800', fontSize: 12 }}>Temizle [X]</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonLoader width={48} height={48} borderRadius={radius.md} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <SkeletonLoader width="70%" height={20} borderRadius={radius.sm} style={{ marginBottom: spacing.xs }} />
                  <SkeletonLoader width="40%" height={14} borderRadius={radius.sm} />
                </View>
                <SkeletonLoader width={40} height={20} borderRadius={radius.sm} />
              </View>
            </Card>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
          {/* EX-010: EPDK Reference Prices Card */}
          {epdkData?.epdk && (
            <Card accentColor={colors.info} style={{ marginBottom: spacing.md, marginHorizontal: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>⛽ EPDK Referans Fiyatları</Text>
                <Text style={[typography.small, { color: colors.textTertiary }]}>
                  {new Date(epdkData.epdk.updatedAt).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {[
                  { label: 'Motorin', key: 'motorin', val: epdkData.epdk.motorin },
                  { label: 'Benzin', key: 'kursunsuz', val: epdkData.epdk.benzin },
                  { label: 'LPG', key: 'lpg', val: epdkData.epdk.lpg },
                ].map(f => (
                  <View key={f.key} style={{ flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm }}>
                    <Text style={[typography.small, { color: colors.textTertiary }]}>{f.label}</Text>
                    <Text style={[typography.h3, { color: colors.info, fontWeight: '800' }]}>{f.val} ₺</Text>
                  </View>
                ))}
              </View>
              {epdkData.staleStationCount > 0 && (
                <View style={[styles.staleWarning, { backgroundColor: colors.warning + '15', marginTop: spacing.sm }]}>
                  <Text style={[typography.small, { color: colors.warning, fontWeight: '600' }]}>
                    ⚠️ {epdkData.staleStationCount} istasyonun fiyatı 24 saatten eskimiş
                  </Text>
                </View>
              )}
            </Card>
          )}

          {stations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Kayıt Bulunamadı</Text>
            </View>
          ) : (
            stations.map((s, idx) => {
              const isExpanded = expandedStationId === s.id;
              const accentColor = getBrandColor(s.brand);
              const motorinPrice = getFuelPriceText(s.prices, 'motorin');

              return (
                <Card 
                  key={s.id || idx} 
                  accentColor={accentColor} 
                  style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}
                >
                  {/* ACCORDION HEADER (CLICKABLE ROW) */}
                  <TouchableOpacity 
                    style={styles.accordionHeader} 
                    onPress={() => setExpandedStationId(isExpanded ? null : s.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.headerLeft}>
                      <View style={[styles.brandBadge, { backgroundColor: accentColor }]}>
                        <Text style={styles.brandBadgeText}>{s.brand?.substring(0, 2).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        {/* EX-010: Staleness badge */}
                      {(() => {
                        const stale = getPriceStaleness(s);
                        if (stale?.isVeryStale) return (
                          <View style={[styles.staleBadge, { backgroundColor: colors.danger + '20' }]}>
                            <Text style={[styles.staleBadgeText, { color: colors.danger }]}>⚠{stale.hours}s</Text>
                          </View>
                        );
                        if (stale?.isStale) return (
                          <View style={[styles.staleBadge, { backgroundColor: colors.warning + '20' }]}>
                            <Text style={[styles.staleBadgeText, { color: colors.warning }]}>⌛{stale.hours}s</Text>
                          </View>
                        );
                        return null;
                      })()}
                      <Text style={[typography.title, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text style={[typography.small, { color: colors.textSecondary }]}>
                          📍 {s.district || s.districtName || 'Merkez'}, {s.city || s.cityName || 'Türkiye'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.headerRight}>
                      <Text style={styles.distanceText}>{s.distanceKm} km</Text>
                      <Text style={{ fontSize: 16, color: colors.textSecondary, marginLeft: spacing.xs }}>
                        {isExpanded ? '▲' : '▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* ACCORDION EXPANDABLE BODY */}
                  {isExpanded && (
                    <View style={styles.accordionBody}>
                      {/* Photo Display */}
                      {s.brandLogo ? (
                        <Image 
                          source={{ uri: s.brandLogo }} 
                          style={styles.stationImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.stationImageFallback, { backgroundColor: accentColor + '15', borderColor: accentColor }]}>
                          <Text style={{ fontSize: 48 }}>⛽</Text>
                          <Text style={{ color: colors.text, fontWeight: '700', marginTop: 4 }}>{s.brand}</Text>
                        </View>
                      )}

                      {s.description && (
                        <Text style={[typography.caption, { color: colors.text, marginTop: spacing.md, lineHeight: 18 }]}>
                          {s.description}
                        </Text>
                      )}

                      {/* Station Info Details */}
                      <View style={styles.detailGrid}>
                        {s.phone && (
                          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                            📞 İletişim: <Text style={{ color: colors.text }}>{s.phone}</Text>
                          </Text>
                        )}
                        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                          🕒 Çalışma Saatleri: <Text style={{ color: colors.text }}>{s.workingHoursText || (s.is247 ? '7/24 Açık' : 'Belirtilmedi')}</Text>
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                          🚛 TIR Parkı Kapasitesi: <Text style={{ color: colors.text, fontWeight: '700' }}>{s.parkingCapacity || 0} araç</Text>
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                          🏠 Tam Adres: <Text style={{ color: colors.text }}>{s.fullAddress}</Text>
                        </Text>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
                          onPress={() => {
                            setSelectedStationForMap(s);
                            setMapModalVisible(true);
                          }}
                        >
                          <Text style={{ fontSize: 18, marginRight: 6 }}>📍</Text>
                          <Text style={{ color: '#FF6B00', fontWeight: '800', textDecorationLine: 'underline', fontSize: 12 }}>
                            Konum için tıklayınız
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Prices Table Title */}
                      <Text style={[typography.label, { color: '#FF6B00', fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.xs }]}>
                        💳 Akaryakıt Fiyatları
                      </Text>

                      {/* Sleek Fiyat Grid */}
                      <View style={styles.priceGrid}>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Motorin Fiyatı:</Text>
                          <Text style={styles.priceValue}>{getFuelPriceText(s.prices, 'motorin')}</Text>
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Benzin Fiyatı:</Text>
                          <Text style={styles.priceValue}>{getFuelPriceText(s.prices, 'kursunsuz')}</Text>
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>LPG Fiyatı:</Text>
                          <Text style={styles.priceValue}>{getFuelPriceText(s.prices, 'lpg')}</Text>
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>AdBlue Fiyatı:</Text>
                          <Text style={styles.priceValue}>{getFuelPriceText(s.prices, 'adblue')}</Text>
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Elektrikli Şarj kW Fiyatı:</Text>
                          <Text style={styles.priceValue}>{getFuelPriceText(s.prices, 'elektrik_sarj')}</Text>
                        </View>
                      </View>

                      {/* Services Badge Row */}
                      <Text style={[typography.label, { color: '#FF6B00', fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.xs }]}>
                        🛠️ Sunulan Hizmetler
                      </Text>
                      <View style={styles.servicesGrid}>
                        {s.services && s.services.length > 0 ? (
                          s.services.map((svc: any, sIdx: number) => {
                            const foundSvc = serviceKeys.find(sk => sk.key === svc.serviceType);
                            return (
                              <View key={sIdx} style={[styles.servicePill, { backgroundColor: colors.background }]}>
                                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>
                                  {foundSvc ? foundSvc.label : `✓ ${svc.serviceType}`}
                                </Text>
                              </View>
                            );
                          })
                        ) : (
                          <Text style={[typography.caption, { color: colors.textTertiary }]}>Hizmet bilgisi girilmemiş.</Text>
                        )}
                      </View>

                      {/* Action Buttons Row */}
                      <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity 
                          style={[styles.miniActionBtn, { borderColor: colors.border }]}
                          onPress={() => handleGuestGuard(() => {
                            setSelectedStationForPrice(s);
                            setPriceModalVisible(true);
                          })}
                        >
                          <Text style={[styles.miniActionBtnText, { color: colors.text }]}>✍️ Fiyat Bildir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.miniActionBtn, { borderColor: colors.border }]}
                          onPress={() => handleGuestGuard(() => {
                            setSelectedStationForReview(s);
                            setReviewModalVisible(true);
                          })}
                        >
                          <Text style={[styles.miniActionBtnText, { color: colors.text }]}>⭐ Değerlendir</Text>
                        </TouchableOpacity>

                        {/* Owner / SuperAdmin Edit & Delete buttons */}
                        {(!isGuest && (user?.role === 'SUPER_ADMIN' || s.createdById === user?.id)) && (
                          <>
                            <TouchableOpacity 
                              style={[styles.miniActionBtn, { borderColor: '#E30613' }]}
                              onPress={() => handleGuestGuard(() => handleDeleteStation(s))}
                            >
                              <Text style={[styles.miniActionBtnText, { color: '#E30613' }]}>🗑️ Sil</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[styles.miniActionBtn, { borderColor: '#FF6B00' }]}
                              onPress={() => handleGuestGuard(() => handleOpenEdit(s))}
                            >
                              <Text style={[styles.miniActionBtnText, { color: '#FF6B00' }]}>✏️ Düzenle</Text>
                            </TouchableOpacity>

                            {/* EX-010: Price History & Bulk Import */}
                            <TouchableOpacity
                              style={[styles.miniActionBtn, { borderColor: colors.info }]}
                              onPress={() => handleGuestGuard(() => {
                                setHistoryModalStationId(s.id);
                                setHistoryFuelType('motorin');
                              })}
                            >
                              <Text style={[styles.miniActionBtnText, { color: colors.info }]}>📊 Geçmiş</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.miniActionBtn, { borderColor: colors.success }]}
                              onPress={() => handleGuestGuard(() => {
                                setBulkStationId(s.id);
                                setBulkPrices([
                                  { fuelType: 'motorin', price: '' }, { fuelType: 'kursunsuz', price: '' },
                                  { fuelType: 'lpg', price: '' }, { fuelType: 'adblue', price: '' },
                                ]);
                                setShowBulkImport(true);
                              })}
                            >
                              <Text style={[styles.miniActionBtnText, { color: colors.success }]}>📋 Toplu</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      {/* EX-010: Price History Chart (expandable) */}
                      {historyModalStationId === s.id && (
                        <View style={[styles.historySection, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>📊 Fiyat Geçmişi</Text>
                            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                              {['motorin', 'lpg', 'kursunsuz'].map(ft => (
                                <TouchableOpacity
                                  key={ft}
                                  style={[styles.fuelTypeChip, { borderColor: colors.border, backgroundColor: historyFuelType === ft ? colors.primary + '20' : 'transparent' }]}
                                  onPress={() => setHistoryFuelType(ft)}
                                >
                                  <Text style={[typography.small, { color: historyFuelType === ft ? colors.primary : colors.textTertiary }]}>
                                    {ft === 'motorin' ? 'Dizel' : ft === 'lpg' ? 'LPG' : 'Benzin'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                          <FuelPriceHistoryChart stationId={s.id} fuelType={historyFuelType} />
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* EX-010: Bulk Import Modal */}
      <Modal visible={showBulkImport} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>📋 Toplu Fiyat Güncelle</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              İstasyona ait tüm yakıt fiyatlarını tek seferde güncelleyin.
            </Text>
            {bulkPrices.map((bp, i) => (
              <View key={bp.fuelType} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm }}>
                <Text style={[typography.body, { color: colors.text, width: 70 }]}>
                  {bp.fuelType === 'motorin' ? 'Motorin' : bp.fuelType === 'kursunsuz' ? 'Benzin' : bp.fuelType === 'lpg' ? 'LPG' : 'AdBlue'}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, flex: 1 }]}
                  value={bp.price}
                  onChangeText={(t) => {
                    const updated = [...bulkPrices];
                    updated[i].price = t;
                    setBulkPrices(updated);
                  }}
                  placeholder="Fiyat (₺)"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
                <Text style={[typography.caption, { color: colors.textTertiary }]}>₺/L</Text>
              </View>
            ))}
            {/* EPDK reference */}
            {epdkData?.epdk && (
              <View style={[styles.epdkRef, { backgroundColor: colors.info + '10' }]}>
                <Text style={[typography.small, { color: colors.info, fontWeight: '600' }]}>
                  EPDK Tavan: Motorin {epdkData.epdk.motorin} ₺ | Benzin {epdkData.epdk.benzin} ₺ | LPG {epdkData.epdk.lpg} ₺
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setShowBulkImport(false)}>
                <Text style={[typography.label, { color: colors.textTertiary }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: colors.success }]} onPress={handleBulkImport}>
                <Text style={[typography.label, { color: colors.white }]}>Toplu Güncelle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Price Report Modal */}
      <Modal visible={priceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>✍️ Akaryakıt Fiyatı Bildir</Text>
            {selectedStationForPrice && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                {selectedStationForPrice.name} istasyonu için güncel fiyat girin.
              </Text>
            )}

            <View style={styles.modalRadioGroup}>
              {['MOTORIN', 'BENZIN', 'LPG'].map(f => (
                <TouchableOpacity 
                  key={f}
                  style={[styles.modalRadioBtn, selectedFuelType === f && { backgroundColor: '#FF6B00' }]}
                  onPress={() => setSelectedFuelType(f)}
                >
                  <Text style={{ color: selectedFuelType === f ? '#FFF' : colors.text, fontWeight: '700', fontSize: 11 }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput 
              style={[styles.priceInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Örn: 42.10"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              value={newPrice}
              onChangeText={setNewPrice}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalCancel, { borderColor: colors.border }]} 
                onPress={() => setPriceModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleReportPriceSubmit}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>⭐ Değerlendir & Yorum Yaz</Text>
            {selectedStationForReview && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                {selectedStationForReview.name} tesisi hakkında görüşlerinizi paylaşın.
              </Text>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Text style={{ fontSize: 32, marginHorizontal: 4 }}>
                    {star <= rating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput 
              style={[styles.reviewInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Duş temizliği, tır otoparkı güvenliği vb. konularda yorum yazın..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalCancel, { borderColor: colors.border }]} 
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleAddReviewSubmit}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Yayınla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Station Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView 
              style={{ width: '100%' }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
                  {editMode ? '✏️ İstasyonu Düzenle' : '➕ Yeni İstasyon Ekle'}
                </Text>

                {/* Photo Picker Section */}
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Görsel Yükle:</Text>
                <TouchableOpacity 
                  style={[styles.imagePickerBox, { borderColor: colors.border }]}
                  onPress={handlePickImage}
                  activeOpacity={0.7}
                >
                  {formPhotoUri ? (
                    <Image source={{ uri: formPhotoUri }} style={styles.imagePickerPreview} resizeMode="cover" />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 28 }}>📸</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>Galeri / Kameradan Seç (Max 2MB)</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 4 }]}>İstasyon Adı (Zorunlu):</Text>
                <TextInput 
                  style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Örn: Opet Hendek Tesisleri"
                  placeholderTextColor={colors.textTertiary}
                  value={formName}
                  onChangeText={setFormName}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: 4 }}>
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>Konum Koordinatları:</Text>
                  <TouchableOpacity onPress={handleGetLocationForForm}>
                    <Text style={{ color: '#FF6B00', fontWeight: '800', textDecorationLine: 'underline', fontSize: 12 }}>
                      [Konum Seç]
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 2 }}>Enlem (Latitude):</Text>
                    <TextInput 
                      style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="Örn: 40.7854"
                      placeholderTextColor={colors.textTertiary}
                      value={formLat}
                      onChangeText={setFormLat}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.xs }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 2 }}>Boylam (Longitude):</Text>
                    <TextInput 
                      style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="Örn: 31.3021"
                      placeholderTextColor={colors.textTertiary}
                      value={formLng}
                      onChangeText={setFormLng}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 4 }]}>Adres (Zorunlu):</Text>
                <TextInput 
                  style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Örn: Hendek Geçişi TEM Otobanı, Sakarya"
                  placeholderTextColor={colors.textTertiary}
                  value={formAddress}
                  onChangeText={setFormAddress}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Çalışma Saatleri:</Text>
                    <TextInput 
                      style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="Örn: 7/24 Açık"
                      placeholderTextColor={colors.textTertiary}
                      value={formWorkingHours}
                      onChangeText={setFormWorkingHours}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.xs }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>İletişim Tel:</Text>
                    <PhoneInput
                      value={formPhone}
                      onChangeText={setFormPhone}
                    />
                  </View>
                </View>

                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 4 }]}>TIR Otopark Kapasitesi:</Text>
                <TextInput 
                  style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Örn: 80 tır sığabilir"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  value={formCapacity}
                  onChangeText={setFormCapacity}
                />

                {/* Prices list inside add modal */}
                <Text style={[typography.label, { color: '#FF6B00', fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.xs }]}>
                  💳 Akaryakıt Fiyat Girişi (TL/L veya TL/kW)
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <View style={{ width: '48%', marginVertical: 4 }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>Dizel (Motorin):</Text>
                    <TextInput 
                      style={[styles.miniFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="42.10"
                      keyboardType="numeric"
                      value={priceDizel}
                      onChangeText={setPriceDizel}
                    />
                  </View>
                  <View style={{ width: '48%', marginVertical: 4 }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>Benzin (Kurşunsuz):</Text>
                    <TextInput 
                      style={[styles.miniFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="43.50"
                      keyboardType="numeric"
                      value={priceBenzin}
                      onChangeText={setPriceBenzin}
                    />
                  </View>
                  <View style={{ width: '48%', marginVertical: 4 }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>LPG Otogaz:</Text>
                    <TextInput 
                      style={[styles.miniFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="21.20"
                      keyboardType="numeric"
                      value={priceLpg}
                      onChangeText={setPriceLpg}
                    />
                  </View>
                  <View style={{ width: '48%', marginVertical: 4 }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>AdBlue:</Text>
                    <TextInput 
                      style={[styles.miniFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="18.50"
                      keyboardType="numeric"
                      value={priceAdblue}
                      onChangeText={setPriceAdblue}
                    />
                  </View>
                  <View style={{ width: '48%', marginVertical: 4 }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>Elektrikli Şarj:</Text>
                    <TextInput 
                      style={[styles.miniFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="7.90"
                      keyboardType="numeric"
                      value={priceElektrik}
                      onChangeText={setPriceElektrik}
                    />
                  </View>
                </View>

                {/* Services Checkboxes */}
                <Text style={[typography.label, { color: '#FF6B00', fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.xs }]}>
                  🛠️ Tesis İmkanları / Hizmetleri
                </Text>
                <View style={styles.checkboxGrid}>
                  {serviceKeys.map(item => (
                    <TouchableOpacity 
                      key={item.key} 
                      style={[styles.checkboxBadge, formServices[item.key] && { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: '#FF6B00' }]}
                      onPress={() => setFormServices({
                        ...formServices,
                        [item.key]: !formServices[item.key]
                      })}
                    >
                      <Text style={{ color: formServices[item.key] ? '#FF6B00' : colors.text, fontSize: 11, fontWeight: '700' }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Modal Buttons */}
                <View style={[styles.modalButtons, { marginTop: spacing.lg }]}>
                  <TouchableOpacity 
                    style={[styles.modalCancel, { borderColor: colors.border }]} 
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={{ color: colors.textSecondary }}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveStation}>
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Harita Pop-Up Modalı */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mapModalVisible}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', height: '70%', backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={[typography.label, { color: colors.text, fontWeight: '800', flex: 1 }]} numberOfLines={1}>
                {selectedStationForMap?.name || 'İstasyon Konumu'}
              </Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#E30613', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md }}
                onPress={() => setMapModalVisible(false)}
              >
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {/* Map */}
            {selectedStationForMap && (
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: selectedStationForMap.latitude || 40.7854,
                  longitude: selectedStationForMap.longitude || 31.3021,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: selectedStationForMap.latitude || 40.7854,
                    longitude: selectedStationForMap.longitude || 31.3021,
                  }}
                  title={selectedStationForMap.name}
                  description={selectedStationForMap.fullAddress}
                />
              </MapView>
            )}
          </View>
        </View>
      </Modal>

      {/* Arama Modalı */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={searchModalVisible}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, fontWeight: '800' }]}>🔍 İstasyon Arama</Text>
            <TextInput
              style={{
                height: 48,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: colors.background,
                marginBottom: spacing.md,
              }}
              placeholder="İsim, adres veya hizmet..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginRight: spacing.xs,
                }}
                onPress={() => setSearchModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  backgroundColor: '#FF6B00',
                  borderRadius: radius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginLeft: spacing.xs,
                }}
                onPress={handleSearchSubmit}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>Ara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  distanceText: {
    color: '#FF6B00',
    fontWeight: '800',
    fontSize: 12,
  },
  accordionBody: {
    padding: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  stationImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  stationImageFallback: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  detailGrid: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  priceGrid: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  priceValue: {
    color: '#FF6B00',
    fontWeight: '800',
    fontSize: 13,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  servicePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  miniActionBtn: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginLeft: spacing.xs,
    marginBottom: spacing.xs,
  },
  miniActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalRadioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  modalRadioBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    height: 90,
    textAlignVertical: 'top',
    marginVertical: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  modalSubmit: {
    flex: 1,
    backgroundColor: '#FF6B00',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  imagePickerBox: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    overflow: 'hidden',
  },
  imagePickerPreview: {
    width: '100%',
    height: '100%',
  },
  brandSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalFormInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: 4,
    fontSize: 13,
    width: '100%',
  },
  miniFormInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 6,
    fontSize: 12,
    width: '100%',
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  checkboxBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  // EX-010 styles
  staleBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  staleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  staleWarning: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  historySection: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  fuelTypeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  epdkRef: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  modalInput: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 40,
    fontSize: 15,
  },
});
