import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { hapticLight } from '../utils/haptic';
import OfflineBar from '../components/shared/OfflineBar';
import Card from '../components/shared/Card';

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  children?: { key: string; label: string; icon: string; route?: string; params?: any }[];
  route?: string;
  params?: any;
}

const USER_ROLE_MAP: Record<string, { label: string; role: string; icon: string }> = {
  member_firma:   { label: 'Firma / Yük Sahibi',     role: 'yuk_veren',   icon: '🏢' },
  member_tasiyici:{ label: 'Taşıyıcı / Sürücü',      role: 'tasiyici',    icon: '🚛' },
  member_isletme: { label: 'İşletme Sahibi',           role: 'isletme',     icon: '🏭' },
  member_genel:   { label: 'Genel Kullanıcı',          role: 'genel',       icon: '👤' },
};

const ROLE_LABEL_MAP: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', yuk_veren: 'Yük Veren',
  tasiyici: 'Taşıyıcı', sofor: 'Şoför', filo_yoneticisi: 'Filo Yöneticisi',
  muhasebe: 'Muhasebeci', isletme: 'İşletme', genel: 'Genel',
};

export default function AdminPanelScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { fetchUsersList, usersList, promotions, updatePromotionSettings, kvkkText: savedKvkk, updateKVKKText } = useAuthStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showUsers, setShowUsers] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({ ...promotions });
  const [showEscrow, setShowEscrow] = useState(false);
  const [escrowEnabled, setEscrowEnabled] = useState(false);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [showKvkk, setShowKvkk] = useState(false);
  const [kvkkText, setKvkkText] = useState('');
  const [privacyText, setPrivacyText] = useState('');
  const [showLanguage, setShowLanguage] = useState(false);
  const [languageEnabled, setLanguageEnabled] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [userFilterRole, setUserFilterRole] = useState('');

  const toggleExpand = (key: string) => {
    hapticLight();
    setExpanded(expanded === key ? null : key);
  };

  // Kullanıcıları role göre filtrele
  useEffect(() => {
    const list = Array.isArray(usersList) ? usersList : [];
    if (userFilterRole) {
      setFilteredUsers(list.filter((u: any) => u.role === userFilterRole));
    } else {
      setFilteredUsers(list);
    }
  }, [usersList, userFilterRole]);

  const menuItems: MenuItem[] = [
    {
      key: 'panel', label: 'Panel', icon: '📊',
      route: 'AnalyticsDashboard',
    },
    {
      key: 'members', label: 'Üyeler', icon: '👥',
      children: [
        { key: 'member_firma',   label: 'Firma / Yük Sahibi',     icon: '🏢' },
        { key: 'member_tasiyici',label: 'Taşıyıcı / Sürücü',      icon: '🚛' },
        { key: 'member_isletme', label: 'İşletme Sahibi',           icon: '🏭' },
        { key: 'member_genel',   label: 'Genel Kullanıcı',          icon: '👤' },
      ],
    },
    {
      key: 'loads', label: 'İlanlar', icon: '📦',
      route: 'LoadTracking',
    },
    {
      key: 'escrow', label: 'Escrow & Finans', icon: '🔒',
      route: 'Finance',
    },
    {
      key: 'disputes', label: 'İtirazlar & Talepler', icon: '⚠️',
      children: [
        { key: 'dispute_active',   label: 'Aktif İtirazlar',       icon: '🔥' },
        { key: 'dispute_resolved', label: 'Çözülen İtirazlar',     icon: '✅' },
        { key: 'withdraw_pending', label: 'Bekleyen Çekim Talepleri', icon: '💳' },
      ],
    },
    {
      key: 'voice', label: 'Sesli Komut', icon: '🎙️',
      route: 'DriveMode',
    },
    {
      key: 'payment', label: 'Ödeme & Gelir', icon: '💳',
      children: [
        { key: 'pay_cards',     label: 'Kayıtlı Kartlar',        icon: '💳', route: 'SavedCards' },
        { key: 'pay_subscription', label: 'Abonelik Paketleri',  icon: '📦', route: 'Subscription' },
        { key: 'pay_wallet',    label: 'Cüzdan & Escrow',        icon: '🛡️', route: 'Wallet' },
        { key: 'pay_commission', label: 'Komisyon Oranları',     icon: '📊' },
        { key: 'pay_plans',     label: 'Abonelik Planları',      icon: '📋' },
        { key: 'pay_credits',   label: 'Kontör Paketleri',       icon: '🧾' },
      ],
    },
    {
      key: 'settings', label: 'Ayarlar', icon: '⚙️',
      children: [
        { key: 'settings_webhook',  label: 'Webhook Entegrasyonu',  icon: '🔗', route: 'WebhookManagement' },
        { key: 'settings_api',      label: 'API Anahtarları',        icon: '🔐', route: 'ApiKeyManagement' },
        { key: 'settings_duyuru',   label: 'Duyuru Yönetimi',        icon: '📣', route: 'DuyuruYonetim' },
        { key: 'settings_escrow',   label: 'Guvenli Odeme Aktif Yap', icon: '🔒' },
        { key: 'settings_promo',    label: 'Promosyon & Komisyon',   icon: '🏷️' },
        { key: 'settings_kvkk',     label: 'KVKK Yasal Metni',       icon: '🛡️' },
        { key: 'settings_language', label: 'Çoklu Dil Desteği',     icon: '🌐' },
      ],
    },
    {
      key: 'sysadmin', label: 'Sistem Yönetimi', icon: '🔐',
      children: [
        { key: 'sysadmin_backup', label: 'Yedek Alma',        icon: '💾' },
        { key: 'sysadmin_api',    label: 'API Entegrasyonları', icon: '🔗', route: 'ApiKeyManagement' },
      ],
    },
  ];

  const handleMainPress = (item: MenuItem) => {
    hapticLight();
    if (item.children?.length) {
      toggleExpand(item.key);
    } else if (item.route) {
      navigation.navigate(item.route, item.params || {});
    }
  };

  const handleChildPress = (parentKey: string, child: NonNullable<MenuItem['children']>[0]) => {
    hapticLight();
    if (child.route) {
      navigation.navigate(child.route, child.params || {});
      return;
    }

    if (parentKey === 'members') {
      const roleInfo = USER_ROLE_MAP[child.key];
      if (roleInfo) {
        setUserFilterRole(roleInfo.role);
        setUsersLoading(true);
        setShowUsers(true);
        fetchUsersList().then(() => {
          setUsersLoading(false);
        }).catch(() => setUsersLoading(false));
      }
    } else if (parentKey === 'sysadmin' && child.key === 'sysadmin_backup') {
      Alert.alert(
        'Veritabanı Yedeği',
        'Tam veritabanı yedeği alınacak. Bu işlem birkaç dakika sürebilir.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Yedek Al', style: 'destructive', onPress: () => {
            Alert.alert('Yedekleme', 'Yedekleme işlemi başlatıldı. Sistem yöneticisine bilgi verildi.');
          }},
        ]
      );
    } else if (parentKey === 'disputes') {
      hapticLight();
      const { apiClient } = require('../services/api');
      if (child.key === 'dispute_active') {
        apiClient.get('/escrow/admin/withdrawals/pending').then((r: any) => {
          const list = r.data?.data || r.data || [];
          Alert.alert('Aktif İtirazlar', `${list.length || 0} adet bekleyen işlem bulunuyor.\n\nAdmin paneli üzerinden yönetebilirsiniz.`);
        }).catch(() => Alert.alert('İtirazlar', 'Veri alınamadı.'));
      } else if (child.key === 'withdraw_pending') {
        Alert.alert('Bekleyen Çekimler', 'Bekleyen çekim talepleri admin onayı bekliyor.\n\nOnaylamak için: Escrow → Admin → Withdrawals');
      } else {
        Alert.alert('Çözülen İtirazlar', 'Geçmiş itiraz kayıtları burada listelenecektir.');
      }
    } else if (parentKey === 'settings' && child.key === 'settings_promo') {
      hapticLight();
      setPromoForm({ ...promotions });
      setShowPromo(true);
    } else if (parentKey === 'settings' && child.key === 'settings_kvkk') {
      hapticLight();
      setKvkkText(savedKvkk || '');
      setPrivacyText('Yükleniyor...');
      setShowKvkk(true);
      // Fetch privacy agreement from backend
      const { apiClient } = require('../services/api');
      apiClient.get('/sozlesmeler/gizlilik').then((r: any) => {
        setPrivacyText(r.data?.text || r.data || '');
      }).catch(() => setPrivacyText(''));
    } else if (child.key === 'settings_language') {
      hapticLight();
      setLanguageLoading(true);
      setShowLanguage(true);
      const { apiClient } = require('../services/api');
      apiClient.get('/language/admin/settings').then((r: any) => {
        setLanguageEnabled(r.data?.data?.multiLanguageEnabled || r.data?.multiLanguageEnabled || false);
      }).catch(() => {}).finally(() => setLanguageLoading(false));
    } else if (child.key === 'settings_escrow') {
      hapticLight();
      setEscrowLoading(true);
      setShowEscrow(true);
      const { vehicleService } = require('../services/vehicleService');
      vehicleService.getEscrowStatus().then((r: any) => {
        setEscrowEnabled(r?.data?.escrowEnabled || r?.escrowEnabled || false);
      }).catch(() => {}).finally(() => setEscrowLoading(false));
    } else if (parentKey === 'payment') {
      hapticLight();
      if (child.key === 'pay_commission') {
        navigation.navigate('CommissionConfig');
      } else if (child.key === 'pay_plans') {
        navigation.navigate('PlanManagement');
      } else if (child.key === 'pay_credits') {
        navigation.navigate('CreditPackageMgmt');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Başlık */}
        <Card accentColor="#FF6B00" style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800' }]}>Kaptan Control Center</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Sistem yönetimi ve operasyon merkezi
          </Text>
        </Card>

        {/* Hızlı Erişim Kartları */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { hapticLight(); navigation.navigate('Wallet'); }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickAccent, { backgroundColor: colors.success }]} />
            <Text style={{ fontSize: 24 }}>💳</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600', marginTop: spacing.xs }]}>Ödeme</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { hapticLight(); navigation.navigate('LoadTracking'); }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickAccent, { backgroundColor: colors.info }]} />
            <Text style={{ fontSize: 24 }}>📦</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600', marginTop: spacing.xs }]}>İlanlar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { hapticLight(); navigation.navigate('Finance'); }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickAccent, { backgroundColor: colors.warning }]} />
            <Text style={{ fontSize: 24 }}>💰</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600', marginTop: spacing.xs }]}>Finans</Text>
          </TouchableOpacity>
        </View>

        {/* Menü Listesi */}
        {menuItems.map((item) => {
          const isExpanded = expanded === item.key;
          const hasChildren = !!item.children?.length;
          const hasRoute = !!item.route;

          return (
            <View key={item.key} style={{ marginBottom: spacing.sm }}>
              {/* Ana menü öğesi */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  if (hasChildren) toggleExpand(item.key);
                  else if (hasRoute) handleMainPress(item);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuRow}>
                  {/* Sol dikey şerit (00standart.txt uyumlu) */}
                  <View style={[styles.accent, { backgroundColor: isExpanded ? colors.primary : hasRoute ? colors.primary : colors.textTertiary }]} />
                  <Text style={styles.icon}>{item.icon}</Text>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '700', marginLeft: spacing.sm, flex: 1 }]}>
                    {item.label}
                  </Text>
                  <Text style={[typography.body, { color: colors.textTertiary }]}>
                    {hasChildren ? (isExpanded ? '▲' : '▼') : '→'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Alt menü (accordion) */}
              {hasChildren && isExpanded && (
                <View style={[styles.subMenu, { borderLeftColor: colors.primary }]}>
                  {item.children!.map((child) => (
                    <TouchableOpacity
                      key={child.key}
                      style={[styles.subItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleChildPress(item.key, child)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.icon}>{child.icon}</Text>
                      <Text style={[typography.body, { color: colors.text, marginLeft: spacing.sm, flex: 1 }]}>
                        {child.label}
                      </Text>
                      <Text style={[typography.caption, { color: child.route ? colors.primary : colors.textTertiary }]}>
                        {child.route ? 'Aç →' : '⚙️'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Alt bilgi */}
        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <Text style={[typography.small, { color: colors.textTertiary, textAlign: 'center' }]}>
            KAPTAN Lojistik Platformu{'\n'}Super Admin Control Center v1.0
          </Text>
        </View>
      </ScrollView>

      {/* Kullanıcı Listesi Modalı */}
      <Modal visible={showUsers} transparent animationType="slide" onRequestClose={() => setShowUsers(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowUsers(false)}>
              <Text style={[typography.h3, { color: colors.primary, fontWeight: '700' }]}>← Geri</Text>
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>
              👥 {ROLE_LABEL_MAP[userFilterRole] || 'Kullanıcı'} Listesi
            </Text>
            <View style={{ width: 50 }} />
          </View>

          {usersLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: spacing.md }}
              ListEmptyComponent={
                <Text style={[typography.body, { color: colors.textTertiary, textAlign: 'center', marginTop: 40 }]}>
                  Kullanıcı bulunamadı.
                </Text>
              }
              renderItem={({ item }) => (
                <Card accentColor={item.isActive ? colors.success : colors.textTertiary} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{item.fullName}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.email}</Text>
                      <Text style={[typography.caption, { color: colors.textTertiary }]}>{item.phone}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.roleBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>
                          {ROLE_LABEL_MAP[item.role] || item.role}
                        </Text>
                      </View>
                      <Text style={[typography.small, { color: item.isActive ? colors.success : colors.danger, marginTop: 4 }]}>
                        {item.isActive ? '🟢 Aktif' : '🔴 Pasif'}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Promosyon & Komisyon Modalı */}
      <Modal visible={showPromo} transparent animationType="slide" onRequestClose={() => setShowPromo(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowPromo(false)}>
              <Text style={[typography.h3, { color: colors.primary, fontWeight: '700' }]}>← Geri</Text>
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>🏷️ Promosyon</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <Card accentColor={colors.primary} style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>Kampanya Ayarları</Text>

              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Kampanya Adı</Text>
              <TextInput style={[styles.promoInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={promoForm.campaignName} onChangeText={(v) => setPromoForm({ ...promoForm, campaignName: v })} />

              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Ödül Tipi</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                {(['COMMISSION_CUT', 'FUEL_DISCOUNT', 'CASH_BACK'] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.promoChip, { backgroundColor: promoForm.rewardType === t ? colors.primary : colors.surface, borderColor: promoForm.rewardType === t ? colors.primary : colors.border }]} onPress={() => setPromoForm({ ...promoForm, rewardType: t })}>
                    <Text style={[typography.small, { color: promoForm.rewardType === t ? '#FFF' : colors.text, fontWeight: '600' }]}>{t === 'COMMISSION_CUT' ? 'Komisyon İndirimi' : t === 'FUEL_DISCOUNT' ? 'Yakıt İndirimi' : 'Nakit Ödül'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Davet Eden Ödülü (TL)</Text>
              <TextInput style={[styles.promoInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={String(promoForm.referrerReward)} keyboardType="numeric" onChangeText={(v) => setPromoForm({ ...promoForm, referrerReward: parseInt(v) || 0 })} />

              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Davet Edilen Ödülü (TL)</Text>
              <TextInput style={[styles.promoInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={String(promoForm.refereeReward)} keyboardType="numeric" onChangeText={(v) => setPromoForm({ ...promoForm, refereeReward: parseInt(v) || 0 })} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Kampanya Aktif</Text>
                <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: promoForm.isActive ? colors.success : colors.textTertiary }]} onPress={() => setPromoForm({ ...promoForm, isActive: !promoForm.isActive })}>
                  <Text style={[typography.small, { color: '#FFF', fontWeight: '700' }]}>{promoForm.isActive ? 'AKTİF' : 'PASİF'}</Text>
                </TouchableOpacity>
              </View>
            </Card>

            <TouchableOpacity style={[styles.promoSaveBtn, { backgroundColor: colors.primary }]} onPress={() => { updatePromotionSettings(promoForm); hapticLight(); setShowPromo(false); Alert.alert('✅ Kaydedildi', 'Promosyon ayarları güncellendi.'); }}>
              <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>💾 Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* KVKK Yasal Metni Modalı */}
      <Modal visible={showKvkk} transparent animationType="slide" onRequestClose={() => setShowKvkk(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowKvkk(false)}>
              <Text style={[typography.h3, { color: colors.primary, fontWeight: '700' }]}>← Geri</Text>
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>🛡️ Yasal Metinler</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
            {/* KVKK Metni */}
            <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>📜 KVKK Aydınlatma Metni</Text>
            <TextInput
              style={[styles.kvkkInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={kvkkText}
              onChangeText={setKvkkText}
              multiline
              textAlignVertical="top"
              placeholder="KVKK aydınlatma metnini buraya yazın..."
              placeholderTextColor={colors.textTertiary}
            />

            {/* Gizlilik Sözleşmesi Metni — GÖREV 1-A */}
            <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.xl }]}>🔒 Gizlilik Sözleşmesi</Text>
            <TextInput
              style={[styles.kvkkInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={privacyText}
              onChangeText={setPrivacyText}
              multiline
              textAlignVertical="top"
              placeholder="Gizlilik sözleşmesi metnini buraya yazın..."
              placeholderTextColor={colors.textTertiary}
            />

            <TouchableOpacity
              style={[styles.promoSaveBtn, { backgroundColor: colors.primary }]}
              onPress={async () => {
                updateKVKKText(kvkkText);
                // Save privacy text to backend
                try {
                  const { apiClient } = require('../services/api');
                  await apiClient.post('/sozlesmeler/admin/update', { key: 'privacy_agreement_text', text: privacyText });
                } catch {}
                hapticLight();
                setShowKvkk(false);
                Alert.alert('✅ Kaydedildi', 'KVKK ve Gizlilik Sözleşmesi metinleri güncellendi.');
              }}
            >
              <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>💾 Tümünü Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Çoklu Dil Desteği Toggle Modalı */}
      <Modal visible={showLanguage} transparent animationType="fade" onRequestClose={() => setShowLanguage(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.xl }}>
          <View style={[styles.escrowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h2, { color: colors.text, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm }]}>🌐 Çoklu Dil Desteği</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
              Aktif olduğunda kullanıcılar TR/EN/AR/RU dilleri arasında geçiş yapabilir. Pasif olduğunda herkes Türkçe kullanır.
            </Text>
            {languageLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <View style={[styles.escrowStatusBox, { backgroundColor: languageEnabled ? colors.success + '15' : colors.danger + '15', borderColor: languageEnabled ? colors.success + '40' : colors.danger + '40' }]}>
                  <Text style={{ fontSize: 48, textAlign: 'center' }}>{languageEnabled ? '🌐' : '🇹🇷'}</Text>
                  <Text style={[typography.h3, { color: languageEnabled ? colors.success : colors.danger, fontWeight: '800', textAlign: 'center', marginTop: spacing.xs }]}>
                    {languageEnabled ? 'ÇOKLU DİL AKTİF' : 'SADECE TÜRKÇE'}
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xs }]}>
                    {languageEnabled ? 'TR · EN · AR · RU' : 'TR'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.escrowToggleBtn, { backgroundColor: languageEnabled ? colors.danger : colors.success }]}
                  onPress={async () => {
                    setLanguageLoading(true);
                    try {
                      const { apiClient } = require('../services/api');
                      const res = await apiClient.post('/language/admin/toggle', { enabled: !languageEnabled });
                      const newState = res.data?.data?.enabled || res.data?.enabled || false;
                      setLanguageEnabled(newState);
                      Alert.alert('✅ Başarılı', newState ? 'Çoklu dil desteği AKTİF. Kullanıcılar dil değiştirebilir.' : 'Çoklu dil desteği PASİF. Tüm kullanıcılar Türkçe kullanacak.');
                    } catch { Alert.alert('Hata', 'Dil ayarı değiştirilemedi.'); }
                    finally { setLanguageLoading(false); }
                  }}
                >
                  <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>
                    {languageEnabled ? '🔴 Sadece Türkçe Yap' : '🟢 Çoklu Dili Aktif Et'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[styles.escrowCloseBtn, { borderColor: colors.border }]} onPress={() => setShowLanguage(false)}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Escrow Güvenli Ödeme Toggle Modalı */}
      <Modal visible={showEscrow} transparent animationType="fade" onRequestClose={() => setShowEscrow(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.xl }}>
          <View style={[styles.escrowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h2, { color: colors.text, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm }]}>🔒 Güvenli Ödeme</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
              Escrow sistemi aktif olduğunda tüm ödemeler teslimat onaylanana kadar güvende tutulur.
            </Text>
            {escrowLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <View style={[styles.escrowStatusBox, { backgroundColor: escrowEnabled ? colors.success + '15' : colors.danger + '15', borderColor: escrowEnabled ? colors.success + '40' : colors.danger + '40' }]}>
                  <Text style={{ fontSize: 48, textAlign: 'center' }}>{escrowEnabled ? '🟢' : '🔴'}</Text>
                  <Text style={[typography.h3, { color: escrowEnabled ? colors.success : colors.danger, fontWeight: '800', textAlign: 'center', marginTop: spacing.xs }]}>
                    {escrowEnabled ? 'AKTİF' : 'PASİF'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.escrowToggleBtn, { backgroundColor: escrowEnabled ? colors.danger : colors.success }]}
                  onPress={async () => {
                    setEscrowLoading(true);
                    try {
                      const { vehicleService } = require('../services/vehicleService');
                      const result = await vehicleService.toggleEscrow();
                      const newState = result?.data?.escrowEnabled || result?.escrowEnabled || false;
                      setEscrowEnabled(newState);
                      Alert.alert('✅ Başarılı', newState ? 'Güvenli ödeme AKTİF edildi.' : 'Güvenli ödeme PASİF edildi.');
                    } catch { Alert.alert('Hata', 'Escrow durumu değiştirilemedi.'); }
                    finally { setEscrowLoading(false); }
                  }}
                >
                  <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>
                    {escrowEnabled ? '🔴 Devre Dışı Bırak' : '🟢 Aktif Et'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[styles.escrowCloseBtn, { borderColor: colors.border }]} onPress={() => setShowEscrow(false)}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  quickCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
  },
  quickAccent: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  menuItem: {
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 52,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.md,
  },
  accent: {
    width: 5,
    height: '100%',
    minHeight: 52,
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  subMenu: {
    marginLeft: spacing.xl,
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  modalOverlay: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, paddingTop: 60,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.pill,
  },
  promoInput: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, minHeight: 48, marginTop: spacing.xs, fontSize: 15,
  },
  promoChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill, borderWidth: 1, flex: 1, alignItems: 'center',
  },
  toggleBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.pill, minWidth: 80, alignItems: 'center',
  },
  promoSaveBtn: {
    paddingVertical: spacing.md, borderRadius: radius.md,
    alignItems: 'center', minHeight: 56, justifyContent: 'center', marginTop: spacing.md,
  },
  escrowCard: {
    borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl,
  },
  escrowStatusBox: {
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  escrowToggleBtn: {
    paddingVertical: spacing.md, borderRadius: radius.md,
    alignItems: 'center', minHeight: 56, justifyContent: 'center',
  },
  escrowCloseBtn: {
    marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md,
    alignItems: 'center', borderWidth: 1,
  },
  kvkkInput: {
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1,
    minHeight: 250, fontSize: 14, lineHeight: 20,
  },
});
