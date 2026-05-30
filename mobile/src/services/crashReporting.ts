/**
 * Crash reporting servisi.
 * Production'da Sentry'ye, development'da console'a raporlar.
 * Sentry DSN config'den gelir — null ise crash reporting kapali.
 */
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants/config';

interface CrashContext {
  screen?: string;
  userId?: string;
  tags?: Record<string, string>;
}

let currentUser: { id: string; email: string } | null = null;

/** Sentry benzeri crash reporting. Gercek Sentry SDK kurulana kadar manual. */
export const crashReporting = {
  /** Hata raporla */
  reportError(error: Error, context: CrashContext = {}) {
    if (APP_CONFIG.env === 'development') {
      console.error('[CrashReport]', error.message, context);
      return;
    }

    // Production: sentry DSN varsa gonder
    if (APP_CONFIG.sentryDsn) {
      this.sendToSentry(error, context);
    }
  },

  /** Kullaniciyi tanimla (tum raporlara eklenir) */
  setUser(user: { id: string; email: string } | null) {
    currentUser = user;
  },

  /** Breadcrumb — kullanici aksiyonu log'u */
  leaveBreadcrumb(message: string, category: string = 'manual') {
    if (APP_CONFIG.env === 'development') return;
    console.log(`[Breadcrumb] [${category}] ${message}`);
  },

  /** Sentry API'sine manuel gonderim */
  async sendToSentry(error: Error, context: CrashContext) {
    if (!APP_CONFIG.sentryDsn) return;
    try {
      await fetch(APP_CONFIG.sentryDsn.replace('/api/', '/api/store/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exception: { values: [{ type: error.name, value: error.message }] },
          user: currentUser ? { id: currentUser.id, email: currentUser.email } : undefined,
          tags: { environment: APP_CONFIG.env, platform: Platform.OS, screen: context.screen || 'unknown', ...context.tags },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Crash reporting basarisiz olursa sessizce devam et
    }
  },
};
