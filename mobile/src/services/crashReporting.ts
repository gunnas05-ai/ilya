/**
 * Crash reporting servisi.
 * Production'da Sentry'ye, tum ortamlarda backend'e gonderir.
 */
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants/config';
import { apiClient } from './api';

interface CrashContext {
  screen?: string;
  userId?: string;
  tags?: Record<string, string>;
}

let currentUser: { id: string; email: string } | null = null;

export const crashReporting = {
  reportError(error: Error, context: CrashContext = {}) {
    if (APP_CONFIG.env === 'development') {
      console.error('[CrashReport]', error.message, context);
    }

    // Backend'e gonder
    this.sendToBackend(error, context);

    // Sentry DSN varsa ek olarak Sentry'ye de gonder
    if (APP_CONFIG.sentryDsn) {
      this.sendToSentry(error, context);
    }
  },

  setUser(user: { id: string; email: string } | null) {
    currentUser = user;
  },

  leaveBreadcrumb(message: string, category: string = 'manual') {
    if (APP_CONFIG.env === 'development') return;
    console.log(`[Breadcrumb] [${category}] ${message}`);
  },

  async sendToBackend(error: Error, context: CrashContext) {
    try {
      await apiClient.post('/admin/crash-reports', {
        errorMessage: error.message,
        stackTrace: error.stack?.substring(0, 2000) || null,
        screen: context.screen || null,
        platform: Platform.OS,
        appVersion: null,
      });
    } catch {
      // Sessizce devam et
    }
  },

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
      // Sessizce devam et
    }
  },
};
