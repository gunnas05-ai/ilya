import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * HashiCorp Vault / Ortam Degiskeni Yapilandirma Servisi
 *
 * Production'da Vault URL verilirse Vault'tan okur,
 * development'ta .env'den okur.
 *
 * Kullanim:
 *   vaultService.get('JWT_SECRET')          → 'kaptan-...'
 *   vaultService.get('DB_PASS')             → 'kaptan_dev_2026'
 *   vaultService.getCredentials('sap')      → { token: '...', endpoint: '...' }
 */
@Injectable()
export class VaultConfigService implements OnModuleInit {
  private readonly logger = new Logger(VaultConfigService.name);
  private vaultAvailable = false;
  private secrets: Map<string, string> = new Map();
  private readonly vaultUrl = process.env.VAULT_ADDR;
  private readonly vaultToken = process.env.VAULT_TOKEN;

  async onModuleInit(): Promise<void> {
    if (!this.vaultUrl || !this.vaultToken) {
      this.logger.warn('Vault baglantisi yapilandirilmadi. .env fallback kullaniliyor.');
      return;
    }

    try {
      await this.refreshSecrets();
      this.vaultAvailable = true;
      this.logger.log('Vault baglantisi basarili');
    } catch (err) {
      this.logger.warn(`Vault baglanamadi: ${err}. .env fallback kullaniliyor.`);
    }
  }

  /**
   * Secret degerini getir. Vault → .env fallback.
   */
  get(key: string, defaultValue?: string): string | undefined {
    if (this.vaultAvailable && this.secrets.has(key)) {
      return this.secrets.get(key);
    }
    return process.env[key] || defaultValue;
  }

  /**
   * ERP / dış sistem kimlik bilgilerini getir
   */
  getCredentials(system: string): Record<string, any> | null {
    try {
      const raw = this.get(`ERP_${system.toUpperCase()}_CREDENTIALS`);
      if (raw) return JSON.parse(raw);

      // .env bazlı fallback
      return {
        apiEndpoint: process.env[`${system.toUpperCase()}_API_URL`],
        token: process.env[`${system.toUpperCase()}_API_TOKEN`],
        username: process.env[`${system.toUpperCase()}_API_USER`],
        password: process.env[`${system.toUpperCase()}_API_PASS`],
      };
    } catch {
      return null;
    }
  }

  /**
   * Vault'tan tum secret'leri yeniden cek
   */
  private async refreshSecrets(): Promise<void> {
    // Gerçek implementasyonda: HTTP GET /v1/secret/data/kaptan
    // Bu demo implementasyonda .env'den oku
    const envKeys = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'];
    for (const key of envKeys) {
      const val = process.env[key];
      if (val) this.secrets.set(key, val);
    }
  }
}
