import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Card from '../components/shared/Card';
import { useTheme } from '../hooks/useTheme';
import { useThemeStore } from '../store/themeStore';
import { spacing, radius, typography } from '../theme';
import { useTrackingStore } from '../store/trackingStore';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import LoginScreen from '../screens/LoginScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import LoadCreateWizard from '../screens/load-create/LoadCreateWizard';
import LoadTrackingScreen from '../screens/tracking/LoadTrackingScreen';
import LoadTrackingDetail from '../screens/tracking/LoadTrackingDetail';
import LoadAcceptScreen from '../screens/load-accept/LoadAcceptScreen';
import LoadAcceptDetail from '../screens/load-accept/LoadAcceptDetail';
import MyBidsScreen from '../screens/load-accept/MyBidsScreen';
import CarrierProfileScreen from '../screens/CarrierProfileScreen';
import ReturnLoadScreen from '../screens/ReturnLoadScreen';
import InvoiceListScreen from '../screens/gib/InvoiceListScreen';
import InvoiceCreateScreen from '../screens/gib/InvoiceCreateScreen';
import InvoiceDetailScreen from '../screens/gib/InvoiceDetailScreen';
import AccountantDashboardScreen from '../screens/gib/AccountantDashboardScreen';
import TaxDashboardScreen from '../screens/TaxDashboardScreen';
import FinanceDashboardScreen from '../screens/finance/FinanceDashboardScreen';
import ExpensesListScreen from '../screens/finance/ExpensesListScreen';
import AddExpenseScreen from '../screens/finance/AddExpenseScreen';
import FuelStationsScreen from '../screens/FuelStationsScreen';
import RestaurantsScreen from '../screens/RestaurantsScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatCreateScreen from '../screens/chat/ChatCreateScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import DuyuruYonetimScreen from '../screens/DuyuruYonetimScreen';
import DeliveryProofScreen from '../screens/DeliveryProofScreen';
import TruckNavigationScreen from '../screens/tracking/TruckNavigationScreen';
import DriveModeScreen from '../screens/DriveModeScreen';
import AiDialogScreen from '../screens/load-create/AiDialogScreen';
import WebhookManagementScreen from '../screens/settings/WebhookManagementScreen';
import ApiKeyManagementScreen from '../screens/settings/ApiKeyManagementScreen';
import AnalyticsDashboardScreen from '../screens/AnalyticsDashboardScreen';
import KitchenScreen from '../screens/KitchenScreen';
import PartMarketHomeScreen from '../screens/part-market/PartMarketHomeScreen';
import PartMarketSearchScreen from '../screens/part-market/PartMarketSearchScreen';
import PartListingDetailScreen from '../screens/part-market/PartListingDetailScreen';
import PartListingCreateScreen from '../screens/part-market/PartListingCreateScreen';
import MyPartListingsScreen from '../screens/part-market/MyPartListingsScreen';
import PartOffersScreen from '../screens/part-market/PartOffersScreen';
import PartTransactionScreen from '../screens/part-market/PartTransactionScreen';
import PartDisputeScreen from '../screens/part-market/PartDisputeScreen';
import PartReviewsScreen from '../screens/part-market/PartReviewsScreen';
import WalletScreen from '../screens/WalletScreen';
import CommissionConfigScreen from '../screens/admin/CommissionConfigScreen';
import PlanManagementScreen from '../screens/admin/PlanManagementScreen';
import CreditPackageScreen from '../screens/admin/CreditPackageScreen';
import SavedCardsScreen from '../screens/payment/SavedCardsScreen';
import SubscriptionScreen from '../screens/billing/SubscriptionScreen';
import BillingHistoryScreen from '../screens/billing/BillingHistoryScreen';
import CreditShopScreen from '../screens/billing/CreditShopScreen';
import HomeScreen from '../screens/HomeScreen';
import MyVehiclesScreen from '../screens/vehicles/MyVehiclesScreen';
import VehicleFormScreen from '../screens/vehicles/VehicleFormScreen';
import VehicleSaleScreen from '../screens/vehicles/VehicleSaleScreen';
import ListingDetailScreen from '../screens/vehicles/ListingDetailScreen';
import ListingsBrowseScreen from '../screens/vehicles/ListingsBrowseScreen';
import CategoryBrowseScreen from '../screens/vehicles/CategoryBrowseScreen';
import HeyKaptan from '../components/HeyKaptan';
import { connectSocket, disconnectSocket } from '../services/websocket';
import { useChatStore } from '../store/chatStore';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';


