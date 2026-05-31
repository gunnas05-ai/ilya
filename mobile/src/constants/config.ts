/**
 * Uygulama konfigurasyonu.
 * Dev/Staging/Prod ortamlarina gore otomatik secim yapar.
 */

type Environment = 'development' | 'staging' | 'production';

interface AppConfig {
  env: Environment;
  apiBaseUrl: string;
  wsUrl: string;
  sentryDsn: string | null;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  featureFlags: {
    enableAIMatching: boolean;
    enableVoiceCommands: boolean;
    enableEscrow: boolean;
    enableFuelAlerts: boolean;
    enablePushNotifications: boolean;
  };
}

function getEnvironment(): Environment {
  if (__DEV__) return 'development';
  // staging kontrolu — Expo release channel veya env degiskeni
  return 'production';
}

function buildConfig(): AppConfig {
  const env = getEnvironment();

  const urls: Record<Environment, { api: string }> = {
    development: { api: 'http://192.168.1.34:3000/api/v1' },
    staging:     { api: 'https://staging-api.kaptanlojistik.com/api/v1' },
    production:  { api: 'https://api.kaptanlojistik.com/api/v1' },
  };

  const { api } = urls[env];

  return {
    env,
    apiBaseUrl: api,
    wsUrl: env === 'development' ? 'http://192.168.1.34:3000' : 'https://api.kaptanlojistik.com',
    sentryDsn: null,
    logLevel: env === 'development' ? 'debug' : 'error',
    featureFlags: {
      enableAIMatching: true,
      enableVoiceCommands: env !== 'production',
      enableEscrow: true,
      enableFuelAlerts: true,
      enablePushNotifications: true,
    },
  };
}

export const APP_CONFIG = buildConfig();

// Legacy export — mevcut kod bozulmasin diye
export const API_BASE_URL = APP_CONFIG.apiBaseUrl;

// Feature flag helper
export function isFeatureEnabled(flag: keyof AppConfig['featureFlags']): boolean {
  return APP_CONFIG.featureFlags[flag] ?? false;
}
