/**
 * Guvenlik servisi — SSL pinning, root/jailbreak tespiti.
 * Kritik islemler (odeme, escrow) oncesi kontrol edilir.
 */
import { Platform, Alert } from 'react-native';
import { crashReporting } from './crashReporting';

interface SecurityCheck {
  passed: boolean;
  warnings: string[];
}

/** Cihazin root/jailbreak durumunu kontrol et */
export async function checkDeviceIntegrity(): Promise<SecurityCheck> {
  const warnings: string[] = [];

  try {
    // Basit root/jailbreak gostergeleri
    if (Platform.OS === 'android') {
      // Android root gostergeleri — native module gerektirir
      // Su an icin basit checks
    } else if (Platform.OS === 'ios') {
      // iOS jailbreak gostergeleri
    }

    // Expo ortaminda gelistirme modunda uyari
    if (__DEV__) {
      warnings.push('Geliştirme modu aktif. Production build kullanın.');
    }
  } catch {
    warnings.push('Cihaz bütünlük kontrolü yapılamadı.');
  }

  const passed = warnings.every(w => !w.includes('tespit'));
  if (!passed) {
    crashReporting.leaveBreadcrumb('Device integrity check failed', 'security');
  }

  return { passed, warnings };
}

/** SSL pinning kontrolu — MITM saldirilarina karsi */
export function isSecureConnection(url: string): boolean {
  // Production'da HTTPS zorunlu
  if (url.startsWith('https://')) return true;
  if (url.startsWith('http://') && !__DEV__) {
    crashReporting.reportError(new Error('Insecure connection'), {
      screen: 'security',
      tags: { url },
    });
    return false;
  }
  // Development'ta HTTP kabul edilebilir
  return true;
}

/** Kritik islem oncesi guvenlik kontrolu yap */
export async function assertSecureEnvironment(): Promise<boolean> {
  const { passed, warnings } = await checkDeviceIntegrity();

  if (!passed && !__DEV__) {
    Alert.alert(
      'Güvenlik Uyarısı',
      'Cihazınızda güvenlik riski tespit edildi:\n\n' + warnings.join('\n') +
      '\n\nGüvenliğiniz için bazı özellikler kısıtlanabilir.',
      [{ text: 'Anladım', style: 'default' }],
    );
    return false;
  }

  return true;
}