type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  LoadCreate: undefined;
  LoadTracking: undefined;
  LoadTrackingDetail: { loadId: string };
  LoadAcceptDetail: { loadId: string };
  MyBids: undefined;
  CarrierProfile: undefined;
  ReturnLoad: { deliveryLat: number; deliveryLng: number };
  InvoiceList: undefined;
  InvoiceCreate: undefined;
  InvoiceDetail: { invoiceId: string };
  AccountantDashboard: undefined;
  TaxDashboard: undefined;
  WebhookManagement: undefined;
  ApiKeyManagement: undefined;
  AnalyticsDashboard: undefined;
  AdminPanel: undefined;
  FuelStations: undefined;
  Restaurants: undefined;
  ChatList: undefined;
  ChatCreate: undefined;
  ChatRoom: { roomId: string };
  DeliveryProof: undefined;
  TruckNavigation: {
    loadId: string;
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    fromCity: string;
    toCity: string;
  };
  DriveMode: undefined;
  DuyuruYonetim: undefined;
  AiDialog: undefined;
  Finance: undefined;
  Kitchen: undefined;
  MyVehicles: undefined;
  VehicleForm: { vehicle?: string; editMode: boolean; missingFields?: string[] };
  VehicleSale: { vehicle: string };
  ListingDetail: { listingId: string };
  ListingsBrowse: undefined;
  CategoryBrowse: undefined;
  Wallet: undefined;
  SavedCards: undefined;
  Subscription: undefined;
  BillingHistory: undefined;
  CreditShop: undefined;
  CommissionConfig: undefined;
  PlanManagement: undefined;
  CreditPackageMgmt: undefined;
  PartMarketHome: undefined;
  PartMarketSearch: { query?: string; category?: string; categoryName?: string };
  PartListingDetail: { id: string };
  PartListingCreate: undefined;
  MyPartListings: undefined;
  PartOffers: undefined;
  PartTransaction: { listingId: string };
  PartDispute: { transactionId: string };
  PartReviews: { userId: string; userName?: string };
};


type TabParamList = {
  Home: undefined;
  LoadCreateTab: undefined;
  FAB: undefined;
  LoadAccept: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const CustomBackButton = ({ navigation, isDark, colors, onPressOverride }: { navigation: any, isDark: boolean, colors: any, onPressOverride?: () => void }) => {
  return (
    <TouchableOpacity
      onPress={() => {
        if (onPressOverride) {
          onPressOverride();
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Home');
        }
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: isDark ? colors.card : '#FFFFFF',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
        marginLeft: 8,
        marginVertical: 4,
        // Premium shadows for light/dark mode
        shadowColor: isDark ? '#FFFFFF' : '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.20,
        shadowRadius: 3.5,
        elevation: 4,
      }}
      activeOpacity={0.8}
    >
      <Text style={{ color: '#FF6B00', fontSize: 14, fontWeight: '700', lineHeight: 18 }}>
        Geri Don
      </Text>
    </TouchableOpacity>
  );
};

function LoadsScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text style={[typography.h2, { color: colors.text }]}>Yukler</Text>
    </View>
  );
}

type FinanceStackParamList = {
  FinanceDashboard: undefined;
  ExpensesList: undefined;
  AddExpense: undefined;
};

const FinanceStack = createNativeStackNavigator<FinanceStackParamList>();

function FinanceNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <FinanceStack.Navigator screenOptions={({ navigation }) => ({
      headerShown: true,
      headerLeft: () => (
        <CustomBackButton navigation={navigation} isDark={isDark} colors={colors} />
      ),
      headerTintColor: '#FF6B00',
      headerStyle: { backgroundColor: colors.card },
      headerTitleStyle: { color: colors.text },
    })}>
      <FinanceStack.Screen name="FinanceDashboard" component={FinanceDashboardScreen} options={{ title: 'Finansal Durum' }} />
      <FinanceStack.Screen name="ExpensesList" component={ExpensesListScreen} options={{ title: 'Gider Listesi' }} />
      <FinanceStack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Harcama Girişi' }} />
    </FinanceStack.Navigator>
  );
}

const ProfileMenuItem = ({ label, icon, onPress, colors, isDark }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        // Shadows
        shadowColor: isDark ? '#FFFFFF' : '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.20 : 0.12,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      {/* 00standart.txt Sol Dikey Durum Gostergesi */}
      <View style={{ width: 4, backgroundColor: '#FF6B00' }} />

      <View style={{ flex: 1, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, marginRight: spacing.md }}>{icon}</Text>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
        </View>
        <Text style={{ color: '#FF6B00', fontSize: 16, fontWeight: '700' }}>→</Text>
      </View>
    </TouchableOpacity>
  );
};

const ProfileStackNav = createNativeStackNavigator();

function ProfileNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <ProfileStackNav.Navigator screenOptions={({ navigation: nav }) => ({
      headerShown: true,
      headerLeft: () => nav.canGoBack() ? (
        <CustomBackButton navigation={nav} isDark={isDark} colors={colors} onPressOverride={() => nav.navigate('ProfileMain')} />
      ) : null,
      headerTintColor: '#FF6B00',
      headerStyle: { backgroundColor: colors.card },
      headerTitleStyle: { color: colors.text },
    })}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileMainScreen} options={{ headerShown: false }} />
      <ProfileStackNav.Screen name="CarrierProfile" component={CarrierProfileScreen} options={{ title: 'Bilgilerim' }} />
      <ProfileStackNav.Screen name="Wallet" component={WalletScreen} options={{ title: 'Cuzdan' }} />
      <ProfileStackNav.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Abonelik' }} />
      <ProfileStackNav.Screen name="SavedCards" component={SavedCardsScreen} options={{ title: 'Kartlarim' }} />
      <ProfileStackNav.Screen name="BillingHistory" component={BillingHistoryScreen} options={{ title: 'Gecmis' }} />
      <ProfileStackNav.Screen name="CreditShop" component={CreditShopScreen} options={{ title: 'Kontor Al' }} />
      <ProfileStackNav.Screen name="PartMarketHome" component={PartMarketHomeScreen} options={{ title: 'Ikinci El Pazari' }} />
      <ProfileStackNav.Screen name="PartMarketSearch" component={PartMarketSearchScreen} options={{ title: 'Arama' }} />
      <ProfileStackNav.Screen name="PartListingDetail" component={PartListingDetailScreen} options={{ title: 'Ilan Detayi' }} />
      <ProfileStackNav.Screen name="PartListingCreate" component={PartListingCreateScreen} options={{ title: 'Ilan Ver' }} />
      <ProfileStackNav.Screen name="MyPartListings" component={MyPartListingsScreen} options={{ title: 'Ilanlarim' }} />
      <ProfileStackNav.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ title: 'Araclarim' }} />
      <ProfileStackNav.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Mesajlar' }} />
      <ProfileStackNav.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: 'E-Belgeler' }} />
      <ProfileStackNav.Screen name="LoadTracking" component={LoadTrackingScreen} options={{ title: 'Yuklerim' }} />
      <ProfileStackNav.Screen name="MyBids" component={MyBidsScreen} options={{ title: 'Tekliflerim' }} />
      <ProfileStackNav.Screen name="FuelStations" component={FuelStationsScreen} options={{ title: 'Yakit' }} />
      <ProfileStackNav.Screen name="Restaurants" component={RestaurantsScreen} options={{ title: 'Restoran' }} />
      <ProfileStackNav.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} options={{ title: 'Analiz' }} />
      <ProfileStackNav.Screen name="AdminPanel" component={AdminPanelScreen} options={{ title: 'Admin' }} />
      <ProfileStackNav.Screen name="InvoiceCreate" component={InvoiceCreateScreen} options={{ title: 'Fatura' }} />
      <ProfileStackNav.Screen name="AccountantDashboard" component={AccountantDashboardScreen} options={{ title: 'Muhasebe' }} />
      <ProfileStackNav.Screen name="TaxDashboard" component={TaxDashboardScreen} options={{ title: 'Vergi, Muhasebe, E-Belge ve Finans Yönetimi' }} />
      <ProfileStackNav.Screen name="WebhookManagement" component={WebhookManagementScreen} options={{ title: 'Webhook' }} />
      <ProfileStackNav.Screen name="ApiKeyManagement" component={ApiKeyManagementScreen} options={{ title: 'API Key' }} />
      <ProfileStackNav.Screen name="DuyuruYonetim" component={DuyuruYonetimScreen} options={{ title: 'Duyuru' }} />
      <ProfileStackNav.Screen name="Kitchen" component={KitchenScreen} options={{ title: 'Mutfak' }} />
      <ProfileStackNav.Screen name="AiDialog" component={AiDialogScreen} options={{ title: 'AI' }} />
      <ProfileStackNav.Screen name="Finance" component={FinanceNavigator} options={{ headerShown: false }} />
      <ProfileStackNav.Screen name="LoadTrackingDetail" component={LoadTrackingDetail} options={{ title: 'Yuk Detay' }} />
      <ProfileStackNav.Screen name="LoadAcceptDetail" component={LoadAcceptDetail} options={{ title: 'Yuk Detayi' }} />
      <ProfileStackNav.Screen name="CommissionConfig" component={CommissionConfigScreen} options={{ title: 'Komisyon' }} />
      <ProfileStackNav.Screen name="PlanManagement" component={PlanManagementScreen} options={{ title: 'Planlar' }} />
      <ProfileStackNav.Screen name="CreditPackageMgmt" component={CreditPackageScreen} options={{ title: 'Kontor Pkt' }} />
    </ProfileStackNav.Navigator>
  );
}

