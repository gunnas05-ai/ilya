/**
 * Deep link ve URL yönlendirme konfigürasyonu.
 * Yetkisiz erişim için auth guard içerir.
 */
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

const PROTECTED_DEEP_LINKS = new Set([
  'LoadAcceptDetail', 'LoadTrackingDetail', 'ChatRoom', 'InvoiceDetail',
  'Wallet', 'DriveMode', 'DriverDashboard', 'AiDialog', 'Finance',
]);

const DEEP_LINK_SCREENS: Record<string, string> = {
  login: 'Login',
  '': 'MainTabs',
  drivemode: 'DriveMode',
  dashboard: 'DriverDashboard',
  'load/:loadId': 'LoadAcceptDetail',
  'tracking/:loadId': 'LoadTrackingDetail',
  'chat/:roomId': 'ChatRoom',
  'invoice/:invoiceId': 'InvoiceDetail',
  wallet: 'Wallet',
  fuel: 'FuelStations',
  restaurants: 'Restaurants',
  parts: 'PartMarketHome',
  vehicles: 'ListingsBrowse',
  finance: 'Finance',
  ai: 'AiDialog',
};

export function createLinkingConfig(
  isAuthenticated: boolean,
): LinkingOptions<RootStackParamList> {
  return {
    prefixes: ['kaptan://', 'https://www.kap-tan.com', 'https://kap-tan.com', 'https://kaptanlojistik.com', 'https://app.kaptanlojistik.com'],
    config: {
      screens: {
        Login: 'login',
        MainTabs: '',
        DriveMode: 'drivemode',
        DriverDashboard: 'dashboard',
        LoadAcceptDetail: 'load/:loadId',
        LoadTrackingDetail: 'tracking/:loadId',
        ChatRoom: 'chat/:roomId',
        InvoiceDetail: 'invoice/:invoiceId',
        Wallet: 'wallet',
        FuelStations: 'fuel',
        Restaurants: 'restaurants',
        PartMarketHome: 'parts',
        ListingsBrowse: 'vehicles',
        Finance: 'finance',
        AiDialog: 'ai',
      },
    },
    getStateFromPath(path: string, options: any) {
      const state = (options as any)?.getStateFromPath?.(path) ?? parseDeepLinkPath(path);

      // Auth guard: yetkisiz kullanıcıyı login'e yönlendir
      if (!isAuthenticated && state?.routes?.length) {
        const target = state.routes[0]?.name;
        if (target && PROTECTED_DEEP_LINKS.has(target)) {
          return { routes: [{ name: 'Login' }] };
        }
      }
      return state;
    },
  };
}

function parseDeepLinkPath(path: string): { routes: Array<{ name: string; params?: any }> } {
  const routes: Array<{ name: string; params?: any }> = [];
  const parts = path.replace(/^\//, '').split('/');

  const screenName = DEEP_LINK_SCREENS[parts[0]];
  if (screenName === 'LoadAcceptDetail' && parts[1]) {
    routes.push({ name: 'LoadAcceptDetail', params: { loadId: parts[1] } });
  } else if (screenName === 'LoadTrackingDetail' && parts[1]) {
    routes.push({ name: 'LoadTrackingDetail', params: { loadId: parts[1] } });
  } else if (screenName === 'ChatRoom' && parts[1]) {
    routes.push({ name: 'ChatRoom', params: { roomId: parts[1] } });
  } else if (screenName === 'InvoiceDetail' && parts[1]) {
    routes.push({ name: 'InvoiceDetail', params: { invoiceId: parts[1] } });
  } else if (screenName) {
    routes.push({ name: screenName });
  } else {
    routes.push({ name: 'MainTabs' });
  }

  return { routes };
}
