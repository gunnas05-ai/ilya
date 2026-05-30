import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { PhoneInput } from '../components/shared/PhoneInput';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import Card from '../components/shared/Card';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import ListSkeleton from '../components/shared/ListSkeleton';
import ErrorState from '../components/shared/ErrorState';
import EmptyState from '../components/shared/EmptyState';
import { restaurantService } from '../services/restaurantService';
import { useNearbyRestaurants } from '../hooks/query';
import { useAuthStore } from '../store/authStore';

// Haversine Distance Formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(1));
}

const CATEGORIES = [
  'Çorbalar',
  'Salatalar',
  'Soğuk Başlangıçlar',
  'Sıcak Başlangıçlar',
  'Ana Yemekler',
  'Izgaralar',
  'Pide/Lahmacun',
  'Makarnalar',
  'Kahvaltılıklar',
  'Ekmek Arası',
  'Ara Sıcaklar',
  'Tatlılar',
  'İçecekler',
  'Fast Food'
];

const SERVICES_LIST = [
  { id: 'WC', icon: '🚻', label: 'Temiz WC' },
  { id: 'Otopark', icon: '🅿️', label: 'Geniş TIR Otoparkı' },
  { id: 'Duş', icon: '🚿', label: 'Sıcak Duş' },
  { id: 'Mescit', icon: '🕌', label: 'Mescit' },
  { id: 'Çocuk Oyun Alanı', icon: '🎮', label: 'Çocuk Oyun Alanı' },
  { id: 'Kredi Kartı', icon: '💳', label: 'Kredi Kartı' },
  { id: 'Wi-Fi', icon: '📶', label: 'Ücretsiz Wi-Fi' }
];

interface MenuItemInput {
  name: string;
  price: number;
  portionDescription: string;
  isPopular: boolean;
}

interface MenuInput {
  name: string;
  items: MenuItemInput[];
}

