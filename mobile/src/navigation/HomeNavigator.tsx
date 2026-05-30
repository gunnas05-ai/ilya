import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { spacing, radius } from '../theme';
import CustomBackButton from './CustomBackButton';
import ThemeToggle from './ThemeToggle';
import HomeScreen from '../screens/HomeScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeNavigator() {
  const { colors, isDark } = useTheme();
  const { isGuest, logout } = useAuthStore();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerLeft: () =>
          navigation.canGoBack() ? (
            <CustomBackButton navigation={navigation} isDark={isDark} colors={colors} />
          ) : null,
        headerTintColor: '#FF6B00',
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      })}
    >
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{
          title: '',
          headerTitle: () => null,
          headerRight: () =>
            isGuest ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
                <TouchableOpacity
                  onPress={() => logout()}
                  style={{
                    backgroundColor: '#FF6B00',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radius.md,
                    shadowColor: '#FF6B00',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 2,
                    elevation: 2,
                    marginRight: 8,
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Üye Ol"
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>Üye Ol</Text>
                </TouchableOpacity>
                <ThemeToggle />
              </View>
            ) : (
              <ThemeToggle />
            ),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
