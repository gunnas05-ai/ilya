import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, useColorScheme } from 'react-native';
import './src/i18n';
import Navigation from './src/navigation';
import OfflineBar from './src/components/shared/OfflineBar';
import { useThemeStore } from './src/store/themeStore';

export default function App() {
  const { mode, loadTheme } = useThemeStore();
  const scheme = useColorScheme();

  useEffect(() => {
    loadTheme();
  }, []);

  const resolved = mode === 'system' ? scheme ?? 'light' : mode;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
        <OfflineBar />
        <Navigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
