import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, useColorScheme } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import './src/i18n';
import Navigation from './src/navigation';
import OfflineBar from './src/components/shared/OfflineBar';
import { ErrorBoundary } from './src/components/shared/ErrorBoundary';
import { ToastProvider } from './src/utils/toast';
import { queryClient } from './src/services/queryClient';
import { checkAppVersion } from './src/services/versionService';
import { trackAppLaunch, shouldShowRatingPrompt, showRatingPrompt } from './src/services/ratingService';
import { notificationService } from './src/services/notificationService';
import { useThemeStore } from './src/store/themeStore';

export default function App() {
  const { mode, loadTheme } = useThemeStore();
  const scheme = useColorScheme();

  useEffect(() => {
    loadTheme();
    checkAppVersion();
    trackAppLaunch().then(() => {
      shouldShowRatingPrompt().then(show => { if (show) setTimeout(showRatingPrompt, 3000); });
    });
    // Push notification token kaydi — expo-notifications kuruluysa
    try {
      const Notifications = require('expo-notifications');
      Notifications.getExpoPushTokenAsync?.()
        .then((token: any) => token?.data && notificationService.registerPushToken(token.data))
        .catch(() => {});
    } catch {}
  }, []);

  const resolved = mode === 'system' ? scheme ?? 'light' : mode;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
              <OfflineBar />
              <Navigation />
            </ToastProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