function ProfileMainScreen() {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const { can } = usePermission();
  const navigation = useNavigation<any>();

  if (!user) return null;

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Super Yonetici',
    SHIPPER: 'Yuk Veren',
    DRIVER: 'Tasiyici / Surucu',
    BUSINESS: 'Isletme Sahibi',
    GENERAL_USER: 'Genel Kullanici',
    GUEST: 'Misafir',
  };
  const roleLabel = ROLE_LABELS[user.role] || 'Kullanici';

  // Finans Durumu, Yapay Zeka → FAB menude var
  const allItems = [
    { perm: 'profile:edit' as const,      label: 'Bilgilerim',            icon: '👤',  onPress: () => navigation.navigate('CarrierProfile') },
    { perm: 'chat:use' as const,          label: 'Mesajlarım',            icon: '💬',  onPress: () => navigation.navigate('ChatList') },
    { perm: 'gib:view_invoices' as const, label: 'E-Belgelerim',          icon: '📄',  onPress: () => navigation.navigate('InvoiceList') },
    {                                   label: 'Vergi, Muhasebe, E-Belge ve Finans Yönetimi', icon: '🏛️',  onPress: () => navigation.navigate('TaxDashboard') },
    { perm: 'escrow:use' as const,        label: 'Cüzdan & Escrow',       icon: '🛡️',  onPress: () => navigation.navigate('Wallet') },
    { perm: 'load:track' as const,        label: 'Taşıdığım Yükler',      icon: '🚛',  onPress: () => navigation.navigate('LoadTracking') },
    { perm: 'load:bid' as const,          label: 'Tekliflerim',           icon: '📋',  onPress: () => navigation.navigate('MyBids') },
    { perm: 'gib:create_invoice' as const,label: 'Fatura Oluştur',        icon: '🧾',  onPress: () => navigation.navigate('InvoiceCreate') },
    { perm: 'finance:view_dashboard' as const, label: 'Muhasebe Panosu',  icon: '📊',  onPress: () => navigation.navigate('AccountantDashboard') },
    { perm: 'profile:edit' as const,      label: 'Abonelik Paketlerim',   icon: '📦',  onPress: () => navigation.navigate('Subscription') },
    { perm: 'profile:edit' as const,      label: 'Kayıtlı Kartlarım',     icon: '💳',  onPress: () => navigation.navigate('SavedCards') },
    { perm: 'profile:edit' as const,      label: 'Ödeme Geçmişi',         icon: '📋',  onPress: () => navigation.navigate('BillingHistory') },
    { perm: 'profile:edit' as const,      label: 'Araçlarım',             icon: '🚗',  onPress: () => navigation.navigate('MyVehicles') },
    { perm: 'admin:view_panel' as const,  label: 'Yönetici Paneli',       icon: '⚙️',  onPress: () => navigation.navigate('AdminPanel') },
    { label: 'Yardım ve Destek',          icon: '❓',  onPress: () => Alert.alert('Yardım', '📞 7/24: 05326741416') },
    { label: 'Çıkış',                     icon: '🚪',  onPress: () => logout() },
  ];

  const menuItems = allItems
    .filter((item) => !('perm' in item) || can(item.perm as any))
    .map((item, index) => ({ id: index + 1, ...item }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      {/* Profile Card */}
      <Card accentColor="#FF6B00" style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.h2, { color: colors.text, fontWeight: '800' }]}>{user.fullName}</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>{user.email}</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>{user.phone}</Text>

        <View style={{ marginTop: spacing.md, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.primary + '15' }}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{roleLabel}</Text>
        </View>
      </Card>

      {/* Special Invite Budget Integration Card */}
      {user.role === 'GENERAL_USER' && user.hasBudgetIntegration && (
        <Card accentColor={colors.success} style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.success, fontWeight: '800', marginBottom: spacing.xs }]}>
            💰 Özel Bütçe Entegrasyonu Aktif
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Davet koduyla katıldığınız için bütçe analizi, otomatik harcama takibi ve tüm finansal araçlarımız kullanımınıza tamamen açık!
          </Text>
        </Card>
      )}

      {/* Ordered Menu List */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
        🛠️ Profil İşlemleri
      </Text>

      {menuItems.map((item) => (
        <ProfileMenuItem
          key={item.id}
          label={`${item.id}. ${item.label}`}
          icon={item.icon}
          onPress={item.onPress}
          colors={colors}
          isDark={isDark}
        />
      ))}

      {/* Yönetici Paneli — sadece admin yetkisine sahip kullanicilar */}
      {can('admin:view_panel') && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.warning, fontWeight: '800', marginBottom: spacing.md }]}>
            🛡️ Yönetici Paneli
          </Text>
          <Card accentColor={colors.warning} style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Sistem yönetimi, entegrasyonlar ve gelişmiş raporlama araçlarına buradan ulaşabilirsiniz.
            </Text>
            {[
              can('admin:view_panel') && { label: 'Super Admin Paneli', icon: '⚙️', onPress: () => navigation.navigate('AdminPanel') },
              can('admin:integrations') && { label: 'Webhook Entegrasyon', icon: '🔗', onPress: () => navigation.navigate('WebhookManagement') },
              can('admin:integrations') && { label: 'API Anahtarları', icon: '🔐', onPress: () => navigation.navigate('ApiKeyManagement') },
              can('analytics:view') && { label: 'Analiz & Raporlar', icon: '📊', onPress: () => navigation.navigate('AnalyticsDashboard') },
              can('admin:manage_promotions') && { label: 'Duyuru Yönetimi', icon: '📣', onPress: () => navigation.navigate('DuyuruYonetim') },
            ].filter(Boolean).map((item: any, i: number) => (
              <ProfileMenuItem
                key={`admin-${i}`}
                label={`${item.label}`}
                icon={item.icon}
                onPress={item.onPress}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

function ThemeToggle() {
  const { colors, isDark } = useTheme();
  const { setMode } = useThemeStore();
  return (
    <TouchableOpacity
      onPress={() => setMode(isDark ? 'light' : 'dark')}
      style={{ marginRight: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
      activeOpacity={0.7}
    >
      <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
        {isDark ? 'Gunduz' : 'Gece'}
      </Text>
    </TouchableOpacity>
  );
}

function DummyComponent() {
  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}

type HomeStackParamList = {
  HomeScreen: undefined;
  FuelStations: undefined;
  Restaurants: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeNavigator() {
  const { colors, isDark } = useTheme();
  const { isGuest, logout } = useAuthStore();
  
  return (
    <HomeStack.Navigator screenOptions={({ navigation }) => ({
      headerShown: true,
      headerLeft: () => navigation.canGoBack() ? (
        <CustomBackButton navigation={navigation} isDark={isDark} colors={colors} />
      ) : null,
      headerTintColor: '#FF6B00',
      headerStyle: { backgroundColor: colors.card },
      headerTitleStyle: { color: colors.text },
    })}>
      <HomeStack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ 
          title: '',
          headerTitle: () => null,
          headerRight: () => isGuest ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
              <TouchableOpacity 
                onPress={() => logout()}
                style={{
                  backgroundColor: '#FF6B00',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radius.md,
                  shadowColor: '#FF6B00',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                  elevation: 2,
                  marginRight: 8,
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>Uye Ol</Text>
              </TouchableOpacity>
              <ThemeToggle />
            </View>
          ) : (
            <ThemeToggle />
          ),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }} 
      />
    </HomeStack.Navigator>
  );
}

function FABMenuItem({ icon, title, desc, onPress, colors }: { icon: string; title: string; desc: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}
      onPress={onPress} activeOpacity={0.7}
    >
      <Text style={{ fontSize: 24, marginRight: spacing.md }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

function MainTabs() {
  const { colors, isDark } = useTheme();
  const { isGuest } = useAuthStore();
  const { can } = usePermission();
  const [showFABMenu, setShowFABMenu] = React.useState(false);
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={() => null}
        screenOptions={({ route, navigation: tabNav }) => ({
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerRight: () => <ThemeToggle />,
          headerLeft: () => route.name !== 'Home' ? (
            <CustomBackButton
              navigation={tabNav}
              isDark={isDark}
              colors={colors}
              onPressOverride={() => tabNav.navigate('Home')}
            />
          ) : null,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeNavigator} 
          options={{ 
            headerShown: false,
            tabBarLabel: 'Ana Sayfa',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>🏠</Text>
            ),
          }} 
        />
        <Tab.Screen 
          name="LoadCreateTab" 
          component={LoadCreateWizard} 
          options={{ 
            title: 'Yuk Ekle', 
            tabBarLabel: 'Yuk Ekle',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>➕</Text>
            )
          }} 
        />
        <Tab.Screen
          name="FAB"
          component={DummyComponent}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => (
              <View style={{
                top: -15,
                justifyContent: 'center',
                alignItems: 'center',
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#FF6B00',
                shadowColor: '#FF6B00',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 5,
                elevation: 6,
              }}>
                <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '800', lineHeight: 28 }}>+</Text>
              </View>
            )
          }}
          listeners={{
            tabPress: (e: any) => {
              e.preventDefault();
              setShowFABMenu(true);
            },
          }}
        />
        <Tab.Screen 
          name="LoadAccept" 
          component={LoadAcceptScreen} 
          options={{ 
            title: 'Yuk Al', 
            tabBarLabel: 'Yuk Al',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>🔍</Text>
            )
          }} 
        />
        <Tab.Screen
          name="Profile"
          component={ProfileNavigator}
          options={{
            title: 'Profil',
            tabBarLabel: 'Profil',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>👤</Text>
            )
          }} 
        />
      </Tab.Navigator>

      {/* FAB (+) Yukarı Kayan Şeffaf Menü */}
      <Modal
        visible={showFABMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFABMenu(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: isDark ? 'rgba(9, 10, 15, 0.85)' : 'rgba(0, 0, 0, 0.45)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowFABMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
            borderBottomWidth: 0,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 10,
          }}>
            {/* Grab handle */}
            <View style={{
              width: 40,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: spacing.lg,
            }} />

            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' }]}>
              🚀 Hizli Islemler
            </Text>

            {/* FAB Menu — Permission-gated (EX-005 RBAC) */}
            {can('gib:view_invoices') && (
              <FABMenuItem icon="📄" title="E-Belge (GİB)" desc="E-Fatura, irsaliye ve belgeler" onPress={() => { setShowFABMenu(false); navigation.navigate('InvoiceList'); }} colors={colors} />
            )}
            {can('finance:view') && (
              <FABMenuItem icon="💰" title="Gelir Gider Hesabi" desc="Harcama takibi ve bütçe analizi" onPress={() => { setShowFABMenu(false); navigation.navigate('Finance'); }} colors={colors} />
            )}
            {can('roadside:view_fuel') && (
              <FABMenuItem icon="⛽" title="Akaryakit Istasyonlari" desc="İstasyon fiyat karşılaştırma" onPress={() => { setShowFABMenu(false); navigation.navigate('FuelStations'); }} colors={colors} />
            )}
            {can('roadside:view_restaurants') && (
              <View>
              <FABMenuItem icon="🍽️" title="Lezzet Duraklari" desc="TIR parki olan yol üstü tesisler" onPress={() => { setShowFABMenu(false); navigation.navigate('Restaurants'); }} colors={colors} />
              <FABMenuItem icon="👨‍🍳" title="Mutfak Ekrani" desc="Siparis hazirlama ve takip" onPress={() => { setShowFABMenu(false); navigation.navigate('Kitchen'); }} colors={colors} />
              </View>
            )}
            {can('drive_mode:use') && (
              <FABMenuItem icon="🚛" title="Surus Modu" desc="Büyük butonlar ve sesli komutlar" onPress={() => { setShowFABMenu(false); navigation.navigate('DriveMode'); }} colors={colors} />
            )}
            {can('ai:use_dialog') && (
              <FABMenuItem icon="🤖" title="AI ile Yuk Ekle" desc="Dogal dil ile yük oluşturun" onPress={() => { setShowFABMenu(false); navigation.navigate('AiDialog'); }} colors={colors} />
            )}
            <FABMenuItem icon="🚗" title="Arac Ilanlari" desc="Arac satin al ve sat" onPress={() => { setShowFABMenu(false); navigation.navigate('ListingsBrowse'); }} colors={colors} />
            {can('admin:view_panel') && (
              <FABMenuItem icon="⚙️" title="Admin Paneli" desc="Kullanici ve sistem yonetimi" onPress={() => { setShowFABMenu(false); navigation.navigate('AdminPanel'); }} colors={colors} />
            )}

            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                alignItems: 'center',
                borderColor: colors.border,
                borderWidth: 1,
              }}
              onPress={() => setShowFABMenu(false)}
            >
              <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>Kapat</Text>
            </TouchableOpacity>
          </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/** Her zaman gorunur sabit alt tab bar */
