import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  SecureStore = require('expo-secure-store');
} catch {}

const TOKEN_KEY = 'auth_tokens_secure';
const USER_KEY = 'auth_user_secure';
const OLD_TOKEN_KEY = '@auth_tokens_secure';
const OLD_USER_KEY = '@auth_user_secure';

function isSecureAvailable(): boolean {
  return !!(SecureStore && Platform.OS !== 'web');
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (isSecureAvailable()) {
    await SecureStore!.setItemAsync(key, value, {
      keychainAccessible: SecureStore!.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } else {
    // Web / fallback: AsyncStorage (not encrypted — dev only)
    if (process.env.NODE_ENV === 'production') {
      console.error('[SecureStorage] SecureStore unavailable in production — tokens stored in plaintext!');
    }
    await AsyncStorage.setItem(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (isSecureAvailable()) {
    return SecureStore!.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function removeSecureItem(key: string): Promise<void> {
  if (isSecureAvailable()) {
    await SecureStore!.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

async function removeSecureItems(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => removeSecureItem(k)));
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setSecureItem(TOKEN_KEY, JSON.stringify({ accessToken, refreshToken }));
}

export async function saveUser(user: object): Promise<void> {
  await setSecureItem(USER_KEY, JSON.stringify(user));
}

export async function getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  let raw = await getSecureItem(TOKEN_KEY);
  if (!raw) {
    raw = await getSecureItem(OLD_TOKEN_KEY);
    if (raw) {
      await setSecureItem(TOKEN_KEY, raw);
      await removeSecureItem(OLD_TOKEN_KEY);
    }
  }
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function getUser<T>(): Promise<T | null> {
  let raw = await getSecureItem(USER_KEY);
  if (!raw) {
    raw = await getSecureItem(OLD_USER_KEY);
    if (raw) {
      await setSecureItem(USER_KEY, raw);
      await removeSecureItem(OLD_USER_KEY);
    }
  }
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function clearSession(): Promise<void> {
  await removeSecureItems([TOKEN_KEY, USER_KEY]);
}
