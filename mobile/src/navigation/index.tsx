import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import { connectSocket, disconnectSocket } from '../services/websocket';
import CustomBackButton from './CustomBackButton';
import MainTabs, { PersistentTabBar } from './MainTabs';
import FinanceNavigator from './FinanceNavigator';
import HeyKaptan from '../components/HeyKaptan';
import LoginScreen from '../screens/LoginScreen';
import LoadCreateWizard from '../screens/load-create/LoadCreateWizard';
import LoadTrackingScreen from '../screens/tracking/LoadTrackingScreen';
import LoadTrackingDetail from '../screens/tracking/LoadTrackingDetail';
import LoadAcceptDetail from '../screens/load-accept/LoadAcceptDetail';
import MyBidsScreen from '../screens/load-accept/MyBidsScreen';
import CarrierProfileScreen from '../screens/CarrierProfileScreen';
import ReturnLoadScreen from '../screens/ReturnLoadScreen';
import InvoiceListScreen from '../screens/gib/InvoiceListScreen';
import InvoiceCreateScreen from '../screens/gib/InvoiceCreateScreen';
import InvoiceDetailScreen from '../screens/gib/InvoiceDetailScreen';
import AccountantDashboardScreen from '../screens/gib/AccountantDashboardScreen';
import TaxDashboardScreen from '../screens/TaxDashboardScreen';
import WebhookManagementScreen from '../screens/settings/WebhookManagementScreen';
import ApiKeyManagementScreen from '../screens/settings/ApiKeyManagementScreen';
import AnalyticsDashboardScreen from '../screens/AnalyticsDashboardScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import TestCenterScreen from '../screens/TestCenterScreen';
import FuelStationsScreen from '../screens/FuelStationsScreen';
import RestaurantsScreen from '../screens/RestaurantsScreen';
import RoutePlannerScreen from '../screens/RoutePlannerScreen';
import DocumentCenterScreen from '../screens/DocumentCenterScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatCreateScreen from '../screens/chat/ChatCreateScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import DuyuruYonetimScreen from '../screens/DuyuruYonetimScreen';
import DeliveryProofScreen from '../screens/DeliveryProofScreen';
import TruckNavigationScreen from '../screens/tracking/TruckNavigationScreen';
import DriveModeScreen from '../screens/DriveModeScreen';
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import AiDialogScreen from '../screens/load-create/AiDialogScreen';
import KitchenScreen from '../screens/KitchenScreen';
import MyVehiclesScreen from '../screens/vehicles/MyVehiclesScreen';
import VehicleFormScreen from '../screens/vehicles/VehicleFormScreen';
import VehicleSaleScreen from '../screens/vehicles/VehicleSaleScreen';
import ListingDetailScreen from '../screens/vehicles/ListingDetailScreen';
import ListingsBrowseScreen from '../screens/vehicles/ListingsBrowseScreen';
import CategoryBrowseScreen from '../screens/vehicles/CategoryBrowseScreen';
import WalletScreen from '../screens/WalletScreen';
import SavedCardsScreen from '../screens/payment/SavedCardsScreen';
import SubscriptionScreen from '../screens/billing/SubscriptionScreen';
import BillingHistoryScreen from '../screens/billing/BillingHistoryScreen';
import CreditShopScreen from '../screens/billing/CreditShopScreen';
import CommissionConfigScreen from '../screens/admin/CommissionConfigScreen';
import PlanManagementScreen from '../screens/admin/PlanManagementScreen';
import CreditPackageScreen from '../screens/admin/CreditPackageScreen';
import PartMarketHomeScreen from '../screens/part-market/PartMarketHomeScreen';
import PartMarketSearchScreen from '../screens/part-market/PartMarketSearchScreen';
import PartListingDetailScreen from '../screens/part-market/PartListingDetailScreen';
import PartListingCreateScreen from '../screens/part-market/PartListingCreateScreen';
import MyPartListingsScreen from '../screens/part-market/MyPartListingsScreen';
import PartOffersScreen from '../screens/part-market/PartOffersScreen';
import PartTransactionScreen from '../screens/part-market/PartTransactionScreen';
import PartDisputeScreen from '../screens/part-market/PartDisputeScreen';
import PartReviewsScreen from '../screens/part-market/PartReviewsScreen';
import i18n from '../i18n';
import type { RootStackParamList } from './types';

