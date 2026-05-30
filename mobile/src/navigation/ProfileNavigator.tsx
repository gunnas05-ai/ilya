import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import CustomBackButton from './CustomBackButton';
import type { ProfileStackParamList } from './types';
import ProfileMainScreen from './ProfileMainScreen';
import FinanceNavigator from './FinanceNavigator';
import CarrierProfileScreen from '../screens/CarrierProfileScreen';
import WalletScreen from '../screens/WalletScreen';
import SubscriptionScreen from '../screens/billing/SubscriptionScreen';
import SavedCardsScreen from '../screens/payment/SavedCardsScreen';
import BillingHistoryScreen from '../screens/billing/BillingHistoryScreen';
import CreditShopScreen from '../screens/billing/CreditShopScreen';
import PartMarketHomeScreen from '../screens/part-market/PartMarketHomeScreen';
import PartMarketSearchScreen from '../screens/part-market/PartMarketSearchScreen';
import PartListingDetailScreen from '../screens/part-market/PartListingDetailScreen';
import PartListingCreateScreen from '../screens/part-market/PartListingCreateScreen';
import MyPartListingsScreen from '../screens/part-market/MyPartListingsScreen';
import MyVehiclesScreen from '../screens/vehicles/MyVehiclesScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import InvoiceListScreen from '../screens/gib/InvoiceListScreen';
import LoadTrackingScreen from '../screens/tracking/LoadTrackingScreen';
import MyBidsScreen from '../screens/load-accept/MyBidsScreen';
import FuelStationsScreen from '../screens/FuelStationsScreen';
import RestaurantsScreen from '../screens/RestaurantsScreen';
import AnalyticsDashboardScreen from '../screens/AnalyticsDashboardScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import InvoiceCreateScreen from '../screens/gib/InvoiceCreateScreen';
import AccountantDashboardScreen from '../screens/gib/AccountantDashboardScreen';
import TaxDashboardScreen from '../screens/TaxDashboardScreen';
import WebhookManagementScreen from '../screens/settings/WebhookManagementScreen';
import ApiKeyManagementScreen from '../screens/settings/ApiKeyManagementScreen';
import DuyuruYonetimScreen from '../screens/DuyuruYonetimScreen';
import KitchenScreen from '../screens/KitchenScreen';
import AiDialogScreen from '../screens/load-create/AiDialogScreen';
import LoadTrackingDetail from '../screens/tracking/LoadTrackingDetail';
import LoadAcceptDetail from '../screens/load-accept/LoadAcceptDetail';
import CommissionConfigScreen from '../screens/admin/CommissionConfigScreen';
import PlanManagementScreen from '../screens/admin/PlanManagementScreen';
import CreditPackageScreen from '../screens/admin/CreditPackageScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation: nav }) => ({
        headerShown: true,
        headerLeft: () =>
          nav.canGoBack() ? (
            <CustomBackButton navigation={nav} isDark={isDark} colors={colors} onPressOverride={() => nav.navigate('ProfileMain')} />
          ) : null,
        headerTintColor: '#FF6B00',
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      })}
    >
      <Stack.Screen name="ProfileMain" component={ProfileMainScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CarrierProfile" component={CarrierProfileScreen} options={{ title: 'Bilgilerim' }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Cüzdan' }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Abonelik' }} />
      <Stack.Screen name="SavedCards" component={SavedCardsScreen} options={{ title: 'Kartlarım' }} />
      <Stack.Screen name="BillingHistory" component={BillingHistoryScreen} options={{ title: 'Geçmiş' }} />
      <Stack.Screen name="CreditShop" component={CreditShopScreen} options={{ title: 'Kontör Al' }} />
      <Stack.Screen name="PartMarketHome" component={PartMarketHomeScreen} options={{ title: 'İkinci El Pazarı' }} />
      <Stack.Screen name="PartMarketSearch" component={PartMarketSearchScreen} options={{ title: 'Arama' }} />
      <Stack.Screen name="PartListingDetail" component={PartListingDetailScreen} options={{ title: 'İlan Detayı' }} />
      <Stack.Screen name="PartListingCreate" component={PartListingCreateScreen} options={{ title: 'İlan Ver' }} />
      <Stack.Screen name="MyPartListings" component={MyPartListingsScreen} options={{ title: 'İlanlarım' }} />
      <Stack.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ title: 'Araçlarım' }} />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Mesajlar' }} />
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: 'E-Belgeler' }} />
      <Stack.Screen name="LoadTracking" component={LoadTrackingScreen} options={{ title: 'Yüklerim' }} />
      <Stack.Screen name="MyBids" component={MyBidsScreen} options={{ title: 'Tekliflerim' }} />
      <Stack.Screen name="FuelStations" component={FuelStationsScreen} options={{ title: 'Yakıt' }} />
      <Stack.Screen name="Restaurants" component={RestaurantsScreen} options={{ title: 'Restoran' }} />
      <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} options={{ title: 'Analiz' }} />
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ title: 'Admin' }} />
      <Stack.Screen name="InvoiceCreate" component={InvoiceCreateScreen} options={{ title: 'Fatura' }} />
      <Stack.Screen name="AccountantDashboard" component={AccountantDashboardScreen} options={{ title: 'Muhasebe' }} />
      <Stack.Screen name="TaxDashboard" component={TaxDashboardScreen} options={{ title: 'Vergi, Muhasebe, E-Belge ve Finans Yönetimi' }} />
      <Stack.Screen name="WebhookManagement" component={WebhookManagementScreen} options={{ title: 'Webhook' }} />
      <Stack.Screen name="ApiKeyManagement" component={ApiKeyManagementScreen} options={{ title: 'API Key' }} />
      <Stack.Screen name="DuyuruYonetim" component={DuyuruYonetimScreen} options={{ title: 'Duyuru' }} />
      <Stack.Screen name="Kitchen" component={KitchenScreen} options={{ title: 'Mutfak' }} />
      <Stack.Screen name="AiDialog" component={AiDialogScreen} options={{ title: 'AI' }} />
      <Stack.Screen name="Finance" component={FinanceNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="LoadTrackingDetail" component={LoadTrackingDetail} options={{ title: 'Yük Detay' }} />
      <Stack.Screen name="LoadAcceptDetail" component={LoadAcceptDetail} options={{ title: 'Yük Detayı' }} />
      <Stack.Screen name="CommissionConfig" component={CommissionConfigScreen} options={{ title: 'Komisyon' }} />
      <Stack.Screen name="PlanManagement" component={PlanManagementScreen} options={{ title: 'Planlar' }} />
      <Stack.Screen name="CreditPackageMgmt" component={CreditPackageScreen} options={{ title: 'Kontör Pkt' }} />
    </Stack.Navigator>
  );
}
