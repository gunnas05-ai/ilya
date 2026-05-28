import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';
import { saveTokens, saveUser, getTokens, getUser, clearSession } from '../services/secureStorage';

const KVKK_KEY = '@auth_kvkk_text';
const PROMO_KEY = '@auth_promo_settings';

// Eski AsyncStorage anahtarları (migrasyon için)
const OLD_TOKEN_KEY = '@auth_tokens';
const OLD_USER_KEY = '@auth_user';

export type UIRole = 'FIRMA' | 'TASIYICI' | 'ISLETME' | 'GENEL';
export type AppRole = 'SUPER_ADMIN' | 'SHIPPER' | 'DRIVER' | 'BUSINESS' | 'GENERAL_USER' | 'GUEST';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: AppRole;
  dbRole: string;
  isActive: boolean;
  isPhoneVerified?: boolean;
  companyTitle?: string;
  businessType?: string;
  hasBudgetIntegration?: boolean;
}

export interface RegisterPayload {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  uiRole: UIRole;
  kvkkAccepted: boolean;
  termsAccepted: boolean;
  companyTitle?: string;
  taxNo?: string;
  taxOfficeName?: string;
  authorizedPerson?: string;
  licenseType?: string;
  vehicleType?: string;
  plateNumber?: string;
  srcBelgesi?: string;
  businessType?: string;
  businessAddress?: string;
  inviteCode?: string;
}

export interface PromotionSettings {
  campaignName: string;
  rewardType: 'COMMISSION_CUT' | 'FUEL_DISCOUNT' | 'CASH_BACK';
  referrerReward: number;
  refereeReward: number;
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  kvkkText: string;
  promotions: PromotionSettings;
  pendingUserId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<{ userId: string }>;
  verifyOtp: (userId: string, otp: string) => Promise<void>;
  resendOtp: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  continueAsGuest: () => void;
  usersList: any[];
  fetchUsersList: () => Promise<void>;
  updateSuperAdminProfile: (fullName: string, email: string) => Promise<void>;
  updatePromotionSettings: (settings: Partial<PromotionSettings>) => Promise<void>;
  updateKVKKText: (text: string) => Promise<void>;
}

const DB_TO_APP_ROLE: Record<string, AppRole> = {
  super_admin: 'SUPER_ADMIN',
  admin: 'SUPER_ADMIN',
  yuk_veren: 'SHIPPER',
  tasiyici: 'DRIVER',
  sofor: 'DRIVER',
  filo_yoneticisi: 'DRIVER',
  isletme: 'BUSINESS',
  platform_operatoru: 'BUSINESS',
  genel: 'GENERAL_USER',
  marketplace_alici: 'GENERAL_USER',
  marketplace_satici: 'GENERAL_USER',
  guest: 'GUEST',
};

const DEFAULT_KVKK = `KVKK ve Gizlilik Sözleşmesi:\nKişisel verilerinizin işlenmesine ilişkin bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca hazırlanmıştır.\nVerileriniz, platform operasyonlarının sürdürülebilmesi ve güvenli lojistik işlemlerinin gerçekleştirilmesi amacıyla güvenli veri tabanlarımızda şifrelenmiş olarak saklanır.\nDilediğiniz an verilerinizin silinmesini talep edebilir ve yasal haklarınızı kullanabilirsiniz.`;

const DEFAULT_PROMO: PromotionSettings = {
  campaignName: 'Genel Kullanıcı Davet Kampanyası',
  rewardType: 'COMMISSION_CUT',
  referrerReward: 10,
  refereeReward: 500,
  isActive: true,
};

function buildUser(apiUser: any): AuthUser {
  const appRole: AppRole = DB_TO_APP_ROLE[apiUser.role] || 'GENERAL_USER';
  return {
    id: apiUser.id,
    email: apiUser.email,
    fullName: apiUser.fullName,
    phone: apiUser.phone,
    role: appRole,
    dbRole: apiUser.role,
    isActive: apiUser.isActive,
    isPhoneVerified: apiUser.isPhoneVerified,
    companyTitle: apiUser.companyTitle,
    businessType: apiUser.businessType,
    hasBudgetIntegration: apiUser.hasBudgetIntegration ?? false,
  };
}

async function migrateOldTokens(): Promise<boolean> {
  try {
    const oldTokenRaw = await AsyncStorage.getItem(OLD_TOKEN_KEY);
    if (oldTokenRaw) {
      const { accessToken, refreshToken } = JSON.parse(oldTokenRaw);
      if (accessToken) {
        await saveTokens(accessToken, refreshToken || '');
      }
      await AsyncStorage.removeItem(OLD_TOKEN_KEY);
      return true;
    }
  } catch {}
  return false;
}

