import { encryptPII, decryptPII, maskPII, EncryptedTransformer } from './encryption.util';

describe('Encryption Util (PII/KVKK)', () => {
  describe('encryptPII / decryptPII', () => {
    it('metin sifrelenip cozulebilir', () => {
      const original = '12345678901';
      const encrypted = encryptPII(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted.length).toBeGreaterThan(original.length);
      expect(decryptPII(encrypted)).toBe(original);
    });

    it('Turkce karakterler sifrelenip cozulebilir', () => {
      const original = 'Ahmet Yılmaz Özçelik';
      const encrypted = encryptPII(original);
      expect(decryptPII(encrypted)).toBe(original);
    });

    it('her sifreleme farkli cikti uretir (IV random)', () => {
      const plain = 'test_data';
      const enc1 = encryptPII(plain);
      const enc2 = encryptPII(plain);
      expect(enc1).not.toBe(enc2);
      // Ama ikisi de ayni metne cozulur
      expect(decryptPII(enc1)).toBe(plain);
      expect(decryptPII(enc2)).toBe(plain);
    });
  });

  describe('maskPII', () => {
    it('isim maskelenir', () => {
      expect(maskPII('Ahmet')).toBe('A***t');
    });

    it('e-posta maskelenir', () => {
      expect(maskPII('ahmet@firma.com')).toBe('a***@firma.com');
    });

    it('kisa metin *** doner', () => {
      expect(maskPII('A')).toBe('***');
    });

    it('bos metin *** doner', () => {
      expect(maskPII('')).toBe('***');
    });
  });

  describe('EncryptedTransformer', () => {
    it('to → sifreler', () => {
      const encrypted = EncryptedTransformer.to('test');
      expect(encrypted).not.toBe('test');
    });

    it('from → cozer', () => {
      const encrypted = EncryptedTransformer.to('test123');
      expect(EncryptedTransformer.from(encrypted)).toBe('test123');
    });

    it('null/undefined degerler oldugu gibi doner', () => {
      expect(EncryptedTransformer.to(null as any)).toBeNull();
      expect(EncryptedTransformer.to(undefined as any)).toBeUndefined();
    });
  });
});