function PersistentTabBar() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { can } = usePermission();
  const [showFAB, setShowFAB] = useState(false);

  const handleTabPress = (tabName: string) => {
    if (tabName === 'MainTabs') {
      navigation.navigate('MainTabs', { screen: 'Home' });
    } else if (tabName === 'LoadCreate') {
      navigation.navigate('LoadCreate');
    } else if (tabName === 'LoadAccept') {
      navigation.navigate('MainTabs', { screen: 'LoadAccept' });
    } else if (tabName === 'Profile') {
      navigation.navigate('MainTabs', { screen: 'Profile' });
    }
  };

  const tabs = [
    { name: 'MainTabs', label: 'Ana Sayfa', icon: '🏠' },
    { name: 'LoadCreate', label: 'Yük Ekle', icon: '➕' },
    { name: 'HizliIslemler', label: 'İşlemler', isFAB: true },
    { name: 'LoadAccept', label: 'Yük Al', icon: '🔍' },
    { name: 'Profile', label: 'Profil', icon: '👤' },
  ];

  // Yakıt, Lokanta, Araç Al/Sat, İkinci El → Ana sayfaya taşındı
  const fabMenuItems = [
    { icon: '📄', title: 'E-Belge (GİB)', desc: 'E-Fatura, irsaliye ve belgeler', perm: 'gib:view_invoices', onPress: () => { setShowFAB(false); navigation.navigate('InvoiceList'); } },
    { icon: '💰', title: 'Gelir Gider Hesabı', desc: 'Harcama takibi ve bütçe analizi', perm: 'finance:view', onPress: () => { setShowFAB(false); navigation.navigate('Finance'); } },
    { icon: '🚛', title: 'Sürüş Modu', desc: 'Büyük butonlar ve sesli komutlar', perm: 'drive_mode:use', onPress: () => { setShowFAB(false); navigation.navigate('DriveMode'); } },
    { icon: '🤖', title: 'AI ile Yük Ekle', desc: 'Doğal dil ile yük oluşturun', perm: 'ai:use_dialog', onPress: () => { setShowFAB(false); navigation.navigate('AiDialog'); } },
    { icon: '⚙️', title: 'Admin Paneli', desc: 'Kullanıcı ve sistem yönetimi', perm: 'admin:view_panel', onPress: () => { setShowFAB(false); navigation.navigate('AdminPanel'); } },
  ].filter(item => !item.perm || can(item.perm as any));

  return (
    <>
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      }}>
        {tabs.map((tab) => {
          const isFAB = (tab as any).isFAB;
          if (isFAB) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: 4,
                }}
                onPress={() => setShowFAB(true)}
                activeOpacity={0.7}
              >
                <View style={{
                  top: -15,
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#FF6B00',
                  shadowColor: '#FF6B00',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 5,
                  elevation: 6,
                }}>
                  <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '800', lineHeight: 28 }}>+</Text>
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={tab.name}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => handleTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
            <Text style={{
              fontSize: 10,
              fontWeight: '600',
              color: colors.textTertiary,
              marginTop: 2,
            }}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
      </View>

      {/* FAB Menü Modal */}
      <Modal visible={showFAB} transparent animationType="slide" onRequestClose={() => setShowFAB(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowFAB(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 40, height: 5, borderRadius: 2.5, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: 16, textAlign: 'center' }]}>🚀 Hızlı İşlemler</Text>
              {fabMenuItems.map((item: any, i: number) => (
                <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={item.onPress} activeOpacity={0.7}>
                  <Text style={{ fontSize: 24, marginRight: 16 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{item.title}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ backgroundColor: colors.background, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, borderColor: colors.border, borderWidth: 1 }} onPress={() => setShowFAB(false)}>
                <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function Navigation() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading, restoreSession, user, token, isGuest } = useAuthStore();
  const { initializeChat } = useChatStore();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated && token && user && !isGuest) {
      connectSocket(token, user.id);
      initializeChat();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, token, user, isGuest]);

  useRealtimeEvents();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Kaptan Yükleniyor...</Text>
      </View>
    );
  }

  const linking = {
    prefixes: ['kaptan://'],
    config: {
      screens: {
        Login: 'login',
        MainTabs: '',
        DriveMode: 'drivemode',
      },
    },
  };

  return (
    <NavigationContainer
      linking={linking}
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.danger,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={({ navigation }) => ({
          headerShown: true,
          headerLeft: () => navigation.canGoBack() ? (
            <CustomBackButton navigation={navigation} isDark={isDark} colors={colors} />
          ) : null,
          headerTintColor: '#FF6B00',
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text },
        })}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="LoadCreate"
              component={LoadCreateWizard}
              options={{ animation: 'slide_from_right', title: 'Yuk Ekle' }}
            />
            <Stack.Screen
              name="LoadTracking"
              component={LoadTrackingScreen}
              options={{ animation: 'slide_from_right', title: 'Yuklerim Nerede' }}
            />
            <Stack.Screen
              name="LoadTrackingDetail"
              component={LoadTrackingDetail}
              options={{ animation: 'slide_from_right', title: 'Yuk Detayi' }}
            />
            <Stack.Screen
              name="LoadAcceptDetail"
              component={LoadAcceptDetail}
              options={{ animation: 'slide_from_right', title: 'Yuk Detayi' }}
            />
            <Stack.Screen
              name="MyBids"
              component={MyBidsScreen}
              options={{ animation: 'slide_from_right', title: 'Tekliflerim' }}
            />
            <Stack.Screen
              name="CarrierProfile"
              component={CarrierProfileScreen}
              options={{ animation: 'slide_from_right', title: 'Profil' }}
            />
            <Stack.Screen
              name="ReturnLoad"
              component={ReturnLoadScreen}
              options={{ animation: 'slide_from_right', title: 'Geri Dönüş Yükü Bul' }}
            />
            <Stack.Screen
              name="InvoiceList"
              component={InvoiceListScreen}
              options={{ animation: 'slide_from_right', title: 'E-Belgeler' }}
            />
            <Stack.Screen
              name="InvoiceCreate"
              component={InvoiceCreateScreen}
              options={{ animation: 'slide_from_right', title: 'Belge Olustur' }}
            />
            <Stack.Screen
              name="InvoiceDetail"
              component={InvoiceDetailScreen}
              options={{ animation: 'slide_from_right', title: 'Belge Detayi' }}
            />
            <Stack.Screen
              name="AccountantDashboard"
              component={AccountantDashboardScreen}
              options={{ animation: 'slide_from_right', title: 'Muhasebeci Paneli' }}
            />
            <Stack.Screen
              name="TaxDashboard"
              component={TaxDashboardScreen}
              options={{ animation: 'slide_from_right', title: 'Vergi, Muhasebe, E-Belge ve Finans Yönetimi' }}
            />
            <Stack.Screen
              name="WebhookManagement"
              component={WebhookManagementScreen}
              options={{ animation: 'slide_from_right', title: 'Webhook Yonetimi' }}
            />
            <Stack.Screen
              name="ApiKeyManagement"
              component={ApiKeyManagementScreen}
              options={{ animation: 'slide_from_right', title: 'API Anahtarlari' }}
            />
            <Stack.Screen
              name="AnalyticsDashboard"
              component={AnalyticsDashboardScreen}
              options={{ animation: 'slide_from_right', title: 'Analiz & Raporlar' }}
            />
            <Stack.Screen
              name="AdminPanel"
              component={AdminPanelScreen}
              options={{ animation: 'slide_from_right', title: 'Super Admin Paneli' }}
            />
            <Stack.Screen
              name="FuelStations"
              component={FuelStationsScreen}
              options={{ animation: 'slide_from_right', title: 'Akaryakit Istasyonlari' }}
            />
            <Stack.Screen
              name="Restaurants"
              component={RestaurantsScreen}
              options={{ animation: 'slide_from_right', title: 'Yol Ustu Tesisler' }}
            />
            <Stack.Screen
              name="ChatList"
              component={ChatListScreen}
              options={{ animation: 'slide_from_right', title: 'Mesajlar', headerShown: true }}
            />
            <Stack.Screen
              name="ChatCreate"
              component={ChatCreateScreen}
              options={{ animation: 'slide_from_right', title: 'Yeni Sohbet', headerShown: true }}
            />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={{ animation: 'slide_from_right', title: '', headerShown: true }}
            />
            <Stack.Screen
              name="DuyuruYonetim"
              component={DuyuruYonetimScreen}
              options={{ animation: 'slide_from_right', title: 'Duyuru Yonetimi' }}
            />
            <Stack.Screen
              name="DeliveryProof"
              component={DeliveryProofScreen}
              options={{ animation: 'slide_from_bottom', title: 'Teslimat Kaniti (ePOD)', headerShown: false }}
            />
            <Stack.Screen
              name="TruckNavigation"
              component={TruckNavigationScreen}
              options={{ animation: 'slide_from_right', title: 'Kamyon Navigasyon', headerShown: false }}
            />
            <Stack.Screen
              name="DriveMode"
              component={DriveModeScreen}
              options={{ animation: 'slide_from_right', title: 'Surus Modu', headerShown: true }}
            />
            <Stack.Screen
              name="AiDialog"
              component={AiDialogScreen}
              options={{ animation: 'slide_from_right', title: 'AI ile Yuk Ekle' }}
            />
            <Stack.Screen
              name="Finance"
              component={FinanceNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Kitchen"
              component={KitchenScreen}
              options={{ animation: 'slide_from_right', title: 'Mutfak Ekrani' }}
            />
            <Stack.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ animation: 'slide_from_right', title: 'Araclarim' }} />
            <Stack.Screen name="VehicleForm" component={VehicleFormScreen} options={{ animation: 'slide_from_right', title: 'Arac Bilgileri' }} />
            <Stack.Screen name="VehicleSale" component={VehicleSaleScreen} options={{ animation: 'slide_from_right', title: 'Aracini Sat' }} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ animation: 'slide_from_right', title: 'Ilan Detayi' }} />
            <Stack.Screen name="ListingsBrowse" component={ListingsBrowseScreen} options={{ animation: 'slide_from_right', title: 'Arac Ilanlari' }} />
            <Stack.Screen name="CategoryBrowse" component={CategoryBrowseScreen} options={{ animation: 'slide_from_right', title: 'Kategoriler' }} />
            <Stack.Screen name="Wallet" component={WalletScreen} options={{ animation: 'slide_from_right', title: 'Cüzdan & Escrow' }} />
            <Stack.Screen name="SavedCards" component={SavedCardsScreen} options={{ animation: 'slide_from_right', title: 'Kayıtlı Kartlarım' }} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ animation: 'slide_from_right', title: 'Abonelik Paketlerim' }} />
            <Stack.Screen name="BillingHistory" component={BillingHistoryScreen} options={{ animation: 'slide_from_right', title: 'Ödeme Geçmişi' }} />
            <Stack.Screen name="CreditShop" component={CreditShopScreen} options={{ animation: 'slide_from_right', title: 'Kontör Satın Al' }} />
            <Stack.Screen name="CommissionConfig" component={CommissionConfigScreen} options={{ animation: 'slide_from_right', title: 'Komisyon Oranları' }} />
            <Stack.Screen name="PlanManagement" component={PlanManagementScreen} options={{ animation: 'slide_from_right', title: 'Abonelik Planları' }} />
            <Stack.Screen name="CreditPackageMgmt" component={CreditPackageScreen} options={{ animation: 'slide_from_right', title: 'Kontör Paketleri' }} />
            <Stack.Screen name="PartMarketHome" component={PartMarketHomeScreen} options={{ animation: 'slide_from_right', title: 'İkinci El Pazarı' }} />
            <Stack.Screen name="PartMarketSearch" component={PartMarketSearchScreen} options={{ animation: 'slide_from_right', title: 'Arama' }} />
            <Stack.Screen name="PartListingDetail" component={PartListingDetailScreen} options={{ animation: 'slide_from_right', title: 'İlan Detayı' }} />
            <Stack.Screen name="PartListingCreate" component={PartListingCreateScreen} options={{ animation: 'slide_from_right', title: 'İlan Ver' }} />
            <Stack.Screen name="MyPartListings" component={MyPartListingsScreen} options={{ animation: 'slide_from_right', title: 'İlanlarım' }} />
            <Stack.Screen name="PartOffers" component={PartOffersScreen} options={{ animation: 'slide_from_right', title: 'Teklifler' }} />
            <Stack.Screen name="PartTransaction" component={PartTransactionScreen} options={{ animation: 'slide_from_right', title: 'Satın Alma' }} />
            <Stack.Screen name="PartDispute" component={PartDisputeScreen} options={{ animation: 'slide_from_right', title: 'Sorun Bildir' }} />
            <Stack.Screen name="PartReviews" component={PartReviewsScreen} options={{ animation: 'slide_from_right', title: 'Değerlendirmeler' }} />
          </>

        )}
      </Stack.Navigator>
      {/* Persistent tab bar — tum sayfalarda gorunur */}
      {isAuthenticated && <PersistentTabBar />}
      {/* HeyKaptan floating assistant — visible on all screens */}
      {isAuthenticated && <HeyKaptan />}
    </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  addButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.lg,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryLink: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    width: '100%',
    minHeight: 56,
    justifyContent: 'center',
  },
  quickActionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