async function migrateOldUser(): Promise<any | null> {
  try {
    const oldUserRaw = await AsyncStorage.getItem(OLD_USER_KEY);
    if (oldUserRaw) {
      const user = JSON.parse(oldUserRaw);
      await saveUser(user);
      await AsyncStorage.removeItem(OLD_USER_KEY);
      return user;
    }
  } catch {}
  return null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,
  kvkkText: DEFAULT_KVKK,
  promotions: DEFAULT_PROMO,
  usersList: [],
  pendingUserId: null,

  login: async (email, password) => {
    if (!password) throw new Error('Şifre zorunludur');

    const res = await apiClient.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    const responseData = res.data.data || res.data;
    const { accessToken, refreshToken, user: apiUser } = responseData;

    const user = buildUser(apiUser);

    await saveTokens(accessToken, refreshToken || '');
    await saveUser(user);
    set({ user, token: accessToken, isAuthenticated: true, isGuest: false });
  },

  register: async (data) => {
    const res = await apiClient.post('/auth/register', {
      email: data.email.trim().toLowerCase(),
      phone: data.phone,
      password: data.password,
      fullName: data.fullName,
      uiRole: data.uiRole,
      kvkkAccepted: data.kvkkAccepted,
      termsAccepted: data.termsAccepted,
      companyTitle: data.companyTitle,
      taxNo: data.taxNo,
      taxOfficeName: data.taxOfficeName,
      authorizedPerson: data.authorizedPerson,
      licenseType: data.licenseType,
      vehicleType: data.vehicleType,
      plateNumber: data.plateNumber,
      srcBelgesi: data.srcBelgesi,
      businessType: data.businessType,
      businessAddress: data.businessAddress,
      inviteCode: data.inviteCode,
    });

    const responseData = res.data.data || res.data;
    const userId: string = responseData.userId;
    set({ pendingUserId: userId });
    return { userId };
  },

  verifyOtp: async (userId, otp) => {
    const res = await apiClient.post('/auth/verify-otp', { userId, otpCode: otp });
    const responseData = res.data.data || res.data;
    const { accessToken, refreshToken, user: apiUser } = responseData;

    const user = buildUser(apiUser);

    await saveTokens(accessToken, refreshToken || '');
    await saveUser(user);
    set({ user, token: accessToken, isAuthenticated: true, isGuest: false, pendingUserId: null });
  },

  resendOtp: async (userId) => {
    await apiClient.post('/auth/resend-otp', { userId });
  },

  logout: async () => {
    try {
      // Backend'e logout bildirimi gönder (token iptali için)
      await apiClient.post('/auth/logout').catch(() => {});
    } catch {}
    await clearSession();
    set({ user: null, token: null, isAuthenticated: false, isGuest: false });
  },

  restoreSession: async () => {
    try {
      // Eski AsyncStorage'dan migrate et
      await migrateOldTokens();
      const migratedUser = await migrateOldUser();

      const [kvkkRaw, promoRaw] = await AsyncStorage.multiGet([KVKK_KEY, PROMO_KEY]);
      const loadedKvkk = kvkkRaw[1] ?? DEFAULT_KVKK;
      const loadedPromo = promoRaw[1] ? JSON.parse(promoRaw[1]) : DEFAULT_PROMO;

      const tokens = await getTokens();
      const user = migratedUser || await getUser<any>();

      if (tokens?.accessToken && user) {
        // JWT expiration kontrolü
        try {
          const payloadBase64 = tokens.accessToken.split('.')[1];
          const payload = JSON.parse(atob(payloadBase64));
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            // Token süresi dolmuş, refresh dene
            if (tokens.refreshToken) {
              try {
                const refreshRes = await apiClient.post('/auth/refresh', { refreshToken: tokens.refreshToken });
                const newTokens = refreshRes.data.data || refreshRes.data;
                await saveTokens(newTokens.accessToken, newTokens.refreshToken || tokens.refreshToken);
                set({ user, token: newTokens.accessToken, isAuthenticated: true, isGuest: false, isLoading: false, kvkkText: loadedKvkk, promotions: loadedPromo });
                return;
              } catch {
                // Refresh başarısız, logout
              }
            }
            await clearSession();
            set({ user: null, token: null, isAuthenticated: false, isGuest: false, isLoading: false, kvkkText: loadedKvkk, promotions: loadedPromo });
            return;
          }
        } catch {
          // JWT decode başarısız olursa temizle
          await clearSession();
          set({ user: null, token: null, isAuthenticated: false, isGuest: false, isLoading: false, kvkkText: loadedKvkk, promotions: loadedPromo });
          return;
        }

        set({ user, token: tokens.accessToken, isAuthenticated: true, isGuest: false, isLoading: false, kvkkText: loadedKvkk, promotions: loadedPromo });
      } else {
        set({ isLoading: false, isGuest: false, kvkkText: loadedKvkk, promotions: loadedPromo });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  continueAsGuest: () => {
    set({ user: null, token: null, isAuthenticated: true, isGuest: true });
  },

  updateSuperAdminProfile: async (fullName, email) => {
    const { user } = get();
    if (user && user.role === 'SUPER_ADMIN') {
      const updatedUser = { ...user, fullName, email: email.trim().toLowerCase() };
      await saveUser(updatedUser);
      set({ user: updatedUser });
    }
  },

  updatePromotionSettings: async (settings) => {
    const updatedPromo = { ...get().promotions, ...settings };
    await AsyncStorage.setItem(PROMO_KEY, JSON.stringify(updatedPromo));
    set({ promotions: updatedPromo });
  },

  updateKVKKText: async (text) => {
    await AsyncStorage.setItem(KVKK_KEY, text);
    set({ kvkkText: text });
  },

  fetchUsersList: async () => {
    try {
      const res = await apiClient.get('/users');
      const users = res.data?.data?.data || res.data?.data || res.data || [];
      set({ usersList: Array.isArray(users) ? users : [] });
    } catch {
      set({ usersList: [] });
    }
  },
}));
