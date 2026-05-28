import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  SecureStore = require('expo-secure-store');
} catch {}

const TOKEN_KEY = '@auth_tokens_secure';
const USER_KEY = '@auth_user_secure';

function obfuscate(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ 0x5A);
  }
  return result;
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (SecureStore && Platform.OS !== 'web') {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } else {
    await AsyncStorage.setItem(key, obfuscate(value));
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (SecureStore && Platform.OS !== 'web') {
    return SecureStore.getItemAsync(key);
  }
  const raw = await AsyncStorage.getItem(key);
  return raw ? obfuscate(raw) : null;
}

export async function removeSecureItem(key: string): Promise<void> {
  if (SecureStore && Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

export async function removeSecureItems(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => removeSecureItem(k)));
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setSecureItem(TOKEN_KEY, JSON.stringify({ accessToken, refreshToken }));
}

export async function saveUser(user: object): Promise<void> {
  await setSecureItem(USER_KEY, JSON.stringify(user));
}

export async function getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const raw = await getSecureItem(TOKEN_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function getUser<T>(): Promise<T | null> {
  const raw = await getSecureItem(USER_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function clearSession(): Promise<void> {
  await removeSecureItems([TOKEN_KEY, USER_KEY]);
}
