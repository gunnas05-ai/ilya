/**
 * App rating prompt servisi.
 * Kullaniciya belirli kosullar saglandiginda uygulamayi
 * degerlendirmesi icin hatirlatma gosterir.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';

const RATING_KEY = '@app_rating_state';

interface RatingState {
  launchCount: number;
  lastPromptDate: string | null;
  hasRated: boolean;
  positiveActions: number;
}

const PROMPT_CONFIG = {
  minLaunches: 5,           // En az 5 kere acilmis olmali
  minPositiveActions: 3,    // En az 3 pozitif aksiyon (yuk olusturma, teklif verme vs)
  cooldownDays: 30,         // Prompt sonrasi 30 gun bekle
};

async function getState(): Promise<RatingState> {
  const raw = await AsyncStorage.getItem(RATING_KEY);
  return raw ? JSON.parse(raw) : { launchCount: 0, lastPromptDate: null, hasRated: false, positiveActions: 0 };
}

async function saveState(state: RatingState): Promise<void> {
  await AsyncStorage.setItem(RATING_KEY, JSON.stringify(state));
}

/** Uygulama acilisinda cagir */
export async function trackAppLaunch(): Promise<void> {
  const state = await getState();
  state.launchCount += 1;
  await saveState(state);
}

/** Kullanici olumlu bir aksiyon yaptiginda cagir */
export async function trackPositiveAction(): Promise<void> {
  const state = await getState();
  state.positiveActions += 1;
  await saveState(state);
}

/** Rating prompt'unu gosterme zamani geldi mi? */
export async function shouldShowRatingPrompt(): Promise<boolean> {
  const state = await getState();
  if (state.hasRated) return false;

  const daysSinceLastPrompt = state.lastPromptDate
    ? (Date.now() - new Date(state.lastPromptDate).getTime()) / (1000 * 60 * 60 * 24)
    : PROMPT_CONFIG.cooldownDays + 1;

  return (
    state.launchCount >= PROMPT_CONFIG.minLaunches &&
    state.positiveActions >= PROMPT_CONFIG.minPositiveActions &&
    daysSinceLastPrompt > PROMPT_CONFIG.cooldownDays
  );
}

/** Rating prompt'unu goster */
export async function showRatingPrompt(): Promise<void> {
  const state = await getState();

  Alert.alert(
    'KAPTAN\'ı Değerlendir ⭐',
    'Uygulamamızdan memnun musunuz? Deneyiminizi değerlendirerek geliştirmemize yardımcı olun!',
    [
      {
        text: 'Şimdi Değerlendir ⭐',
        onPress: async () => {
          state.hasRated = true;
          state.lastPromptDate = new Date().toISOString();
          await saveState(state);
          const url = Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/kaptan-lojistik/id6739930540?action=write-review'
            : 'https://play.google.com/store/apps/details?id=com.ilyaduran.kaptanlojistik&showAllReviews=true';
          Linking.openURL(url);
        },
      },
      {
        text: 'Sonra',
        onPress: async () => {
          state.lastPromptDate = new Date().toISOString();
          await saveState(state);
        },
      },
      { text: 'Kapat', style: 'cancel' },
    ],
  );
}
