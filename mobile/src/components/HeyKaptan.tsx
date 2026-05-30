import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { useTheme } from '../hooks/useTheme';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { spacing, radius, typography } from '../theme';
import { hapticLight } from '../utils/haptic';

interface ActionButton {
  label: string;
  type: 'navigate' | 'call';
  route?: string;
  phone?: string;
}

interface ExtractedParams {
  restaurant_name?: string;
  time?: string;
  dish?: string;
  message?: string;
  service_type?: string;
  place?: string;
  recipient?: string;
  content?: string;
}

const INTENT_ROUTES: Record<string, string> = {
  teslim: '/drive-mode',
  'yolda kaldım': '/drive-mode',
  yardım: '/drive-mode',
  benzinlik: '/fuel-stations',
  akaryakıt: '/fuel-stations',
  yakıt: '/fuel-stations',
  lokanta: '/restaurants',
  restoran: '/restaurants',
  yemek: '/restaurants',
  rezervasyon: '/restaurants',
  'yük durumu': '/load/browse',
  'aktif yük': '/load/browse',
  yük: '/load/browse',
  finans: '/finance',
  para: '/finance',
  cüzdan: '/finance',
  profil: '/profile',
  navigasyon: '/map',
  'yol tarifi': '/map',
  git: '/map',
  nerede: '/map',
  servis: '/map',
  tamir: '/map',
  bakım: '/map',
  mesaj: '/profile',
  bildirim: '/profile',
  ara: '/drive-mode',
  'geri dönüş': '/return-loads',
  'dönüş yükü': '/return-loads',
  'e-irsaliye': '/documents',
  irsaliye: '/documents',
  fatura: '/documents',
  belge: '/documents',
  kiralık: '/escrow',
  'emanet yük': '/escrow',
  harita: '/map',
};

const COMMAND_RESPONSES: Record<string, string> = {
  teslim: 'Sürüş moduna yönlendiriliyorum. Yük teslim işleminizi oradan yapabilirsiniz.',
  'yolda kaldım': 'Sürüş moduna yönlendiriliyorum. Yardım çağrısı yapabilirsiniz.',
  yardım: 'Sürüş moduna yönlendiriliyorum.',
  benzinlik: 'En yakın akaryakıt istasyonlarını gösteriyorum.',
  akaryakıt: 'En yakın akaryakıt istasyonlarını gösteriyorum.',
  yakıt: 'En yakın akaryakıt istasyonlarını gösteriyorum.',
  lokanta: 'Lokanta listesine yönlendiriyorum.',
  restoran: 'Lokanta listesine yönlendiriyorum.',
  yemek: 'Lokanta listesine yönlendiriyorum.',
  rezervasyon: 'Lokanta sayfasına yönlendiriyorum. Rezervasyon işlemlerinizi oradan yapabilirsiniz.',
  'yük durumu': 'Yükler sayfasına yönlendiriyorum.',
  'aktif yük': 'Aktif yüklerinizi gösteriyorum.',
  yük: 'Yükler sayfasına yönlendiriyorum.',
  finans: 'Finans sayfasına yönlendiriyorum.',
  para: 'Finans sayfasına yönlendiriyorum.',
  cüzdan: 'Finans sayfasına yönlendiriyorum.',
  profil: 'Profil sayfasına yönlendiriyorum.',
  navigasyon: 'Harita sayfasına yönlendiriyorum.',
  'yol tarifi': 'Harita sayfasına yönlendiriyorum.',
  git: 'Harita sayfasına yönlendiriyorum.',
  nerede: 'Harita sayfasında konumları gösteriyorum.',
  servis: 'Harita sayfasında servis noktalarını gösteriyorum.',
  tamir: 'Harita sayfasında tamir noktalarını gösteriyorum.',
  bakım: 'Harita sayfasında bakım noktalarını gösteriyorum.',
  mesaj: 'Bildirim merkezine yönlendiriyorum.',
  bildirim: 'Bildirim merkezine yönlendiriyorum.',
  ara: 'Sürüş moduna yönlendiriyorum. Operasyon merkezini oradan arayabilirsiniz.',
  'geri dönüş': 'Dönüş yüklerine yönlendiriyorum.',
  'dönüş yükü': 'Dönüş yüklerine yönlendiriyorum.',
  'e-irsaliye': 'Belgeler sayfasına yönlendiriyorum.',
  irsaliye: 'Belgeler sayfasına yönlendiriyorum.',
  fatura: 'Belgeler sayfasına yönlendiriyorum.',
  belge: 'Belgeler sayfasına yönlendiriyorum.',
  kiralık: 'Emanet yük sayfasına yönlendiriyorum.',
  'emanet yük': 'Emanet yük sayfasına yönlendiriyorum.',
  harita: 'Harita sayfasına yönlendiriyorum.',
};

