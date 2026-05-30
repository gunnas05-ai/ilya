// Jest setup — runs after jest-expo setup

// Mock AsyncStorage for all tests
jest.mock('@react-native-async-storage/async-storage', () => {
  const mockStorage = {};
  return {
    setItem: jest.fn((key, value) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    getItem: jest.fn((key) => Promise.resolve(mockStorage[key] || null)),
    removeItem: jest.fn((key) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys) => Promise.resolve(keys.map(k => [k, mockStorage[k] || null]))),
    multiRemove: jest.fn((keys) => {
      keys.forEach(k => delete mockStorage[k]);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  };
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => () => {}),
}));

// Mock toast (avoid Alert.alert imports in tests)
jest.mock('./src/utils/toast', () => ({
  showToast: jest.fn(),
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast: jest.fn() }),
}));

// Mock haptics
jest.mock('./src/utils/haptic', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticError: jest.fn(),
}));

// Silence console.error in tests (handleError logs errors)
const origError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('[ErrorService]')) return; // Suppress expected error service logs
  origError(...args);
};
