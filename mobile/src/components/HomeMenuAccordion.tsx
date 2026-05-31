import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { usePermission } from '../hooks/usePermission';
import { spacing, typography } from '../theme';

interface MenuItem {
  title: string;
  screen: string;
  perm?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { title: 'Döküman Merkezi', screen: 'DocumentCenter' },
  { title: 'E-Belge (GİB)', screen: 'InvoiceList', perm: 'gib:view_invoices' },
  { title: 'Gelir Gider Hesabı', screen: 'Finance', perm: 'finance:view' },
  { title: 'Rota Planlayıcı', screen: 'RoutePlanner', perm: 'roadside:view_fuel' },
  { title: 'Akaryakıt İstasyonları', screen: 'FuelStations', perm: 'roadside:view_fuel' },
  { title: 'Lezzet Durakları', screen: 'Restaurants', perm: 'roadside:view_restaurants' },
  { title: 'Mutfak Ekranı', screen: 'Kitchen', perm: 'roadside:view_restaurants' },
  { title: 'Sürücü Paneli', screen: 'DriverDashboard', perm: 'drive_mode:use' },
  { title: 'Sürüş Modu', screen: 'DriveMode', perm: 'drive_mode:use' },
  { title: 'AI ile Yük Ekle', screen: 'AiDialog', perm: 'ai:use_dialog' },
  { title: 'Araç İlanları', screen: 'ListingsBrowse' },
  { title: 'Test Merkezi', screen: 'TestCenter', perm: 'admin:view_panel' },
  { title: 'Yetki Matrisi', screen: 'PermissionMatrix', perm: 'admin:view_panel' },
  { title: 'Admin Paneli', screen: 'AdminPanel', perm: 'admin:view_panel' },
];

export default function HomeMenuAccordion() {
  const { colors } = useTheme();
  const { can } = usePermission();
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState(false);

  const filtered = MENU_ITEMS.filter(item => !item.perm || can(item.perm as any));

  return (
    <View style={{ marginBottom: spacing.md }}>
      <TouchableOpacity
        style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
          📋 Menüler
        </Text>
        <Text style={[typography.h3, { color: colors.primary }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.menuList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {filtered.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i < filtered.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={() => { setExpanded(false); navigation.navigate(item.screen); }}
              activeOpacity={0.6}
            >
              <Text style={[typography.body, { color: colors.text }]}>{item.title}</Text>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: 12, borderWidth: 1,
  },
  menuList: {
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    borderWidth: 1, borderTopWidth: 0, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
});