type ScreenConfig = {
  name: keyof RootStackParamList;
  component: React.ComponentType<any>;
  options?: Record<string, any>;
  i18nKey?: string;
};

const SCREEN_CONFIGS: Omit<ScreenConfig, 'options'>[] = [
  { name: 'LoadCreate', component: LoadCreateWizard, i18nKey: 'nav.loadCreate' },
  { name: 'LoadTracking', component: LoadTrackingScreen, i18nKey: 'nav.loadTracking' },
  { name: 'LoadTrackingDetail', component: LoadTrackingDetail, i18nKey: 'nav.loadTrackingDetail' },
  { name: 'LoadAcceptDetail', component: LoadAcceptDetail, i18nKey: 'nav.loadAcceptDetail' },
  { name: 'MyBids', component: MyBidsScreen, i18nKey: 'nav.myBids' },
  { name: 'CarrierProfile', component: CarrierProfileScreen, i18nKey: 'nav.carrierProfile' },
  { name: 'ReturnLoad', component: ReturnLoadScreen, i18nKey: 'nav.returnLoad' },
  { name: 'InvoiceList', component: InvoiceListScreen, i18nKey: 'nav.invoiceList' },
  { name: 'InvoiceCreate', component: InvoiceCreateScreen, i18nKey: 'nav.invoiceCreate' },
  { name: 'InvoiceDetail', component: InvoiceDetailScreen, i18nKey: 'nav.invoiceDetail' },
  { name: 'AccountantDashboard', component: AccountantDashboardScreen, i18nKey: 'nav.accountantDashboard' },
  { name: 'TaxDashboard', component: TaxDashboardScreen, i18nKey: 'nav.taxDashboard' },
  { name: 'WebhookManagement', component: WebhookManagementScreen, i18nKey: 'nav.webhookManagement' },
  { name: 'ApiKeyManagement', component: ApiKeyManagementScreen, i18nKey: 'nav.apiKeyManagement' },
  { name: 'AnalyticsDashboard', component: AnalyticsDashboardScreen, i18nKey: 'nav.analyticsDashboard' },
  { name: 'AdminPanel', component: AdminPanelScreen, i18nKey: 'nav.adminPanel' },
  { name: 'TestCenter', component: TestCenterScreen },
  { name: 'FuelStations', component: FuelStationsScreen, i18nKey: 'nav.fuelStations' },
  { name: 'Restaurants', component: RestaurantsScreen, i18nKey: 'nav.restaurants' },
  { name: 'RoutePlanner', component: RoutePlannerScreen },
  { name: 'DocumentCenter', component: DocumentCenterScreen },
  { name: 'ChatList', component: ChatListScreen, i18nKey: 'nav.chatList' },
  { name: 'ChatCreate', component: ChatCreateScreen, i18nKey: 'nav.chatCreate' },
  { name: 'ChatRoom', component: ChatRoomScreen },
  { name: 'DuyuruYonetim', component: DuyuruYonetimScreen },
  { name: 'DeliveryProof', component: DeliveryProofScreen },
  { name: 'TruckNavigation', component: TruckNavigationScreen },
  { name: 'DriveMode', component: DriveModeScreen, i18nKey: 'nav.driveMode' },
  { name: 'DriverDashboard', component: DriverDashboardScreen },
  { name: 'AiDialog', component: AiDialogScreen, i18nKey: 'nav.aiDialog' },
  { name: 'Finance', component: FinanceNavigator },
  { name: 'Kitchen', component: KitchenScreen, i18nKey: 'nav.kitchen' },
  { name: 'MyVehicles', component: MyVehiclesScreen, i18nKey: 'nav.myVehicles' },
  { name: 'VehicleForm', component: VehicleFormScreen, i18nKey: 'nav.vehicleForm' },
  { name: 'VehicleSale', component: VehicleSaleScreen, i18nKey: 'nav.vehicleSale' },
  { name: 'ListingDetail', component: ListingDetailScreen, i18nKey: 'nav.listingDetail' },
  { name: 'ListingsBrowse', component: ListingsBrowseScreen, i18nKey: 'nav.listingsBrowse' },
  { name: 'CategoryBrowse', component: CategoryBrowseScreen, i18nKey: 'nav.categoryBrowse' },
  { name: 'Wallet', component: WalletScreen, i18nKey: 'nav.wallet' },
  { name: 'SavedCards', component: SavedCardsScreen, i18nKey: 'nav.savedCards' },
  { name: 'Subscription', component: SubscriptionScreen, i18nKey: 'nav.subscription' },
  { name: 'BillingHistory', component: BillingHistoryScreen, i18nKey: 'nav.billingHistory' },
  { name: 'CreditShop', component: CreditShopScreen, i18nKey: 'nav.creditShop' },
  { name: 'CommissionConfig', component: CommissionConfigScreen, i18nKey: 'nav.commissionConfig' },
  { name: 'PlanManagement', component: PlanManagementScreen, i18nKey: 'nav.planManagement' },
  { name: 'CreditPackageMgmt', component: CreditPackageScreen, i18nKey: 'nav.creditPackageMgmt' },
  { name: 'PartMarketHome', component: PartMarketHomeScreen, i18nKey: 'nav.partMarketHome' },
  { name: 'PartMarketSearch', component: PartMarketSearchScreen, i18nKey: 'nav.partMarketSearch' },
  { name: 'PartListingDetail', component: PartListingDetailScreen, i18nKey: 'nav.partListingDetail' },
  { name: 'PartListingCreate', component: PartListingCreateScreen, i18nKey: 'nav.partListingCreate' },
  { name: 'MyPartListings', component: MyPartListingsScreen, i18nKey: 'nav.myPartListings' },
  { name: 'PartOffers', component: PartOffersScreen, i18nKey: 'nav.partOffers' },
  { name: 'PartTransaction', component: PartTransactionScreen, i18nKey: 'nav.partTransaction' },
  { name: 'PartDispute', component: PartDisputeScreen, i18nKey: 'nav.partDispute' },
  { name: 'PartReviews', component: PartReviewsScreen, i18nKey: 'nav.partReviews' },
];

