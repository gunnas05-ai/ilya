import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useNetwork } from '../hooks/useNetwork';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { spacing, radius, typography } from '../theme';
import { hapticMedium, hapticSuccess, hapticError } from '../utils/haptic';
import { queueRequest } from '../services/offlineQueue';
import { loadService } from '../services/loadService';
import { useDrivingTimer } from '../hooks/useDrivingTimer';

interface ActiveLoad {
  id: string;
  pickup_city: string;
  delivery_city: string;
  cargo_type?: string;
  status: string;
}

type ModalType = 'confirmation' | 'voice' | 'loads' | null;

export default function DriveModeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isConnected } = useNetwork();
  const stt = useSpeechToText();
  const aetr = useDrivingTimer();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeLoads, setActiveLoads] = useState<ActiveLoad[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<ActiveLoad | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [fetchingLoads, setFetchingLoads] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Konum izni gerekli');
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        setLocationError('Konum alınamadı');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const loads = await loadService.getMyLoads();
        if (Array.isArray(loads)) {
          setActiveLoads(loads.filter((l: any) =>
            l.status === 'active' || l.status === 'in_transit' || l.status === 'assigned'
          ));
        }
      } catch {
        // API unavailable — loads remain empty
      } finally {
        setFetchingLoads(false);
      }
    })();
  }, []);

  const speak = useCallback((text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'tr-TR', rate: 0.85 });
  }, []);

  const handleDeliverLoad = () => {
    hapticMedium();
    if (activeLoads.length === 0) {
      setStatusMessage('Aktif yük bulunamadı');
      speak('Aktif yükünüz bulunmamaktadır.');
      return;
    }
    if (activeLoads.length === 1) {
      setSelectedLoad(activeLoads[0]);
      setActiveModal('confirmation');
    } else {
      setActiveModal('loads');
    }
  };

  const confirmDelivery = async () => {
    if (!selectedLoad) return;
    hapticMedium();
    setProcessingAction('deliver');
    setActiveModal(null);

    const payload = {
      command_text: 'yükü teslim ettim',
      load_id: selectedLoad.id,
      location: location || undefined,
    };

    try {
      await queueRequest('/drive/command', 'POST', payload);
      hapticSuccess();
      setStatusMessage('Teslim işlemi kaydedildi');
      setSelectedLoad(null);
      speak('Yük teslim işleminiz kaydedildi.');
    } catch {
      hapticError();
      setStatusMessage('Hata oluştu');
      speak('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBreakdown = async () => {
    hapticMedium();
    setProcessingAction('breakdown');
    setStatusMessage('Yardım çağrısı gönderiliyor...');

    const payload = {
      command_text: 'yolda kaldım',
      load_id: selectedLoad?.id,
      location: location || undefined,
    };

    try {
      await queueRequest('/drive/command', 'POST', payload);
      hapticSuccess();
      setStatusMessage('Yardım çağrısı gönderildi');
      speak('Yardım çağrınız operasyon merkezine iletildi.');
    } catch {
      hapticError();
      setStatusMessage('Çağrı iletilemedi');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCall = () => {
    hapticMedium();
    setStatusMessage('Operasyon: 0850 KAPTAN');
    speak('Operasyon merkezini arıyorum.');
    Linking.openURL('tel:08505227826').catch(() => {});
  };

  const handleVoiceCommand = async () => {
    hapticMedium();
    setStatusMessage('Dinliyor... Konuşmaya başlayın');
    speak('Dinliyorum, lütfen bir komut söyleyin.');

    await stt.start();
    setActiveModal('voice');
  };

  const processVoiceCommand = (command: string) => {
    hapticMedium();
    setActiveModal(null);
    setStatusMessage(`"${command}" algılandı`);

    const lower = command.toLowerCase();
    if (lower.includes('teslim')) {
      handleDeliverLoad();
    } else if (lower.includes('kaldım') || lower.includes('yardım') || lower.includes('arıza')) {
      handleBreakdown();
    } else if (lower.includes('ara') || lower.includes('çağrı')) {
      handleCall();
    } else if (lower.includes('benzin') || lower.includes('yakıt') || lower.includes('akaryakıt')) {
      (navigation.navigate as any)('FuelStations');
      setStatusMessage('Akaryakıt istasyonlarına yönlendiriliyor');
    } else if (lower.includes('lokanta') || lower.includes('restoran') || lower.includes('yemek')) {
      (navigation.navigate as any)('Restaurants');
      setStatusMessage('Lokalara yönlendiriliyor');
    } else if (lower.includes('yük') && (lower.includes('durum') || lower.includes('nerede'))) {
      (navigation.navigate as any)('LoadTracking');
      setStatusMessage('Yük durumuna yönlendiriliyor');
    } else if (lower.includes('profil') || lower.includes('mesaj')) {
      (navigation.navigate as any)('MainTabs');
      setStatusMessage('Profil sayfasına yönlendiriliyor');
    } else {
      speak('Bu komut anlaşılamadı. Lütfen tekrar deneyin.');
      setStatusMessage('Komut anlaşılamadı');
    }
  };

  // Auto-process when STT returns a result
  useEffect(() => {
    if (stt.transcript && !stt.isListening) {
      processVoiceCommand(stt.transcript);
    }
  }, [stt.transcript, stt.isListening]);

  const voiceCommands = [
    { command: 'Yükü Teslim Ettim', icon: '🚛' },
    { command: 'Yolda Kaldım / Yardım', icon: '🆘' },
    { command: 'Operasyonu Ara', icon: '📞' },
    { command: 'En Yakın Benzinlik', icon: '⛽' },
    { command: 'En Yakın Lokanta', icon: '🍽️' },
    { command: 'Yük Durumum', icon: '📋' },
    { command: 'Profili Aç', icon: '👤' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <View style={styles.gpsRow}>
          <Text style={styles.gpsDot}>
            {location ? '🟢' : locationError ? '🔴' : '🟡'}
          </Text>
          <Text style={[styles.gpsText, { color: colors.textTertiary }]}>
            {location
              ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
              : locationError || 'Konum alınıyor...'}
          </Text>
        </View>
        {!isConnected && (
          <View style={[styles.offlineBadge, { backgroundColor: colors.danger }]}>
            <Text style={[styles.offlineLabel, { color: colors.white }]}>ÇEVRİMDIŞI</Text>
          </View>
        )}
      </View>

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sürüş Modu</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Eller direksiyonda, gözler yolda</Text>
      </View>

      {/* UX-005: AETR Gerçek Zamanli Surus/Dinlenme Sayaci (E-03) */}
      <View style={[styles.aetrBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Sürüş Süresi (Oturum)</Text>
          <Text style={[typography.caption, {
            color: aetr.sessionProgress >= 0.9 ? colors.danger : colors.success,
            fontWeight: '700',
          }]}>
            {aetr.sessionDisplay} / {aetr.sessionMaxDisplay}
          </Text>
        </View>
        <View style={[styles.aetrTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.aetrFill, {
            width: `${aetr.sessionProgress * 100}%`,
            backgroundColor: aetr.sessionProgress >= 0.9 ? colors.danger
              : aetr.sessionProgress >= 0.7 ? colors.warning
              : colors.success,
          }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={[typography.small, { color: colors.textTertiary }]}>
            {aetr.isDriving ? '🟢 Sürüşte' : '⚫ Park Halinde'} • Günlük: {aetr.dailyDisplay} / {aetr.dailyMaxDisplay}
          </Text>
          <Text style={[typography.small, { color: colors.textTertiary }]}>
            {aetr.sessionProgress >= 0.75 ? '⏰ Mola yaklasiyor!' : `⛽ ~${Math.round(340 * (1 - aetr.sessionProgress))} km menzil`}
          </Text>
        </View>
        {/* AETR Uyarilari */}
        {aetr.warnings.length > 0 && (
          <View style={{ marginTop: spacing.sm, padding: spacing.sm, backgroundColor: colors.danger + '10', borderRadius: radius.sm }}>
            {aetr.warnings.map((w, i) => (
              <Text key={i} style={[typography.small, { color: colors.danger, fontWeight: '600' }]}>{w}</Text>
            ))}
          </View>
        )}
      </View>

      {statusMessage ? (
        <View style={[styles.statusBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{statusMessage}</Text>
        </View>
      ) : null}

      <View style={styles.buttonGrid}>
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: colors.danger }]}
          onPress={handleDeliverLoad}
          activeOpacity={0.8}
          disabled={!!processingAction}
        >
          <Text style={styles.btnIcon}>🚛</Text>
          <Text style={[styles.btnLabel, { color: colors.white }]}>Yükü Teslim Ettim</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: colors.warning }]}
          onPress={handleBreakdown}
          activeOpacity={0.8}
          disabled={!!processingAction}
        >
          <Text style={styles.btnIcon}>🆘</Text>
          <Text style={[styles.btnLabel, { color: colors.white }]}>Yolda Kaldım</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: colors.success }]}
          onPress={handleCall}
          activeOpacity={0.8}
          disabled={!!processingAction}
        >
          <Text style={styles.btnIcon}>📞</Text>
          <Text style={[styles.btnLabel, { color: colors.white }]}>Ara</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: colors.info }]}
          onPress={handleVoiceCommand}
          activeOpacity={0.8}
          disabled={!!processingAction}
        >
          <Text style={styles.btnIcon}>🎤</Text>
          <Text style={[styles.btnLabel, { color: colors.white }]}>Sesli Komut</Text>
        </TouchableOpacity>
      </View>

      {processingAction && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#FF6B00" size="large" />
          <Text style={[styles.loadingText, { color: colors.primary }]}>İşlem yapılıyor...</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <Text style={[styles.bottomText, { color: colors.textTertiary }]}>
          {fetchingLoads
            ? 'Yükleriniz kontrol ediliyor...'
            : activeLoads.length > 0
              ? `${activeLoads.length} aktif yükünüz bulunuyor`
              : 'Aktif yükünüz bulunmuyor'}
        </Text>
      </View>

      {/* Active load selection */}
      <Modal visible={activeModal === 'loads'} transparent animationType="fade">
        <TouchableOpacity style={styles.modalMask} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
              Hangi yükü teslim ettiniz?
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {activeLoads.map((load, i) => (
                <TouchableOpacity
                  key={load.id}
                  style={[styles.loadRow, { borderBottomColor: colors.border }, i === activeLoads.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => { setSelectedLoad(load); setActiveModal('confirmation'); }}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    {load.pickup_city} → {load.delivery_city}
                  </Text>
                  {load.cargo_type && (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {load.cargo_type} • #{load.id.slice(0, 8)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delivery confirmation */}
      <Modal visible={activeModal === 'confirmation'} transparent animationType="fade">
        <TouchableOpacity style={styles.modalMask} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center' }]}>
              Yükü teslim ettiğinize emin misiniz?
            </Text>
            {selectedLoad && (
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
                {selectedLoad.pickup_city} → {selectedLoad.delivery_city}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: '#DC2626', flex: 1 }]}
                onPress={confirmDelivery}
                activeOpacity={0.8}
              >
                <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>Evet, Teslim Ettim</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, flex: 1 }]}
                onPress={() => setActiveModal(null)}
                activeOpacity={0.7}
              >
                <Text style={[typography.label, { color: colors.text }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Voice command bottom sheet */}
      <Modal visible={activeModal === 'voice'} transparent animationType="slide">
        <TouchableOpacity style={styles.modalMask} activeOpacity={1} onPress={() => { stt.abort(); setActiveModal(null); }}>
          <View style={[styles.voiceSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {stt.isListening ? (
              <View style={styles.listeningContainer}>
                <View style={[styles.listeningPulse, { backgroundColor: colors.primary + '25' }]}>
                  <Text style={styles.micIcon}>🎤</Text>
                </View>
                <Text style={[typography.h3, { color: colors.primary, fontWeight: '800', marginTop: spacing.md }]}>
                  Dinleniyor...
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                  {stt.transcript || 'Bir komut söyleyin'}
                </Text>
                {stt.error && (
                  <Text style={[typography.caption, { color: '#DC2626', marginTop: spacing.sm }]}>
                    {stt.error}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.stopListenBtn, { backgroundColor: '#DC2626' }]}
                  onPress={() => stt.stop()}
                  activeOpacity={0.8}
                >
                  <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>Durdur</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.lg, textAlign: 'center' }]}>
                  Sesli Komutlar
                </Text>
                {stt.transcript && !stt.isListening ? (
                  <View style={[styles.voiceResultBox, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[typography.body, { color: colors.primary, fontWeight: '600', textAlign: 'center' }]}>
                      "{stt.transcript}"
                    </Text>
                  </View>
                ) : stt.error ? (
                  <View style={[styles.voiceResultBox, { backgroundColor: '#DC2626' + '18' }]}>
                    <Text style={[typography.caption, { color: '#DC2626', textAlign: 'center' }]}>
                      {stt.error}
                    </Text>
                  </View>
                ) : null}
                {voiceCommands.map((vc, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.voiceRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => processVoiceCommand(vc.command)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 24, marginRight: spacing.md }}>{vc.icon}</Text>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{vc.command}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.primary, marginTop: spacing.md }]}
                  onPress={async () => { await stt.start(); }}
                  activeOpacity={0.8}
                >
                  <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>🎤 Tekrar Dinle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm }]}
                  onPress={() => setActiveModal(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.label, { color: colors.text }]}>Kapat</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: spacing.lg },
  // UX-005: AETR timer styles
  aetrBar: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  aetrTrack: { height: 6, borderRadius: 3 },
  aetrFill: { height: 6, borderRadius: 3 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  gpsRow: { flexDirection: 'row', alignItems: 'center' },
  gpsDot: { fontSize: 10, marginRight: 6 },
  gpsText: { fontSize: 11 },
  offlineBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  offlineLabel: { fontSize: 9, fontWeight: '700' },
  header: { alignItems: 'center', marginVertical: spacing.xl },
  headerTitle: { fontSize: 28, fontWeight: '800', marginBottom: spacing.xs },
  headerSub: { fontSize: 13 },
  statusBox: {
    borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1,
  },
  statusText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  buttonGrid: { flex: 1, justifyContent: 'center', gap: spacing.md },
  mainBtn: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  btnIcon: { fontSize: 28, marginRight: spacing.md },
  btnLabel: { fontSize: 20, fontWeight: '800' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  loadingText: { fontSize: 14, fontWeight: '600', marginTop: spacing.md },
  bottomBar: { paddingVertical: spacing.xl, alignItems: 'center' },
  bottomText: { fontSize: 12, textAlign: 'center' },
  modalMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  dialog: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl },
  loadRow: { paddingVertical: spacing.md, borderBottomWidth: 1, minHeight: 52 },
  dialogBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', minHeight: 48 },
  voiceSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  handle: { width: 40, height: 5, borderRadius: 2.5, alignSelf: 'center', marginBottom: spacing.lg },
  voiceRow: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
    borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, minHeight: 56,
  },
  voiceResultBox: {
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md,
  },

  // Listening UI
  listeningContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  listeningPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: { fontSize: 36 },
  stopListenBtn: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
});
