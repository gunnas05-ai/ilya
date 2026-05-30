import { handleError, isNetworkError, isAuthError, extractMessage } from '../../services/errorService';

// Mock the toast import
jest.mock('../../utils/toast', () => ({
  showToast: jest.fn(),
}));

describe('errorService', () => {
  describe('isNetworkError', () => {
    it('should detect ERR_NETWORK', () => {
      expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
    });

    it('should detect timeout', () => {
      expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true);
    });

    it('should detect Network Error message', () => {
      expect(isNetworkError(new Error('Network Error'))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isNetworkError(new Error('Something else'))).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('should detect 401 status', () => {
      expect(isAuthError({ response: { status: 401 } })).toBe(true);
      expect(isAuthError({ status: 401 })).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isAuthError({ response: { status: 500 } })).toBe(false);
    });
  });

  describe('handleError', () => {
    it('should return message string without throwing', () => {
      const msg = handleError(new Error('test error'), { screen: 'Test', severity: 'silent' });
      expect(msg).toBe('test error');
    });

    it('should extract message from axios-like error', () => {
      const axiosError = { response: { data: { message: 'API error' } } };
      const msg = handleError(axiosError, { severity: 'silent' });
      expect(msg).toBe('API error');
    });

    it('should handle null/undefined gracefully', () => {
      expect(handleError(null, { severity: 'silent' })).toContain('Bilinmeyen');
      expect(handleError(undefined, { severity: 'silent' })).toContain('Bilinmeyen');
    });
  });
});
