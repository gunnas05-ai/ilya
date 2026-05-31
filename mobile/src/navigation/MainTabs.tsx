import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import { spacing, typography } from '../theme';
import CustomBackButton from './CustomBackButton';
import VoiceAssistantModal from '../components/VoiceAssistantModal';
import ThemeToggle from './ThemeToggle';
import HomeNavigator from './HomeNavigator';
import ProfileNavigator from './ProfileNavigator';
import LoadCreateWizard from '../screens/load-create/LoadCreateWizard';
import LoadAcceptScreen from '../screens/load-accept/LoadAcceptScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

// ── Shared FAB menu config ──────────────────────────────

interface FABItemConfig {
  icon: string;
  title: string;
  desc: string;
  perm?: string;
  screen: string;
}

const FAB_MENU_ITEMS: FABItemConfig[] = [
  { icon: '📁', title: 'Döküman Merkezi', desc: 'Tüm lojistik evraklarınız', screen: 'DocumentCenter' },
  { icon: '📄', title: 'E-Belge (GİB)', desc: 'E-Fatura, irsaliye ve belgeler', perm: 'gib:view_invoices', screen: 'InvoiceList' },
  { icon: '💰', title: 'Gelir Gider Hesabı', desc: 'Harcama takibi ve bütçe analizi', perm: 'finance:view', screen: 'Finance' },
  { icon: '🗺️', title: 'Rota Planlayıcı', desc: 'Yakıt, mola ve yemek noktaları', perm: 'roadside:view_fuel', screen: 'RoutePlanner' },
  { icon: '⛽', title: 'Akaryakıt İstasyonları', desc: 'İstasyon fiyat karşılaştırma', perm: 'roadside:view_fuel', screen: 'FuelStations' },
  { icon: '🍽️', title: 'Lezzet Durakları', desc: 'TIR parkı olan yol üstü tesisler', perm: 'roadside:view_restaurants', screen: 'Restaurants' },
  { icon: '👨‍🍳', title: 'Mutfak Ekranı', desc: 'Sipariş hazırlama ve takip', perm: 'roadside:view_restaurants', screen: 'Kitchen' },
  { icon: '🚛', title: 'Sürücü Paneli', desc: 'AETR sayacı, kazanç ve mola takibi', perm: 'drive_mode:use', screen: 'DriverDashboard' },
  { icon: '🎤', title: 'Sürüş Modu', desc: 'Büyük butonlar ve sesli komutlar', perm: 'drive_mode:use', screen: 'DriveMode' },
  { icon: '🤖', title: 'AI ile Yük Ekle', desc: 'Doğal dil ile yük oluşturun', perm: 'ai:use_dialog', screen: 'AiDialog' },
  { icon: '🚗', title: 'Araç İlanları', desc: 'Araç satın al ve sat', screen: 'ListingsBrowse' },
  { icon: '🧪', title: 'Test Merkezi', desc: 'QA test ve sistem sağlığı', perm: 'admin:view_panel', screen: 'TestCenter' },
  { icon: '🔐', title: 'Yetki Matrisi', desc: 'Rol ve yetki yönetimi', perm: 'admin:view_panel', screen: 'PermissionMatrix' },
  { icon: '⚙️', title: 'Admin Paneli', desc: 'Kullanıcı ve sistem yönetimi', perm: 'admin:view_panel', screen: 'AdminPanel' },
];

// ── Main Tab Navigator ──────────────────────────────────

const PERSISTENT_TABS = [
  { name: 'Menuler' as const, label: 'Menüler', icon: '📋', isMenu: true as const },
  { name: 'LoadCreate' as const, label: 'Yük Ekle', icon: '➕' },
  { name: 'HeyKaptan' as const, label: '', isHeyKaptan: true as const },
  { name: 'LoadAccept' as const, label: 'Yük Al', icon: '🔍' },
  { name: 'Profile' as const, label: 'Profil', icon: '👤' },
];

function MainTabNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={() => null}
        screenOptions={({ route, navigation: tabNav }) => ({
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => <ThemeToggle />,
          headerLeft: () =>
            route.name !== 'Home' ? (
              <CustomBackButton navigation={tabNav} isDark={isDark} colors={colors} onPressOverride={() => tabNav.navigate('Home')} />
            ) : null,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        })}
      >
        <Tab.Screen name="Home" component={HomeNavigator} options={{ headerShown: false, tabBarLabel: 'Ana Sayfa', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }} />
        <Tab.Screen name="LoadCreateTab" component={LoadCreateWizard} options={{ title: 'Yük Ekle', tabBarLabel: 'Yük Ekle', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>➕</Text> }} />
        <Tab.Screen name="LoadAccept" component={LoadAcceptScreen} options={{ title: 'Yük Al', tabBarLabel: 'Yük Al', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔍</Text> }} />
        <Tab.Screen name="Profile" component={ProfileNavigator} options={{ title: 'Profil', tabBarLabel: 'Profil', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }} />
      </Tab.Navigator>
    </View>
  );
}

// ── Persistent Tab Bar ──────────────────────────────────

export function PersistentTabBar() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { can } = usePermission();
  const [showMenu, setShowMenu] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

  const handleTabPress = (tabName: string) => {
    if (tabName === 'MainTabs') navigation.navigate('MainTabs', { screen: 'Home' });
    else if (tabName === 'LoadCreate') navigation.navigate('LoadCreate');
    else if (tabName === 'LoadAccept') navigation.navigate('MainTabs', { screen: 'LoadAccept' });
    else if (tabName === 'Profile') navigation.navigate('MainTabs', { screen: 'Profile' });
  };

  const handleVoiceNavigate = (screen: string, params?: any) => {
    try { navigation.navigate(screen, params); } catch {}
  };

  const menuItems = FAB_MENU_ITEMS.filter((item) => !item.perm || can(item.perm as any));

  return (
    <>
      <View style={[styles.persistentTab, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {PERSISTENT_TABS.map((tab) => {
          if (tab.isHeyKaptan) {
            return (
              <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={() => setShowVoiceAssistant(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Hey Kaptan">
                <View style={styles.heyKaptanIcon}>
                  <Text style={styles.heyKaptanText}>🎤</Text>
                </View>
              </TouchableOpacity>
            );
          }
          if (tab.isMenu) {
            return (
              <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={() => setShowMenu(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Menüler">
                <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, { color: colors.textTertiary }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={() => handleTabPress(tab.name)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={tab.label}>
              <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, { color: colors.textTertiary }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Menüler Accordion Sheet */}
      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.fabOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.fabSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.fabHandle, { backgroundColor: colors.border }]} />
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' }]}>📋 Menüler</Text>
              {menuItems.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.menuLink, i < menuItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                  onPress={() => { setShowMenu(false); navigation.navigate(item.screen); }}
                  activeOpacity={0.6}
                >
                  <Text style={[typography.body, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[typography.caption, { color: colors.primary }]}>›</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.fabCloseBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowMenu(false)}>
                <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        visible={showVoiceAssistant}
        onClose={() => setShowVoiceAssistant(false)}
        onNavigate={handleVoiceNavigate}
      />
    </>
  );
}

export default function MainTabs() {
  return <MainTabNavigator />;
}

// ── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  fabIcon: {
    top: -15, justifyContent: 'center', alignItems: 'center',
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 5, elevation: 6,
  },
  fabIconText: { color: '#FFF', fontSize: 28, fontWeight: '800', lineHeight: 28 },
  fabOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  fabSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    borderWidth: 1, borderBottomWidth: 0,
    shadowColor: '#000000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },
  fabHandle: { width: 40, height: 5, borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 },
  fabCloseBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1 },
  persistentTab: { flexDirection: 'row', borderTopWidth: 1, height: 60, paddingBottom: 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  tabLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  heyKaptanIcon: {
    top: -15, justifyContent: 'center', alignItems: 'center',
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 5, elevation: 6,
  },
  heyKaptanText: { color: '#FFF', fontSize: 24 },
  menuLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
});