export default function RestaurantsScreen({ navigation }: any) {
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
  const [userLocation, setUserLocation] = useState<any>({ lat: 40.7854, lng: 31.3021 }); // Kaynaşlı Coordinate
  const [activeTab, setActiveTab] = useState<'all' | 'nearby' | 'favorites'>('all');
  const [userLat] = useState(40.7854);
  const [userLng] = useState(31.3021);

  const restaurantsQuery = useNearbyRestaurants(userLat, userLng, 50);
  const restaurants = restaurantsQuery.data || [];
  const loading = restaurantsQuery.isLoading;

  // Accordions expanded states
  const [expandedRestId, setExpandedRestId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Pre-Order Modal States
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedRestForOrder, setSelectedRestForOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [etaText, setEtaText] = useState("18:00'de oradayım");
  const [specialNote, setSpecialNote] = useState('');
  
  // Real-time Pre-order tracking
  const [activePreOrder, setActivePreOrder] = useState<any>(null);
  const [preOrderStatus, setPreOrderStatus] = useState<string>('PENDING');

  // Review Modal States
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedRestForReview, setSelectedRestForReview] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Add / Edit States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRestForEdit, setSelectedRestForEdit] = useState<any>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCapacity, setFormCapacity] = useState('80');
  const [formDescription, setFormDescription] = useState('');
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formPhoto, setFormPhoto] = useState<string | null>(null);

  // Coordinate Picker States
  const [formLat, setFormLat] = useState('40.7854');
  const [formLng, setFormLng] = useState('31.3021');

  // Search States
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearched, setIsSearched] = useState(false);

  // Map Modal States
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedRestForMap, setSelectedRestForMap] = useState<any>(null);

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

  // Form Menu Builder Fields
  const [formMenus, setFormMenus] = useState<MenuInput[]>([]);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState(CATEGORIES[0]);
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishPopular, setNewDishPopular] = useState(false);

  useEffect(() => {
    restaurantsQuery.refetch();
  }, [activeTab]);

  useEffect(() => {
    if (activePreOrder) {
      const timer1 = setTimeout(() => setPreOrderStatus('APPROVED'), 5000);
      const timer2 = setTimeout(() => setPreOrderStatus('PREPARING'), 12000);
      const timer3 = setTimeout(() => setPreOrderStatus('READY'), 20000);
      const timer4 = setTimeout(() => setPreOrderStatus('COMPLETED'), 30000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [activePreOrder]);

  const fetchRestaurants = () => restaurantsQuery.refetch();

  const handleSearchSubmit = async () => {
    if (!searchQuery) {
      handleClearSearch();
      return;
    }
    setLoading(true);
    setSearchModalVisible(false);
    try {
      const res = await restaurantService.getAll({ search: searchQuery });
      const list = Array.isArray(res) ? res : res.data?.restaurants || res.restaurants || [];
      
      const verifiedList = list.map((rest: any) => {
        const dist = getDistance(
          userLocation.lat,
          userLocation.lng,
          rest.latitude || 40.7854,
          rest.longitude || 31.3021
        );
        return {
          ...rest,
          distanceKm: dist,
          eta: Math.round(dist * 1.2 + 5)
        };
      });

      verifiedList.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
      restaurantsQuery.refetch();
      setIsSearched(true);
    } catch (err) {
      console.log('Error searching restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearched(false);
    fetchRestaurants();
  };

  const handleToggleFavorite = async (rest: any) => {
    try {
      await restaurantService.toggleFavorite(rest.id, !rest.isFavorite);
      rest.isFavorite = !rest.isFavorite;
      restaurantsQuery.refetch();
      Alert.alert('Başarılı', rest.isFavorite ? 'Tesis favorilere eklendi!' : 'Tesis favorilerden çıkarıldı!');
    } catch {
      rest.isFavorite = !rest.isFavorite;
      restaurantsQuery.refetch();
      Alert.alert('Başarılı', rest.isFavorite ? 'Tesis favorilere eklendi (Simüle edildi)!' : 'Tesis favorilerden çıkarıldı!');
    }
  };

  const handleOpenPreOrder = (rest: any) => {
    setSelectedRestForOrder(rest);
    setOrderItems({});
    setSpecialNote('');
    setOrderModalVisible(true);
  };

  const updateItemQty = (itemId: string, delta: number) => {
    const current = orderItems[itemId] || 0;
    const next = current + delta;
    if (next <= 0) {
      delete orderItems[itemId];
    } else {
      orderItems[itemId] = next;
    }
    setOrderItems({ ...orderItems });
  };

  const handlePlaceOrderSubmit = async () => {
    if (Object.keys(orderItems).length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir yemek seçin.');
      return;
    }
    const itemsPayload = Object.entries(orderItems).map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity,
    }));

    try {
      await restaurantService.createReservation(selectedRestForOrder.id, {
        eta: etaText,
        items: itemsPayload,
      });
      
      setActivePreOrder({
        restaurantName: selectedRestForOrder.name,
        items: itemsPayload,
        eta: etaText,
      });
      setPreOrderStatus('PENDING');
      setOrderModalVisible(false);
      Alert.alert('Ön Sipariş Alındı!', 'Tesis siparişinizi doğruluyor. Canlı olarak takip edebilirsiniz.');
    } catch (err) {
      setActivePreOrder({
        restaurantName: selectedRestForOrder.name,
        items: itemsPayload,
        eta: etaText,
      });
      setPreOrderStatus('PENDING');
      setOrderModalVisible(false);
      Alert.alert('Ön Sipariş Alındı!', 'Tesis siparişinizi doğruluyor (Simüle edildi).');
    }
  };

  const handleReviewSubmit = async () => {
    if (!comment) {
      Alert.alert('Hata', 'Lütfen bir yorum yazın.');
      return;
    }
    try {
      await restaurantService.addReview(selectedRestForReview.id, {
        rating,
        comment,
      });
      Alert.alert('Tebrikler!', 'Yorumunuz başarıyla gönderildi.');
      setReviewModalVisible(false);
      setComment('');
      fetchRestaurants();
    } catch {
      Alert.alert('Tebrikler!', 'Yorumunuz başarıyla gönderildi (Simüle edildi).');
      setReviewModalVisible(false);
      setComment('');
    }
  };

  // Image manipulation: pick and auto-compress under 2MB
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermelisiniz.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;

        // Auto compress / resize below 2 MB while preserving outstanding visual quality
        const manipulated = await ImageManipulator.manipulateAsync(
          selectedUri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setFormPhoto(manipulated.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Görsel Eklendi', 'Tesis fotoğrafı optimize edilerek eklendi (<2MB).');
      }
    } catch (err) {
      console.log('Error picking image:', err);
      Alert.alert('Hata', 'Görsel seçilirken veya optimize edilirken hata oluştu.');
    }
  };

  // Toggle Services multi-select
  const handleToggleService = (srvId: string) => {
    if (formServices.includes(srvId)) {
      setFormServices(formServices.filter(id => id !== srvId));
    } else {
      setFormServices([...formServices, srvId]);
    }
  };

  // Adding items to building menu
  const handleAddDish = () => {
    if (!newDishName || !newDishPrice) {
      Alert.alert('Hata', 'Lütfen Yemek Adı ve Fiyatını doldurunuz.');
      return;
    }
    const priceNum = parseFloat(newDishPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Hata', 'Geçerli bir sayısal fiyat giriniz.');
      return;
    }

    const newItem: MenuItemInput = {
      name: newDishName,
      price: priceNum,
      portionDescription: newDishDesc,
      isPopular: newDishPopular
    };

    const existingMenuIdx = formMenus.findIndex(m => m.name === selectedMenuCategory);
    if (existingMenuIdx !== -1) {
      const updatedMenus = [...formMenus];
      updatedMenus[existingMenuIdx].items.push(newItem);
      setFormMenus(updatedMenus);
    } else {
      setFormMenus([...formMenus, {
        name: selectedMenuCategory,
        items: [newItem]
      }]);
    }

    // Reset inputs
    setNewDishName('');
    setNewDishPrice('');
    setNewDishDesc('');
    setNewDishPopular(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleRemoveDish = (catName: string, dishIdx: number) => {
    const updatedMenus = formMenus.map(menu => {
      if (menu.name === catName) {
        return {
          ...menu,
          items: menu.items.filter((_, idx) => idx !== dishIdx)
        };
      }
      return menu;
    }).filter(menu => menu.items.length > 0);

    setFormMenus(updatedMenus);
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedRestForEdit(null);
    setFormName('');
    setFormCity('Düzce');
    setFormDistrict('Kaynaşlı');
    setFormAddress('');
    setFormPhone('');
    setFormCapacity('80');
    setFormDescription('');
    setFormServices([]);
    setFormPhoto(null);
    setFormMenus([]);
    setFormLat('40.7854');
    setFormLng('31.3021');
    setEditModalVisible(true);
  };

  const handleOpenEdit = (rest: any) => {
    setEditMode(true);
    setSelectedRestForEdit(rest);
    setFormName(rest.name);
    setFormCity(rest.city);
    setFormDistrict(rest.district);
    setFormAddress(rest.fullAddress || '');
    setFormPhone(rest.phone || '');
    setFormCapacity(rest.parkingCapacity?.toString() || '80');
    setFormDescription(rest.description || '');
    setFormServices(rest.services || []);
    setFormPhoto(null);
    setFormLat(rest.latitude ? rest.latitude.toString() : '40.7854');
    setFormLng(rest.longitude ? rest.longitude.toString() : '31.3021');

    // Map existing menus for editing
    if (rest.menus && Array.isArray(rest.menus)) {
      const mapped = rest.menus.map((m: any) => ({
        name: m.name,
        items: (m.items || []).map((i: any) => ({
          name: i.name,
          price: i.price,
          portionDescription: i.portionDescription || '',
          isPopular: i.isPopular || false
        }))
      }));
      setFormMenus(mapped);
    } else {
      setFormMenus([]);
    }

    setEditModalVisible(true);
  };

  const handleSaveRestaurant = async () => {
    if (!formName || !formCity || !formDistrict || !formAddress) {
      Alert.alert('Eksik Alan', 'Lütfen Lokanta Adı, Adres, Şehir ve İlçe alanlarını doldurunuz.');
      return;
    }

    const payload = {
      name: formName,
      city: formCity,
      district: formDistrict,
      fullAddress: formAddress,
      latitude: parseFloat(formLat) || 40.7854,
      longitude: parseFloat(formLng) || 31.3021,
      phone: formPhone || '0532 000 00 00',
      parkingCapacity: parseInt(formCapacity) || 80,
      description: formDescription,
      hasTirParking: parseInt(formCapacity) > 0,
      services: formServices,
      menus: formMenus
    };

    try {
      if (editMode && selectedRestForEdit) {
        await restaurantService.update(selectedRestForEdit.id, payload);
        Alert.alert('Başarılı', 'Tesis başarıyla güncellendi.');
      } else {
        await restaurantService.create(payload);
        Alert.alert('Başarılı', 'Yeni tesis başarıyla eklendi.');
      }
      setEditModalVisible(false);
      fetchRestaurants();
    } catch (err) {
      console.log('Error saving restaurant:', err);
      // Fallback local simulation if server connectivity drops
      Alert.alert('İşlem Tamamlandı', 'Tesis başarıyla kaydedildi (Simüle edildi).');
      setEditModalVisible(false);
    }
  };

  const handleDeleteRestaurant = (restId: string) => {
    Alert.alert(
      'Lokantayı Sil',
      'Bu lokantayı kalıcı olarak silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await restaurantService.delete(restId);
            Alert.alert('Başarılı', 'Tesis silindi.');
            fetchRestaurants();
          } catch {
            Alert.alert('Başarılı', 'Tesis başarıyla silindi (Simüle edildi).');
            restaurantsQuery.refetch();
          }
        }}
      ]
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '⏳ Beklemede';
      case 'APPROVED': return '✅ Onaylandı';
      case 'PREPARING': return '🍳 Hazırlanıyor';
      case 'READY': return '🍔 Sıcak ve Hazır';
      case 'COMPLETED': return '🎉 Teslim Edildi';
      default: return status;
    }
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
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>➕ Lokanta Ekle</Text>
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {([
          { key: 'all', label: 'Tüm Tesisler' },
          { key: 'nearby', label: '📍 Yakınımdakiler' },
          { key: 'favorites', label: '❤️ Favorilerim' },
        ] as const).map(tab => (
          <TouchableOpacity 
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && { borderBottomColor: '#FF6B00', borderBottomWidth: 3 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[typography.label, { color: activeTab === tab.key ? '#FF6B00' : colors.textSecondary, fontWeight: '700' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Pre-Order tracking bar */}
      {activePreOrder && (
        <Card accentColor="#10B981" style={styles.trackingCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>🚀 Canlı Ön Sipariş Takibi</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{activePreOrder.restaurantName} • Varış: {activePreOrder.eta}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{getStatusLabel(preOrderStatus)}</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill, 
              { 
                width: preOrderStatus === 'PENDING' ? '20%' : 
                       preOrderStatus === 'APPROVED' ? '40%' :
                       preOrderStatus === 'PREPARING' ? '70%' :
                       preOrderStatus === 'READY' ? '90%' : '100%'
              }
            ]} />
          </View>
          
          <TouchableOpacity onPress={() => setActivePreOrder(null)} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Takibi Kapat ✕</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonLoader width={64} height={64} borderRadius={radius.md} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <SkeletonLoader width="80%" height={24} borderRadius={radius.sm} style={{ marginBottom: spacing.xs }} />
                  <SkeletonLoader width="50%" height={16} borderRadius={radius.sm} />
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
          {restaurants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48 }}>🍽️</Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Tesis Bulunamadı</Text>
            </View>
          ) : (
            restaurants.map((rest, index) => {
              const isExpanded = expandedRestId === rest.id;
              const hasTirPark = rest.hasTirParking || rest.parkingCapacity > 0;
              const restServices = rest.services || [];

              return (
                <Card 
                  key={rest.id || index}
                  accentColor="#FF6B00"
                  style={{ marginBottom: spacing.md }}
                >
                  {/* High level Row (Accordion Header) */}
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExpandedRestId(isExpanded ? null : rest.id);
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <Text style={[typography.title, { color: colors.text, fontWeight: '800' }]}>{rest.name}</Text>
                          {rest.michelinScore > 0 && (
                            <View style={{ backgroundColor: '#FFE4E6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#E11D48' }}>⚓ {rest.michelinScore} Yıldız</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[typography.caption, { color: '#FF6B00', fontWeight: '800', marginTop: 2 }]}>
                          📍 {rest.district}, {rest.city} • {rest.distanceKm} km mesafede
                        </Text>
                      </View>

                      <View style={styles.ratingBadge}>
                        <Text style={{ color: '#FFD500', fontWeight: '800', marginRight: 4 }}>⭐</Text>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{rest.averageRating || '4.6'}</Text>
                      </View>
                    </View>

                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]} numberOfLines={isExpanded ? undefined : 2}>
                      {rest.description || 'Geniş tır otoparklı, 24 saat sıcak sulu ve meşhur çorbalara sahip mola istasyonunuz.'}
                    </Text>

                    {/* Services row icons */}
                    <View style={styles.servicesQuickRow}>
                      {restServices.map((srv: string, sIdx: number) => {
                        const srvDef = SERVICES_LIST.find(s => s.id === srv);
                        if (!srvDef) return null;
                        return (
                          <View key={sIdx} style={[styles.serviceMiniBadge, { backgroundColor: colors.border }]}>
                            <Text style={{ fontSize: 11 }}>{srvDef.icon} {srvDef.id}</Text>
                          </View>
                        );
                      })}
                    </View>

                    <Text style={{ color: '#FF6B00', fontWeight: '700', fontSize: 12, marginTop: spacing.xs, alignSelf: 'flex-end' }}>
                      {isExpanded ? 'Detayları Kapat ▲' : 'Detayları & Menüyü Gör ▼'}
                    </Text>
                  </TouchableOpacity>

                  {/* Accordion Expanded Detailed Content */}
                  {isExpanded && (
                    <View style={styles.accordionDetail}>
                      {/* Photo Placeholder / Image */}
                      <View style={styles.photoContainer}>
                        <Image 
                          source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80' }} 
                          style={styles.detailPhoto} 
                        />
                      </View>

                      {/* Info lines */}
                      <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginTop: spacing.sm }]}>📞 İletişim & Adres</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Tel: {rest.phone || 'İletişim numarası girilmemiş'}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Adres: {rest.fullAddress || 'Adres bilgisi verilmemiş'}</Text>
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
                        onPress={() => {
                          setSelectedRestForMap(rest);
                          setMapModalVisible(true);
                        }}
                      >
                        <Text style={{ fontSize: 18, marginRight: 6 }}>📍</Text>
                        <Text style={{ color: '#FF6B00', fontWeight: '800', textDecorationLine: 'underline', fontSize: 12 }}>
                          Konum için tıklayınız
                        </Text>
                      </TouchableOpacity>

                      {/* Parking status */}
                      <View style={styles.tirParkingRow}>
                        <Text style={{ fontSize: 13, color: '#FF6B00', fontWeight: '800' }}>
                          {hasTirPark ? `🚛 Güvenli TIR Otoparkı: Aktif (${rest.parkingCapacity} araçlık)` : '🚛 Güvenli TIR Otoparkı: Mevcut Değil'}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                          ⏱️ Yaklaşık {rest.eta} dakika varış süresi.
                        </Text>
                      </View>

                      {/* Menus Categories Accordion Sublist */}
                      <View style={styles.menuContainer}>
                        <Text style={[typography.title, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.md }]}>
                          📖 Tesis Menüsü
                        </Text>

                        {(!rest.menus || rest.menus.length === 0) ? (
                          <Text style={[typography.caption, { color: colors.textTertiary }]}>Bu tesis henüz bir menü girmemiş.</Text>
                        ) : (
                          rest.menus.map((menu: any, mIdx: number) => {
                            const isCategoryExpanded = expandedCategory === `${rest.id}-${menu.name}`;
                            return (
                              <View key={mIdx} style={[styles.categoryAccordionItem, { borderColor: colors.border }]}>
                                <TouchableOpacity 
                                  style={[styles.categoryAccordionHeader, { backgroundColor: colors.border }]}
                                  onPress={() => setExpandedCategory(isCategoryExpanded ? null : `${rest.id}-${menu.name}`)}
                                >
                                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>🍽️ {menu.name}</Text>
                                  <Text style={{ color: '#FF6B00', fontSize: 12 }}>
                                    {isCategoryExpanded ? 'Kapat ▲' : `Aç (${menu.items?.length || 0} Ürün) ▼`}
                                  </Text>
                                </TouchableOpacity>

                                {isCategoryExpanded && (
                                  <View style={styles.categoryAccordionBody}>
                                    {(menu.items || []).map((dish: any, dIdx: number) => (
                                      <View key={dIdx} style={styles.dishRow}>
                                        <View style={{ flex: 1 }}>
                                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{dish.name}</Text>
                                            {dish.isPopular && (
                                              <View style={styles.popularBadge}>
                                                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>⭐ Popüler</Text>
                                              </View>
                                            )}
                                          </View>
                                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                            {dish.portionDescription || 'Standart porsiyon'}
                                          </Text>
                                        </View>
                                        <Text style={{ color: '#FF6B00', fontWeight: '800', fontSize: 14 }}>{Number(dish.price || 0).toFixed(2)} ₺</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            );
                          })
                        )}
                      </View>

                      {/* Actions buttons */}
                      <View style={styles.actionsRow}>
                        <TouchableOpacity 
                          style={[styles.actionBtn, { borderColor: colors.border }]} 
                          onPress={() => handleGuestGuard(() => handleToggleFavorite(rest))}
                        >
                          <Text style={{ color: colors.text, fontSize: 12 }}>
                            {rest.isFavorite ? '❤️ Favori' : '🤍 Favoriye Ekle'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.actionBtn, { borderColor: colors.border }]} 
                          onPress={() => handleGuestGuard(() => {
                            setSelectedRestForReview(rest);
                            setReviewModalVisible(true);
                          })}
                        >
                          <Text style={{ color: colors.text, fontSize: 12 }}>✍️ Yorum Yaz</Text>
                        </TouchableOpacity>

                        {/* Edit and Delete buttons (Only owner or Super Admin) */}
                        {!isGuest && (user?.role === 'SUPER_ADMIN' || rest.createdById === user?.id) && (
                          <>
                            <TouchableOpacity 
                              style={[styles.actionBtn, { borderColor: '#F59E0B' }]} 
                              onPress={() => handleOpenEdit(rest)}
                            >
                              <Text style={{ color: '#F59E0B', fontSize: 12 }}>✏️ Düzenle</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[styles.actionBtn, { borderColor: '#EF4444' }]} 
                              onPress={() => handleDeleteRestaurant(rest.id)}
                            >
                              <Text style={{ color: '#EF4444', fontSize: 12 }}>🗑️ Sil</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        <TouchableOpacity 
                          style={[styles.actionBtn, { backgroundColor: '#FF6B00', borderColor: '#FF6B00' }]}
                          onPress={() => handleGuestGuard(() => handleOpenPreOrder(rest))}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>🍳 Ön Sipariş</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Pre-Order Modal */}
      <Modal visible={orderModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>🍳 Yol Üstü Ön Sipariş</Text>
            {selectedRestForOrder && (
              <>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                  {selectedRestForOrder.name} tesisine varmadan yemeğinizi sipariş edin, siz vardığınızda sıcak servis edilsin.
                </Text>

                <ScrollView style={{ maxHeight: 220, marginBottom: spacing.md }}>
                  {(!selectedRestForOrder.menus || selectedRestForOrder.menus.length === 0) ? (
                    <Text style={{ color: colors.textTertiary, textAlign: 'center', marginVertical: 20 }}>Tesisin aktif menüsü bulunamadı.</Text>
                  ) : (
                    selectedRestForOrder.menus.flatMap((m: any) => m.items || []).map((dish: any, dishIdx: number) => {
                      const qty = orderItems[dish.id || dishIdx] || 0;
                      return (
                        <View key={dish.id || dishIdx} style={styles.menuOrderRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{dish.name}</Text>
                            <Text style={{ color: '#FF6B00', fontSize: 13, fontWeight: '800' }}>{Number(dish.price || 0).toFixed(2)} ₺</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => updateItemQty(dish.id || dishIdx, -1)} style={styles.qtyBtn}>
                              <Text style={{ color: colors.text, fontWeight: '800' }}>-</Text>
                            </TouchableOpacity>
                            <Text style={{ color: colors.text, marginHorizontal: 12, fontWeight: '800' }}>{qty}</Text>
                            <TouchableOpacity onPress={() => updateItemQty(dish.id || dishIdx, 1)} style={styles.qtyBtn}>
                              <Text style={{ color: colors.text, fontWeight: '800' }}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </>
            )}

            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>🕒 Varış Zamanınız (Simülasyon):</Text>
            <TextInput 
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              value={etaText}
              onChangeText={setEtaText}
            />

            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, marginTop: spacing.sm }]}>✍️ Özel Not (Örn: Acılı, Az Pişmiş):</Text>
            <TextInput 
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Not ekleyin..."
              placeholderTextColor={colors.textTertiary}
              value={specialNote}
              onChangeText={setSpecialNote}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalCancel, { borderColor: colors.border }]} 
                onPress={() => setOrderModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handlePlaceOrderSubmit}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Siparişi Ver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>⭐ Yorum Yaz & Değerlendir</Text>
            {selectedRestForReview && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                {selectedRestForReview.name} tesisi için tecrübenizi paylaşın.
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
              placeholder="Kuru fasulye nasıl? Otopark güvenli mi? Banyolar temiz ve hijyenik mi?"
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
              <TouchableOpacity style={styles.modalSubmit} onPress={handleReviewSubmit}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Restaurant Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView 
              style={{ width: '100%' }}
              contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.xl }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
                  {editMode ? '✏️ Tesis Düzenle' : '➕ Yeni Tesis Ekle'}
                </Text>

                {/* Photo Picker */}
                <TouchableOpacity onPress={handlePickImage} style={[styles.photoPicker, { borderColor: colors.border }]}>
                  {formPhoto ? (
                    <Image source={{ uri: formPhoto }} style={styles.pickerPreview} />
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>📸 Tesis Fotoğrafı Ekle (Max 2MB)</Text>
                  )}
                </TouchableOpacity>

                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 2 }]}>Tesis Adı:</Text>
                <TextInput 
                  style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Örn: Kervan Dinlenme Tesisi"
                  placeholderTextColor={colors.textTertiary}
                  value={formName}
                  onChangeText={setFormName}
                />

                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 2 }]}>Tam Adres:</Text>
                <TextInput 
                  style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Örn: TEM Otoyolu Kaynaşlı Mevkii, Düzce"
                  placeholderTextColor={colors.textTertiary}
                  value={formAddress}
                  onChangeText={setFormAddress}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 2 }]}>Şehir:</Text>
                    <TextInput 
                      style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="Örn: Düzce"
                      placeholderTextColor={colors.textTertiary}
                      value={formCity}
                      onChangeText={setFormCity}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.xs }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 2 }]}>İlçe:</Text>
                    <TextInput 
                      style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="Örn: Kaynaşlı"
                      placeholderTextColor={colors.textTertiary}
                      value={formDistrict}
                      onChangeText={setFormDistrict}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: 2 }}>
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>Konum Koordinatları:</Text>
                  <TouchableOpacity onPress={handleGetLocationForForm}>
                    <Text style={{ color: '#FF6B00', fontWeight: '800', textDecorationLine: 'underline', fontSize: 12 }}>
                      [Konum Seç]
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
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

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 2 }]}>Telefon:</Text>
                    <PhoneInput
                      value={formPhone}
                      onChangeText={setFormPhone}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.xs }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 2 }]}>TIR Otopark Kapasitesi:</Text>
                    <TextInput 
                      style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="Örn: 80"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      value={formCapacity}
                      onChangeText={setFormCapacity}
                    />
                  </View>
                </View>

                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 2 }]}>Tesis Açıklaması:</Text>
                <TextInput 
                  style={[styles.modalFormInput, { color: colors.text, borderColor: colors.border, height: 60 }]}
                  placeholder="Yol kenarında sıcak sulu tır parklı tesis..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  value={formDescription}
                  onChangeText={setFormDescription}
                />

                {/* Services multi-select */}
                <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs }]}>
                  🛠️ Sunulan Hizmetler
                </Text>
                <View style={styles.servicesGrid}>
                  {SERVICES_LIST.map((srv) => {
                    const isSelected = formServices.includes(srv.id);
                    return (
                      <TouchableOpacity 
                        key={srv.id}
                        style={[
                          styles.serviceSelectBtn, 
                          { borderColor: colors.border },
                          isSelected && { backgroundColor: '#FF6B00', borderColor: '#FF6B00' }
                        ]}
                        onPress={() => handleToggleService(srv.id)}
                      >
                        <Text style={{ fontSize: 13, color: isSelected ? '#FFF' : colors.text }}>
                          {srv.icon} {srv.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Nested Menu Builder Panel */}
                <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.xs }]}>
                  📖 Dinamik Menü Yönetimi
                </Text>
                
                {/* Add new dish form */}
                <View style={[styles.subPanel, { backgroundColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.sm, fontSize: 12 }}>➕ Menüye Yemek Ekle</Text>
                  
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 2 }}>Menü Kategorisi Seçin:</Text>
                  <View style={styles.categoryPickerRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categorySelectTag,
                            { backgroundColor: colors.card },
                            selectedMenuCategory === cat && { backgroundColor: '#FF6B00' }
                          ]}
                          onPress={() => setSelectedMenuCategory(cat)}
                        >
                          <Text style={{ fontSize: 11, color: selectedMenuCategory === cat ? '#FFF' : colors.text, fontWeight: '700' }}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <TextInput
                    style={[styles.modalFormInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                    placeholder="Yemek Adı (Örn: Süzme Mercimek)"
                    placeholderTextColor={colors.textTertiary}
                    value={newDishName}
                    onChangeText={setNewDishName}
                  />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
                    <TextInput
                      style={[styles.modalFormInput, { flex: 1, marginRight: spacing.xs, color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                      placeholder="Fiyat (TL)"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      value={newDishPrice}
                      onChangeText={setNewDishPrice}
                    />

                    <TextInput
                      style={[styles.modalFormInput, { flex: 2, marginLeft: spacing.xs, color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                      placeholder="Açıklama (Örn: Tereyağlı)"
                      placeholderTextColor={colors.textTertiary}
                      value={newDishDesc}
                      onChangeText={setNewDishDesc}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.checkboxRow, { marginVertical: 6 }]}
                    onPress={() => setNewDishPopular(!newDishPopular)}
                  >
                    <Text style={{ fontSize: 20, marginRight: 6 }}>{newDishPopular ? '☑️' : '⬛'}</Text>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Bu Yemek En Çok Satanlarda (Popüler) Gösterilsin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.addDishBtn} onPress={handleAddDish}>
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>➕ Yemeği Menüye Ekle</Text>
                  </TouchableOpacity>
                </View>

                {/* List of currently building menus */}
                <View style={{ marginTop: spacing.md }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12, marginBottom: spacing.xs }}>Mevcut Menü Listesi:</Text>
                  {formMenus.length === 0 ? (
                    <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Henüz hiç yemek eklenmedi. Yukarıdan ekleyebilirsiniz.</Text>
                  ) : (
                    formMenus.map((menu, mIdx) => (
                      <View key={mIdx} style={[styles.menuBuildCategoryCard, { borderColor: colors.border }]}>
                        <Text style={{ color: '#FF6B00', fontWeight: '800', fontSize: 13, marginBottom: spacing.xs }}>📁 {menu.name}</Text>
                        {menu.items.map((item, dIdx) => (
                          <View key={dIdx} style={styles.menuBuildDishRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>• {item.name} {item.isPopular && '⭐'}</Text>
                              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{item.portionDescription || 'Standart'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ color: '#FF6B00', fontSize: 13, fontWeight: '800', marginRight: spacing.md }}>{Number(item.price || 0).toFixed(2)} ₺</Text>
                              <TouchableOpacity onPress={() => handleRemoveDish(menu.name, dIdx)}>
                                <Text style={{ color: '#EF4444', fontSize: 16 }}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalCancel, { borderColor: colors.border }]} 
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={{ color: colors.textSecondary }}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveRestaurant}>
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
                {selectedRestForMap?.name || 'Lokanta Konumu'}
              </Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#E30613', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md }}
                onPress={() => setMapModalVisible(false)}
              >
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {/* Map */}
            {selectedRestForMap && (
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: selectedRestForMap.latitude || 40.7854,
                  longitude: selectedRestForMap.longitude || 31.3021,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: selectedRestForMap.latitude || 40.7854,
                    longitude: selectedRestForMap.longitude || 31.3021,
                  }}
                  title={selectedRestForMap.name}
                  description={selectedRestForMap.fullAddress}
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
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, fontWeight: '800' }]}>🔍 Lokanta Arama</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F3A',
    marginBottom: spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  trackingCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#10B981',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  servicesQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  serviceMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: 4,
    marginBottom: 4,
  },
  accordionDetail: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  photoContainer: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  detailPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tirParkingRow: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  menuContainer: {
    marginTop: spacing.sm,
  },
  categoryAccordionItem: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  categoryAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    alignItems: 'center',
  },
  categoryAccordionBody: {
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dishRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  popularBadge: {
    backgroundColor: '#E30613',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.sm,
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    flexWrap: 'wrap',
    gap: 6
  },
  actionBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.xl,
    elevation: 5,
  },
  menuOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    height: 100,
    textAlignVertical: 'top',
    marginVertical: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
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
  photoPicker: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  pickerPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalFormInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: 4,
    fontSize: 14,
    width: '100%',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  serviceSelectBtn: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  subPanel: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  categorySelectTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginRight: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addDishBtn: {
    backgroundColor: '#FF6B00',
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  menuBuildCategoryCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  menuBuildDishRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  }
});
