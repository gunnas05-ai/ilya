import { useState, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { hapticLight, hapticSuccess } from '../../utils/haptic';
import { apiClient } from '../../services/api';
import { useLoadCreateStore } from '../../store/loadCreateStore';

interface Message { id: string; role: 'user' | 'assistant'; text: string; }

function cleanPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length > 11) digits = digits.slice(0, 11);
  if (digits.length >= 10 && !digits.startsWith('0')) digits = '0' + digits;
  return digits;
}

export default function AiDialogScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { updateFormData } = useLoadCreateStore();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const initialMsg = route?.params?.initialMessage;

  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    text: initialMsg
      ? `🎤 ${initialMsg}\n\nKonuşarak yük ekleyebilir, arama yapabilir, gider yazabilir veya istediğiniz sayfaya gidebilirsiniz.`
      : '🎤 Merhaba! Ben Kaptan AI Asistan. Şunları yapabilirim:\n\n📦 **Yük Ekle:** "İstanbul\'dan İzmir\'e 27 ton ham demir"\n🔍 **Yük Ara:** "En yakın yükleri sırala"\n🚛 **Araç Ara:** "4 milyonluk araç arıyorum"\n💰 **Gider Yaz:** "500 TL yemek gideri yaz"\n⛽ **Yakıt Kaydet:** "OPET\'ten 350 litre mazot aldım"\n🗺️ **Gezin:** "Profili aç", "Finans sayfasına git"\n\n"Bulunduğum konum" derseniz GPS\'ten alırım.',
  }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Record<string, any>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; city?: string; district?: string } | null>(null);
  const [convCtx, setConvCtx] = useState<Record<string, any> | null>(null);

  // Ses tanıma başlat
  const startVoiceRecognition = async () => {
    if (isListening || loading) return;
    setIsListening(true);
    try {
      const SpeechRecognition = require('expo-speech-recognition');
      if (SpeechRecognition?.default) {
        const result = await SpeechRecognition.default.start({ lang: 'tr-TR', interimResults: false });
        const text = result?.[0]?.transcript || '';
        if (text.trim()) {
          setInputText(text);
          await handleSendWithText(text);
        } else {
          addMessage({ id: Date.now().toString(), role: 'assistant', text: '🎤 Ses algılanamadı. Lütfen tekrar deneyin veya yazabilirsiniz.' });
        }
      }
    } catch {
      addMessage({ id: Date.now().toString(), role: 'assistant', text: '🎤 Ses tanıma şu anda kullanılamıyor. Lütfen yazarak devam edin.' });
    } finally {
      setIsListening(false);
    }
  };

  // HeyKaptan'dan gelindiyse otomatik dinlemeye başla
  useEffect(() => {
    if (initialMsg) {
      const timer = setTimeout(() => { startVoiceRecognition(); }, 2500);
      return () => clearTimeout(timer);
    }
  }, [initialMsg]);

  // GPS konumunu al
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({}).then(pos => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
            .then(r => r.json()).then(data => {
              const addr = data.address || {};
              setGpsLocation(prev => ({
                ...prev!,
                city: addr.city || addr.town || addr.province || '',
                district: addr.county || addr.suburb || addr.district || '',
              }));
            }).catch(() => {});
        }).catch(() => {});
      }
    });
  }, []);

  const scrollToBottom = () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);

  const addMessage = (msg: Message) => { setMessages(prev => [...prev, msg]); scrollToBottom(); };

  // Zorunlu alanlar: kalkış, varış, yük cinsi, miktar, yükleme tarihi
  const REQUIRED = {
    fromCity: 'Kalkış şehri',
    toCity: 'Varış şehri',
    title: 'Yük cinsi',
    weight: 'Miktar',
    pickupDate: 'Yükleme tarihi',
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    handleSendWithText(text);
  };

  const handleSendWithText = async (text: string) => {
    if (!text || loading) return;
    hapticLight();

    addMessage({ id: Date.now().toString(), role: 'user', text });

    const hasGpsRef = /bulundu[gğ]um\s*konum|şu\s*an(ki)?\s*konum|bu\s*konum/i.test(text);

    setLoading(true);
    try {
      let normalized = text.replace(/İ/g, 'i').replace(/I/g, 'i');

      let enhancedMsg = normalized;
      if (hasGpsRef && gpsLocation?.city) {
        enhancedMsg = normalized.replace(
          /bulundu[gğ]um\s*konum|şu\s*an(ki)?\s*konum|bu\s*konum/gi,
          `${gpsLocation.city} ${gpsLocation.district || ''}`
        );
      }

      const res = await apiClient.post('/voice/ai-dialog', { message: enhancedMsg, context: convCtx || undefined });
      const data = res.data?.data?.data || res.data?.data || res.data || {};
      const intent = data.intent || 'CREATE_LOAD';
      const fields = data.extracted || {};
      const params = data.params || {};

      // GPS şehir bilgisi varsa ekle
      if (hasGpsRef && gpsLocation?.city && !fields.originCity) {
        fields.originCity = gpsLocation.city;
        if (gpsLocation.district) fields.originDistrict = gpsLocation.district;
      }

      // Multi-step conversation: devam eden diyalog
      if (data.conversationState || data.action === 'CONTINUE_CONVERSATION') {
        setConvCtx({ conversationState: data.conversationState || 'CREATING_LOAD_STEP', collected: data.params?.collected || {}, step: data.params?.step || 2 });
        addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: data.response || 'Devam edelim...' });
        setLoading(false);
        setIsListening(false);
        return;
      }

      // Intent'e gore aksiyon
      if (intent === 'NAVIGATE' && params.screen) {
        addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: data.response || 'Yönlendiriliyorsunuz...' });
        hapticSuccess();
        setTimeout(() => navigation.navigate(params.screen), 800);
        setLoading(false);
        return;
      }

      if (intent === 'CREATE_EXPENSE' || intent === 'LOG_FUEL') {
        if (params.amount && params.category) {
          addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: data.response || 'Gider kaydediliyor...' });
          hapticSuccess();
          // Gideri kaydet ve finans ekranina yonlendir
          setTimeout(() => {
            apiClient.post('/finance/expenses', params).then(() => {
              navigation.navigate('Finance');
            }).catch(() => {});
          }, 600);
        } else {
          addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: data.response || 'Gider bilgisi anlasilamadi.' });
        }
        setLoading(false);
        return;
      }

      if (intent === 'SEARCH_LOADS') {
        addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: data.response || 'Yükler aranıyor...' });
        hapticSuccess();
        setTimeout(() => {
          navigation.navigate('LoadAccept', params);
        }, 600);
        setLoading(false);
        return;
      }

      if (intent === 'SEARCH_MARKETPLACE') {
        addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: data.response || 'Araç ilanları aranıyor...' });
        hapticSuccess();
        setTimeout(() => {
          navigation.navigate('ListingsBrowse', params);
        }, 600);
        setLoading(false);
        return;
      }

      // Tüm NAVIGATE intent'leri
      const navigateIntents = [
        'LIST_INVOICES','VIEW_ACCOUNTANT','VIEW_PROFIT_LOSS','CHECK_WALLET',
        'SEARCH_RESTAURANTS','MAKE_RESERVATION','START_TRACKING','VIEW_TRACKING',
        'LIST_VEHICLES','UPDATE_PROFILE','CHECK_PROFILE_STATUS','SEARCH_FUEL_STATIONS',
        'CREATE_INVOICE','CREATE_VEHICLE','SHOW_MY_BIDS','SHOW_MY_LOADS',
        'SHOW_DOCUMENTS','CHECK_NOTIFICATIONS','FIND_RETURN_LOADS','CALCULATE_ROUTE',
        'CHECK_LOAD_STATUS','SHOW_DRIVER_DASHBOARD','PART_MARKET_SEARCH',
        'CHECK_ESCROW_STATUS','SHOW_ANALYTICS',
      ];
      if (navigateIntents.includes(intent) && params.screen) {
        addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: data.response || 'Yönlendiriliyorsunuz...' });
        hapticSuccess();
        setTimeout(() => navigation.navigate(params.screen, params), 600);
        setLoading(false);
        return;
      }

      // CREATE_LOAD
      if (Object.keys(fields).length >= 2) {
        // Şehir sıralamasını düzelt: "X'den Y'ye" → X=kalkış, Y=varış
        if (fields.originCity && fields.destCity) {
          const msgLower = text.toLowerCase();
          const origIdx = msgLower.indexOf(fields.originCity.toLowerCase());
          const destIdx = msgLower.indexOf(fields.destCity.toLowerCase());
          if (destIdx >= 0 && origIdx >= 0 && destIdx < origIdx) {
            const tmp = fields.originCity;
            fields.originCity = fields.destCity;
            fields.destCity = tmp;
          }
        }
        setExtractedFields(fields);
        const missing = checkMissing(fields);
        setMissingFields(missing);

        const summary = buildSummary(fields, missing);
        addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: summary });

        if (missing.length === 0) {
          const mapped = mapToFormFields(fields);
          updateFormData(mapped);
          hapticSuccess();
        }
      } else {
        addMessage({
          id: (Date.now() + 1).toString(), role: 'assistant',
          text: 'Üzgünüm, yeterli bilgi çıkaramadım. Lütfen kalkış şehri, varış şehri, yük cinsi ve miktarını belirterek tekrar deneyin.\n\nÖrnek: "Samsun\'dan Mersin\'e 27 ton buğday"',
        });
      }
    } catch {
      addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: '⚠️ Bağlantı hatası. Lütfen tekrar deneyin.' });
    } finally { setLoading(false); }
  };

  const checkMissing = (fields: Record<string, any>): string[] => {
    const missing: string[] = [];
    if (!fields.originCity && !fields.pickup_city) missing.push('Kalkış şehri');
    if (!fields.destCity && !fields.delivery_city) missing.push('Varış şehri');
    if (!fields.title && !fields.cargo_type) missing.push('Yük cinsi');
    if (!fields.weight) missing.push('Miktar');
    if (!fields.pickupDate) missing.push('Yükleme tarihi');
    return missing;
  };

  const buildSummary = (fields: Record<string, any>, missing: string[]) => {
    const from = fields.originCity || fields.pickup_city || '';
    const to = fields.destCity || fields.delivery_city || '';
    const lines = ['✅ **Çıkarılan Bilgiler**', ''];

    if (from) {
      lines.push(`📍 Kalkış: ${from}${fields.originDistrict || fields.pickup_district ? ', ' + (fields.originDistrict || fields.pickup_district) : ''}`);
    }
    if (to) {
      lines.push(`📍 Varış: ${to}${fields.destDistrict || fields.delivery_district ? ', ' + (fields.destDistrict || fields.delivery_district) : ''}`);
    }
    if (fields.originAddress) lines.push(`🏠 Yükleme Adresi: ${fields.originAddress}`);
    if (fields.destAddress) lines.push(`🏠 Teslimat Adresi: ${fields.destAddress}`);
    if (fields.title || fields.cargo_type) lines.push(`📦 Yük: ${fields.title || fields.cargo_type}`);
    if (fields.weight) lines.push(`⚖️ Miktar: ${Number(fields.weight).toLocaleString('tr-TR')} kg`);
    if (fields.loadType) lines.push(`🚚 Yük Tipi: ${fields.loadType === 'tam_yuk' ? 'Tam Yük' : fields.loadType === 'parsiyel' ? 'Parsiyel' : fields.loadType}`);
    if (fields.vehicleType) lines.push(`🚛 Araç: ${fields.vehicleType}`);
    if (fields.pickupDate) lines.push(`📅 Yükleme: ${new Date(fields.pickupDate).toLocaleDateString('tr-TR')}${fields.pickupTime ? ' ' + fields.pickupTime : ''}`);
    if (fields.deliveryDate) lines.push(`📅 Teslim: ${new Date(fields.deliveryDate).toLocaleDateString('tr-TR')}${fields.deliveryTime ? ' ' + fields.deliveryTime : ''}`);
    if (fields.price) lines.push(`💰 Fiyat: ${Number(fields.price).toLocaleString('tr-TR')} ₺`);
    if (fields.contactName) lines.push(`👤 İrtibat: ${fields.contactName}${fields.contactPhone ? ' - ' + fields.contactPhone : ''}`);
    if (fields.description) lines.push(`📝 Açıklama: ${fields.description}`);

    if (missing.length > 0) {
      lines.push('');
      lines.push(`⚠️ Eksik bilgiler: ${missing.join(', ')}`);
      // Takip sorusu üret
      const questions = missing.map(m => {
        if (m === 'Kalkış şehri') return 'Yükün nereden yükleneceğini söyler misiniz?';
        if (m === 'Varış şehri') return 'Yük nereye teslim edilecek?';
        if (m === 'Yük cinsi') return 'Yükün cinsi nedir? (ör: buğday, kum, mobilya)';
        if (m === 'Miktar') return 'Yükün miktarı nedir? (ör: 27 ton, 500 kg, 3 adet)';
        if (m === 'Yükleme tarihi') return 'Yükleme ne zaman yapılacak? (ör: yarın, bugün, 3 gün sonra)';
        return '';
      }).filter(Boolean);
      if (questions.length > 0) {
        lines.push(`\n💬 ${questions.join(' ')}`);
      }
    } else {
      lines.push('');
      lines.push('✅ Tüm zorunlu alanlar tamam! Forma aktarıldı. Bilgileri kontrol edip "Devam Et" butonuna basabilirsiniz.');
    }
    return lines.join('\n');
  };

  const mapToFormFields = (fields: Record<string, any>): any => {
    const m: any = {};
    if (fields.originCity || fields.pickup_city) m.fromCity = fields.originCity || fields.pickup_city;
    if (fields.destCity || fields.delivery_city) m.toCity = fields.destCity || fields.delivery_city;
    if (fields.originDistrict || fields.pickup_district) m.fromDistrict = fields.originDistrict || fields.pickup_district;
    if (fields.destDistrict || fields.delivery_district) m.toDistrict = fields.destDistrict || fields.delivery_district;
    if (fields.originAddress) m.fromAddress = fields.originAddress;
    if (fields.destAddress) m.toAddress = fields.destAddress;
    if (fields.title || fields.cargo_type) m.title = fields.title || fields.cargo_type;
    if (fields.weight) { const w = parseFloat(String(fields.weight)) || 0; m.weight = String(w); m.totalWeight = w; m.totalTonnage = w; }
    if (fields.price) m.totalPrice = parseFloat(String(fields.price)) || 0;
    if (fields.vehicleType) m.vehicleType = fields.vehicleType;
    if (fields.loadType) m.loadType = fields.loadType;
    if (fields.contactName) m.contactName = fields.contactName;
    if (fields.contactPhone) m.contactPhone = cleanPhone(String(fields.contactPhone));
    if (fields.pickupDate) m.pickupDate = fields.pickupDate;
    if (fields.pickupTime) m.pickupTime = fields.pickupTime;
    if (fields.deliveryDate) m.deliveryDate = fields.deliveryDate;
    if (fields.deliveryTime) m.deliveryTime = fields.deliveryTime;
    if (fields.description) m.description = fields.description;
    if (fields.notes) m.description = fields.notes;
    return m;
  };

  const handleFormaGit = async () => {
    hapticLight();
    if (Object.keys(extractedFields).length >= 2) {
      const mapped = mapToFormFields(extractedFields);
      updateFormData(mapped);
      try {
        await AsyncStorage.setItem('kaptan_load_draft', JSON.stringify(mapped));
      } catch {}
    }
    // Her zaman LoadCreate'e git — form draft'tan okur
    navigation.navigate('LoadCreate');
  };

  const hasData = Object.keys(extractedFields).length >= 2;
  const isComplete = missingFields.length === 0 && hasData;

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: spacing.md, paddingHorizontal: spacing.lg }}>
        <View style={{
          maxWidth: '88%', borderRadius: radius.lg, padding: spacing.md,
          backgroundColor: isUser ? colors.primary : colors.card,
          borderWidth: isUser ? 0 : 1, borderColor: colors.border,
        }}>
          <Text style={[typography.body, { color: isUser ? '#FFF' : colors.text, lineHeight: 22 }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={[typography.h3, { color: colors.text }]}>🎤 Sesli Yük Ekleme</Text>
        {hasData && (
          <TouchableOpacity onPress={handleFormaGit} style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md }}>
            <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>📝 Forma Git</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* GPS Durumu */}
      {gpsLocation?.city && (
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, backgroundColor: colors.success + '10' }}>
          <Text style={[typography.small, { color: colors.success }]}>📍 Konumunuz: {gpsLocation.city}{gpsLocation.district ? ', ' + gpsLocation.district : ''}</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: 100 }}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            <>
              {loading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm }]}>AI analiz ediyor...</Text>
                </View>
              )}
              {/* Hızlı Komutlar */}
              <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
                <Text style={[typography.small, { color: colors.textTertiary, marginBottom: spacing.xs }]}>Hızlı Komutlar:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { label: '💰 Gider Yaz', cmd: '500 TL yemek gideri yaz' },
                    { label: '⛽ Yakıt Kaydet', cmd: 'OPET ten 350 litre mazot aldım' },
                    { label: '🔍 Yük Ara', cmd: 'En yakın yükleri sırala' },
                    { label: '🚛 Araç Ara', cmd: '4 milyonluk araç arıyorum' },
                    { label: '📄 Fatura Kes', cmd: 'ABC Ltd için 5000 TL fatura kes' },
                    { label: '👤 Profil', cmd: 'Profilimi göster' },
                  ].map(chip => (
                    <TouchableOpacity key={chip.label}
                      style={{ backgroundColor: colors.primary + '15', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.pill }}
                      onPress={() => { setInputText(chip.cmd); handleSendWithText(chip.cmd); }}
                    >
                      <Text style={[typography.small, { color: colors.primary }]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {hasData && (
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
                  <TouchableOpacity onPress={handleFormaGit} style={{ backgroundColor: isComplete ? colors.success : colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center' }}>
                    <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>
                      {isComplete ? '✅ Forma Git ve Kontrol Et' : '📝 Forma Aktar (Eksikleri manuel tamamla)'}
                    </Text>
                  </TouchableOpacity>
                  {!isComplete && missingFields.length > 0 && (
                    <Text style={[typography.small, { color: colors.warning, textAlign: 'center', marginTop: spacing.xs }]}>
                      ⚠️ Eksik: {missingFields.join(', ')}
                    </Text>
                  )}
                </View>
              )}
              <View style={{ height: 12 }} />
            </>
          }
        />

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {/* Mikrofon butonu */}
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: isListening ? '#EF4444' : colors.primary + '15', borderColor: isListening ? '#EF4444' : colors.primary + '30' }]}
            onPress={startVoiceRecognition}
            disabled={isListening || loading}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>{isListening ? '🔴' : '🎤'}</Text>
          </TouchableOpacity>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={isListening ? 'Dinleniyor...' : 'Yük bilgilerini söyleyin veya yazın...'}
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { backgroundColor: colors.background, borderColor: isListening ? '#EF4444' : colors.border, color: colors.text }]}
            multiline
            editable={!loading && !isListening}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() && !loading ? colors.primary : colors.border }]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={loading || !inputText.trim()}
          >
            <Text style={{ color: inputText.trim() && !loading ? '#FFF' : colors.textTertiary, fontSize: 20, fontWeight: '700' }}>➤</Text>
          </TouchableOpacity>
        </View>

        {/* Dinleniyor göstergesi */}
        {isListening && (
          <View style={{ backgroundColor: '#EF4444' + '15', paddingVertical: 6, alignItems: 'center' }}>
            <Text style={[typography.caption, { color: '#EF4444', fontWeight: '700' }]}>🎤 Dinleniyor... Konuşabilirsiniz</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, gap: spacing.sm },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, fontSize: 14, maxHeight: 100, minHeight: 44 },
  sendBtn: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  micBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginRight: 4, marginBottom: 2 },
});
