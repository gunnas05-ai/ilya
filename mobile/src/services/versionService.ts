import { Alert, Linking, Platform } from 'react-native';
import { apiClient } from './api';

interface VersionInfo {
  minVersion: string;
  latestVersion: string;
  updateUrl?: string;
  forceUpdate: boolean;
  releaseNotes?: string;
}

/** Uygulama versiyonunu kontrol eder, guncelleme varsa kullaniciyi uyarir */
export async function checkAppVersion(): Promise<void> {
  try {
    const res = await apiClient.get('/app/version');
    const info: VersionInfo = res.data?.data || res.data;

    // Expo'dan versiyon oku
    let currentVersion = '1.0.0';
    try {
      const Constants = require('expo-constants');
      currentVersion = Constants.default?.expoConfig?.version || '1.0.0';
    } catch {
      // expo-constants yoksa varsayilan versiyon
    }

    if (!info) return;

    const current = parseVersion(currentVersion);
    const minimum = parseVersion(info.minVersion);
    const latest = parseVersion(info.latestVersion);

    // Zorunlu guncelleme
    if (current < minimum) {
      Alert.alert(
        'Güncelleme Gerekli',
        `Uygulamanın yeni bir sürümü mevcut (${info.latestVersion}). Devam etmek için güncelleme yapmalısınız.\n\n${info.releaseNotes || ''}`,
        [
          {
            text: 'Güncelle',
            onPress: () => {
              const url = info.updateUrl || getStoreUrl();
              Linking.openURL(url);
            },
          },
        ],
        { cancelable: false },
      );
      return;
    }

    // Opsiyonel guncelleme (en son surumden 2 minor gerideyse)
    if (current < latest && latest.minor - current.minor >= 2) {
      Alert.alert(
        'Yeni Güncelleme',
        `${info.latestVersion} sürümü mevcut. Güncellemek ister misiniz?\n\n${info.releaseNotes || ''}`,
        [
          { text: 'Sonra', style: 'cancel' },
          {
            text: 'Güncelle',
            onPress: () => {
              const url = info.updateUrl || getStoreUrl();
              Linking.openURL(url);
            },
          },
        ],
      );
    }
  } catch {
    // Versiyon kontrolu basarisiz — sessizce devam et
  }
}

function parseVersion(v: string): { major: number; minor: number; patch: number } {
  const parts = v.split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function getStoreUrl(): string {
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/kaptan-lojistik/id6739930540'
    : 'https://play.google.com/store/apps/details?id=com.ilyaduran.kaptanlojistik';
}
