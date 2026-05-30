// Test ortami icin gerekli environment degiskenleri
process.env.ENCRYPTION_KEY = 'test-encryption-key-32chars!!';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';