function buildScreenOptions(config: Omit<ScreenConfig, 'options'>, t: typeof i18n.t): Record<string, any> {
  const base: Record<string, any> = { animation: 'slide_from_right' };
  if (config.i18nKey) {
    base.title = t(config.i18nKey);
  }
  if (config.name === 'ChatList' || config.name === 'ChatCreate' || config.name === 'ChatRoom') {
    base.headerShown = true;
  }
  if (config.name === 'DeliveryProof') {
    base.animation = 'slide_from_bottom';
    base.headerShown = false;
    base.title = t('nav.deliveryProof');
  }
  if (config.name === 'TruckNavigation') {
    base.headerShown = false;
    base.title = t('nav.truckNavigation');
  }
  if (config.name === 'Finance') {
    base.headerShown = false;
  }
  if (config.name === 'DriveMode') {
    base.headerShown = true;
  }
  if (config.name === 'ChatRoom') {
    base.title = '';
  }
  return base;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading, restoreSession, user, token, isGuest } = useAuthStore();
  const { initializeChat } = useChatStore();
  const t = i18n.t;

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
    prefixes: ['kaptan://', 'https://kaptanlojistik.com', 'https://app.kaptanlojistik.com'],
    config: {
      screens: {
        Login: 'login',
        MainTabs: '',
        DriveMode: 'drivemode',
        DriverDashboard: 'dashboard',
        LoadAcceptDetail: 'load/:loadId',
        LoadTrackingDetail: 'tracking/:loadId',
        ChatRoom: 'chat/:roomId',
        InvoiceDetail: 'invoice/:invoiceId',
        Wallet: 'wallet',
        FuelStations: 'fuel',
        Restaurants: 'restaurants',
        PartMarketHome: 'parts',
        ListingsBrowse: 'vehicles',
        Finance: 'finance',
        AiDialog: 'ai',
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
        <Stack.Navigator
          screenOptions={({ navigation }) => ({
            headerShown: true,
            headerLeft: () =>
              navigation.canGoBack() ? (
                <CustomBackButton navigation={navigation} isDark={isDark} colors={colors} />
              ) : null,
            headerTintColor: '#FF6B00',
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { color: colors.text },
          })}
        >
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
              {SCREEN_CONFIGS.map((screen) => (
                <Stack.Screen
                  key={screen.name}
                  name={screen.name}
                  component={screen.component}
                  options={buildScreenOptions(screen, t)}
                />
              ))}
            </>
          )}
        </Stack.Navigator>
        {isAuthenticated && <PersistentTabBar />}
        {isAuthenticated && <HeyKaptan />}
      </View>
    </NavigationContainer>
  );
}
