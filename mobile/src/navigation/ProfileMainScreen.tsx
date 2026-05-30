import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import { spacing, radius, typography } from '../theme';
import Card from '../components/shared/Card';
import ProfileMenuItem from './ProfileMenuItem';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Yönetici',
  SHIPPER: 'Yük Veren',
  DRIVER: 'Taşıyıcı / Sürücü',
  BUSINESS: 'İşletme Sahibi',
  GENERAL_USER: 'Genel Kullanıcı',
  GUEST: 'Misafir',
};

export default function ProfileMainScreen() {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const { can } = usePermission();
  const navigation = useNavigation<any>();

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] || 'Kullanıcı';

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
      <Card accentColor="#FF6B00" style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.h2, { color: colors.text, fontWeight: '800' }]}>{user.fullName}</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>{user.email}</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>{user.phone}</Text>
        <View style={{ marginTop: spacing.md, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.primary + '15' }}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{roleLabel}</Text>
        </View>
      </Card>

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
                label={item.label}
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
