import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY env var is required for PII encryption');
}
const ENC_KEY = scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

/**
 * KVKK/GDPR uyumlu PII (Personally Identifiable Information) sifreleme.
 * AES-256-CBC ile sifreler, Base64 olarak saklar.
 *
 * TypeORM transformer olarak kullanilabilir:
 *   @Column({ transformer: EncryptedTransformer })
 *   tcKimlikNo: string;
 */

export function encryptPII(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const encrypted = Buffer.concat([iv, cipher.update(plaintext, 'utf-8'), cipher.final()]);
  return encrypted.toString('base64');
}

export function decryptPII(ciphertext: string): string {
  const buffer = Buffer.from(ciphertext, 'base64');
  const iv = buffer.subarray(0, 16);
  const encrypted = buffer.subarray(16);
  const decipher = createDecipheriv('aes-256-cbc', ENC_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf-8');
}

export const EncryptedTransformer = {
  to: (value: string): string => (value ? encryptPII(value) : value),
  from: (value: string): string => (value ? decryptPII(value) : value),
};

/**
 * Hassas alanlari loglama/monitoring icin maskele.
 * Örnek: "Ahmet Yılmaz" → "A*** Y***"
 */
export function maskPII(value: string): string {
  if (!value || value.length < 3) return '***';
  if (value.includes('@')) {
    const [name, domain] = value.split('@');
    return `${name[0]}***@${domain}`;
  }
  return `${value[0]}***${value[value.length - 1]}`;
}