const ROUTE_TO_SCREEN: Record<string, string> = {
  '/drive-mode': 'DriveMode',
  '/fuel-stations': 'FuelStations',
  '/restaurants': 'Restaurants',
  '/load/browse': 'LoadTracking',
  '/finance': 'CarrierProfile',
  '/profile': 'CarrierProfile',
  '/map': 'MainTabs',
  '/return-loads': 'ReturnLoad',
  '/documents': 'InvoiceList',
  '/escrow': 'MainTabs',
};

export default function HeyKaptan() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const stt = useSpeechToText();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [response, setResponse] = useState('');
  const [responseButtons, setResponseButtons] = useState<ActionButton[]>([]);
  const [voiceListening, setVoiceListening] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const speak = useCallback((t: string) => {
    Speech.stop();
    Speech.speak(t, { language: 'tr-TR', rate: 0.9 });
  }, []);

  const getActionButtons = (route: string): ActionButton[] => {
    const screen = ROUTE_TO_SCREEN[route];
    switch (route) {
      case '/drive-mode':
        return [
          { label: 'Sürüş Modu', type: 'navigate' as const, route: 'DriveMode' },
          { label: 'Ara', type: 'call' as const, phone: '08505227826' },
        ];
      case '/fuel-stations':
        return [{ label: 'Git', type: 'navigate' as const, route: 'FuelStations' }];
      case '/restaurants':
        return [
          { label: 'Git', type: 'navigate' as const, route: 'Restaurants' },
          { label: 'Ara', type: 'call' as const, phone: '08505227826' },
        ];
      case '/load/browse':
        return [{ label: 'Görüntüle', type: 'navigate' as const, route: 'LoadTracking' }];
      case '/finance':
        return [{ label: 'Git', type: 'navigate' as const, route: 'CarrierProfile' }];
      case '/profile':
        return [{ label: 'Git', type: 'navigate' as const, route: 'CarrierProfile' }];
      case '/return-loads':
        return [{ label: 'Dönüş Yükleri', type: 'navigate' as const, route: 'ReturnLoad' }];
      case '/documents':
        return [{ label: 'Belgeler', type: 'navigate' as const, route: 'InvoiceList' }];
      case '/map':
      case '/escrow':
        return [{ label: 'Git', type: 'navigate' as const, route: 'MainTabs' }];
      default:
        return screen ? [{ label: 'Git', type: 'navigate' as const, route: screen }] : [];
    }
  };

  const extractParams = (cmd: string, route: string): ExtractedParams => {
    const params: ExtractedParams = {};
    const lower = cmd.toLowerCase();

    if (route === '/restaurants') {
      const timeMatch = cmd.match(/saat\s*(\d{1,2}[:.]\d{2})/i);
      if (timeMatch) params.time = timeMatch[1];
      const dishMatch = cmd.match(/(?:porsiyon|bir\s+pora|tane\s+)(.+?)(?:hazırlaması|için|olsun|\.|$)/i);
      if (dishMatch) params.dish = dishMatch[1].trim();
      const restMatch = cmd.match(/(.+?)(?:restoranına|restoranı|restorana|lokantasına|lokantaya)/i);
      if (restMatch) params.restaurant_name = restMatch[1].trim();
      const msgMatch = cmd.match(/mesaj\s+(?:olarak\s+)?(?:ilet|gönder|yaz)\s*[.:]?\s*(.+)/i);
      if (msgMatch) params.message = msgMatch[1].trim();
    }

    if (route === '/map') {
      if (lower.includes('lastik')) params.service_type = 'tire_shop';
      else if (lower.includes('tamir') || lower.includes('mekanik') || lower.includes('arıza')) params.service_type = 'mechanic';
      else if (lower.includes('servis') || lower.includes('bakım')) params.service_type = 'maintenance';
      else if (lower.includes('benzin') || lower.includes('akaryakıt') || lower.includes('yakıt')) params.place = 'gas_station';
      else if (lower.includes('yemek') || lower.includes('lokanta') || lower.includes('restoran')) params.place = 'restaurant';
    }

    if (route === '/profile') {
      const contentMatch = cmd.match(/(?:mesaj\s+(?:at|gönder|ilet)|bildir|söyle)\s+(?:ki\s+)?[.:]?\s*(.+)/i);
      if (contentMatch) params.content = contentMatch[1].trim();
    }

    return params;
  };

  const formatParams = (params: ExtractedParams): string => {
    const parts: string[] = [];
    if (params.restaurant_name) parts.push(`Lokanta: ${params.restaurant_name}`);
    if (params.time) parts.push(`Saat: ${params.time}`);
    if (params.dish) parts.push(`Yemek: ${params.dish}`);
    if (params.message) parts.push(`Mesaj: "${params.message}"`);
    const serviceLabels: Record<string, string> = {
      tire_shop: 'Lastikçi', mechanic: 'Tamirci', maintenance: 'Servis', car_wash: 'Oto Yıkama',
    };
    if (params.service_type) parts.push(`Servis: ${serviceLabels[params.service_type] || params.service_type}`);
    if (params.place) parts.push(`Yer: ${params.place}`);
    if (params.recipient) parts.push(`Alıcı: ${params.recipient}`);
    if (params.content) parts.push(`İçerik: "${params.content}"`);
    return parts.join('\n');
  };

  const processCommand = (cmd: string) => {
    const lower = cmd.toLowerCase().trim();
    let matchedRoute = '';
    let matchedKey = '';

    for (const [key, route] of Object.entries(INTENT_ROUTES)) {
      if (lower.includes(key) && key.length > matchedKey.length) {
        matchedRoute = route;
        matchedKey = key;
      }
    }

    if (matchedRoute) {
      const params = extractParams(cmd, matchedRoute);
      const paramDetails = formatParams(params);
      let resp = COMMAND_RESPONSES[matchedKey] || 'Yönlendiriyorum.';
      if (paramDetails) resp += '\n\n' + paramDetails;
      setResponse(resp);
      setResponseButtons(getActionButtons(matchedRoute));
      speak(resp);
    } else {
      const fallback = 'Anlayamadım. Sürüş modu, yükler, finans, lokanta, akaryakıt, navigasyon, dönüş yükleri veya belgeler için komut verebilirsiniz.';
      setResponse(fallback);
      setResponseButtons([]);
      speak(fallback);
    }
  };

  // Auto-process STT results
  useEffect(() => {
    if (stt.transcript && !stt.isListening && voiceListening) {
      setVoiceListening(false);
      setText(stt.transcript);
      processCommand(stt.transcript);
    }
  }, [stt.transcript, stt.isListening, voiceListening]);

  // Reset voice listening on STT error
  useEffect(() => {
    if (stt.error && voiceListening) {
      setVoiceListening(false);
    }
  }, [stt.error, voiceListening]);

  const handleVoiceInput = async () => {
    hapticLight();
    setVoiceListening(true);
    await stt.start();
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    hapticLight();
    processCommand(text);
    setText('');
  };

  const handleActionPress = async (btn: ActionButton) => {
    hapticLight();
    setOpen(false);
    setResponse('');
    setResponseButtons([]);
    if (btn.type === 'navigate' && btn.route) {
      if (btn.route === 'ReturnLoad') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            navigation.navigate(btn.route, {
              deliveryLat: pos.coords.latitude,
              deliveryLng: pos.coords.longitude,
            });
            return;
          }
        } catch {}
      }
      navigation.navigate(btn.route);
    }
  };

  const handleQuickCommand = (cmd: string) => {
    hapticLight();
    setText(cmd);
    processCommand(cmd);
  };

  const quickCommands = [
    { label: 'Sürüş', cmd: 'sürüş moduna geç' },
    { label: 'Benzinlik', cmd: 'en yakın benzinlik' },
    { label: 'Lokanta', cmd: 'lokanta bul' },
    { label: 'Yüklerim', cmd: 'yük durumu' },
    { label: 'Finans', cmd: 'finans' },
    { label: 'Belgeler', cmd: 'e-irsaliye' },
  ];

  const closeSheet = () => {
    setOpen(false);
    setResponse('');
    setResponseButtons([]);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>🧢</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeSheet}>
        <TouchableOpacity style={styles.mask} activeOpacity={1} onPress={closeSheet}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={1} onPress={() => {}}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />

              <View style={styles.header}>
                <Text style={styles.headerIcon}>🧢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]}>Hey Kaptan</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>Bana ne yapmak istediğini söyle</Text>
                </View>
              </View>

              {/* Yanıt alanı */}
              {response ? (
                <View style={[styles.responseBox, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[typography.caption, { color: colors.primaryHover, lineHeight: 20 }]}>
                    {response}
                  </Text>
                  {responseButtons.length > 0 && (
                    <View style={styles.actionRow}>
                      {responseButtons.map((btn, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.actionChip, { backgroundColor: colors.primary }]}
                          onPress={() => handleActionPress(btn)}
                          activeOpacity={0.8}
                        >
                          <Text style={[typography.caption, { color: '#FFF', fontWeight: '700' }]}>{btn.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}

              {!response && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {quickCommands.map((qc, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => handleQuickCommand(qc.cmd)}
                      activeOpacity={0.7}
                    >
                      <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{qc.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {voiceListening && stt.isListening ? (
                <View style={[styles.voiceListeningBar, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
                  <ActivityIndicator color="#FF6B00" size="small" />
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600', marginLeft: spacing.sm, flex: 1 }]}>
                    {stt.transcript || 'Dinleniyor...'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { stt.abort(); setVoiceListening(false); }}
                    style={{ padding: spacing.xs, minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>İptal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <TextInput
                    ref={inputRef}
                    value={text}
                    onChangeText={setText}
                    placeholder="Komut yaz..."
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[styles.micBtn, { borderColor: colors.border }]}
                    onPress={handleVoiceInput}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.micIcon}>🎤</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sendIcon}>➡️</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    right: 8,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  fabIcon: { fontSize: 24 },
  mask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.xl,
    paddingBottom: spacing['2xl'] + 24,
  },
  handle: { width: 40, height: 5, borderRadius: 2.5, alignSelf: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerIcon: { fontSize: 28 },
  responseBox: { padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  actionChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, minHeight: 40, justifyContent: 'center' },
  chipsScroll: { marginBottom: spacing.md, marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, marginRight: spacing.sm, minHeight: 40, justifyContent: 'center' },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 14, minHeight: 48 },
  sendBtn: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 20 },
  micBtn: {
    width: 48, height: 48, borderRadius: radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  micIcon: { fontSize: 20 },
  voiceListeningBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, minHeight: 48,
  },
});
