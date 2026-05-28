import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { lightColors, darkColors } from '../theme';

export function useTheme() {
  const { mode } = useThemeStore();
  const systemScheme = useColorScheme();

  const resolved =
    mode === 'system' ? systemScheme ?? 'light' : mode;

  const isDark = resolved === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return { colors, isDark, mode };
}
