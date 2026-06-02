/**
 * Uygulama konfigürasyonu.
 *
 * Ortam değişkenleri öncelik sırası:
 *   1. EAS Build secrets (production build)
 *   2. app.json "extra" alanı (development)
 *   3. Aşağıdaki varsayılan değerler (fallback)
 *
 * Geliştirici kurulumu:
 *   1. .env.example dosyasını .env olarak kopyalayın
 *   2. API_URL ve WS_URL değerlerini kendi IP'nizle güncelleyin
 *   3. app.json "extra" alanına bu değerleri aktarın
 *   (expo-constants sadece app.json extra'yı okur, .env dosyasını değil)
 */

type Environment = 'development' | 'staging' | 'production';

interface AppConfig {
  env: Environment;
  apiBaseUrl: string;
  wsUrl: string;
  sentryDsn: string | null;
  supportPhone: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  featureFlags: {
    enableAIMatching: boolean;
    enableVoiceCommands: boolean;
    enableEscrow: boolean;
    enableFuelAlerts: boolean;
    enablePushNotifications: boolean;
  };
}

// expo-constants'tan extra değişkenleri oku (EAS Build secrets + app.json extra)
function getExtra(): Record<string, any> {
  try {
    const Constants = require('expo-constants');
    return Constants.default?.expoConfig?.extra || {};
  } catch {
    return {};
  }
}

function getEnvironment(): Environment {
  // 1. EAS Build / expo-constants extra üzerinden
  const extra = getExtra();
  if (extra.ENVIRONMENT) return extra.ENVIRONMENT as Environment;

  // 2. __DEV__ global değişkeni (Expo tarafından sağlanır)
  if (__DEV__) return 'development';

  // 3. Varsayılan: production
  return 'production';
}

function buildConfig(): AppConfig {
  const env = getEnvironment();
  const extra = getExtra();

  // Ortama göre varsayılan URL'ler (env var veya extra ile override edilebilir)
  const defaultUrls: Record<Environment, { api: string; ws: string }> = {
    development: {
      // Dev modda API ve Metro aynı port'ta (8082) — Metro API'yi proxy'ler
      api: 'http://192.168.1.34:8082/api/v1',
      ws: 'http://192.168.1.34:8082',
    },
    staging: {
      api: 'https://staging-api.kaptanlojistik.com/api/v1',
      ws: 'https://staging-api.kaptanlojistik.com',
    },
    production: {
      api: 'https://api.kap-tan.com/api/v1',
      ws: 'https://api.kap-tan.com',
    },
  };

  const defaults = defaultUrls[env];

  return {
    env,
    apiBaseUrl: extra.API_URL || defaults.api,
    wsUrl: extra.WS_URL || defaults.ws,
    sentryDsn: extra.SENTRY_DSN || extra.SENTRY_DSSN || null, // SENTRY_DSSN legacy typo tolere edilir
    supportPhone: extra.SUPPORT_PHONE || '08505227826',
    logLevel: (extra.LOG_LEVEL as AppConfig['logLevel']) || (env === 'development' ? 'debug' : 'error'),
    featureFlags: {
      enableAIMatching: extra.FEATURE_AI_MATCHING !== 'false',
      enableVoiceCommands: extra.FEATURE_VOICE_COMMANDS !== 'false' && env !== 'production',
      enableEscrow: extra.FEATURE_ESCROW !== 'false',
      enableFuelAlerts: extra.FEATURE_FUEL_ALERTS !== 'false',
      enablePushNotifications: extra.FEATURE_PUSH_NOTIFICATIONS !== 'false',
    },
  };
}

export const APP_CONFIG = buildConfig();

// Legacy export — mevcut kod bozulmasın diye
export const API_BASE_URL = APP_CONFIG.apiBaseUrl;

// Feature flag helper
export function isFeatureEnabled(flag: keyof AppConfig['featureFlags']): boolean {
  return APP_CONFIG.featureFlags[flag] ?? false;
}

// OR-05: API versiyonlama stratejisi
// apiBaseUrl zaten /api/v1 prefix'ini içeriyor (örn: https://api.kaptanlojistik.com/api/v1).
// Backend'de breaking change olduğunda yeni versiyon (v2) eklenmeli, client kademeli geçiş yapmalı.
// /app/version endpoint'i minimum client sürümünü kontrol eder — zorunlu güncelleme için kullanılır.
// Bkz: services/versionService.ts — checkAppVersion()

// PT-02: Monitoring/Observability yol haritası
// - Sentry DSN: SENTRY_DSN env var ile yapılandırılır (bkz: services/crashReporting.ts)
// - API latency: Axios interceptor'a request/response timing eklenmeli
// - Crash-free rate: Sentry dashboard üzerinden takip edilmeli
// - Custom events: usageAnalytics.ts üzerinden funnel tracking

// PT-03: Test coverage hedefi — minimum %60
// - Component testleri: React Native Testing Library ile src/components/__tests__/
// - Hook testleri: src/hooks/__tests__/ altında
// - Store testleri: src/store/__tests__/ altında
// - E2E: Detox testleri mevcut (e2e/ dizini)

// PT-04: CI/CD pipeline (önerilen)
// - GitHub Actions / EAS Build ile otomatik build
// - PR'da: tsc --noEmit + jest + eslint + prettier check
// - Bundle size: expo-optimize + source-map-explorer
