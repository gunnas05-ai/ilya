import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Migration: Split 70-column User entity into:
 *   - User (core auth + role fields)
 *   - CarrierProfile (vehicle, license, rating fields)
 *   - CompanyProfile (company, tax, accountant fields)
 *   - MfaSettings (MFA/2FA fields)
 *
 * Existing data is preserved via INSERT...SELECT.
 * Old columns on users table remain for backward compatibility
 * during the transition period. Drop them in a follow-up migration
 * after all services have been updated to use the new relations.
 */
export class SplitUserEntity1700000000000 implements MigrationInterface {
  name = 'SplitUserEntity1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── CarrierProfile ──────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'carrier_profiles',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
        { name: 'userId', type: 'uuid', isUnique: true },
        { name: 'licenseNumber', type: 'varchar', isNullable: true },
        { name: 'plateNumber', type: 'varchar', isNullable: true },
        { name: 'vehicleType', type: 'varchar', isNullable: true },
        { name: 'vehicleCapacity', type: 'varchar', isNullable: true },
        { name: 'tonnageCapacity', type: 'float', isNullable: true },
        { name: 'volumeCapacity', type: 'float', isNullable: true },
        { name: 'vehicleHeight', type: 'float', isNullable: true },
        { name: 'vehicleWidth', type: 'float', isNullable: true },
        { name: 'vehicleLength', type: 'float', isNullable: true },
        { name: 'totalWeight', type: 'float', isNullable: true },
        { name: 'axleWeight', type: 'float', isNullable: true },
        { name: 'adrClass', type: 'varchar', isNullable: true },
        { name: 'trailerType', type: 'varchar', isNullable: true },
        { name: 'hasRefrigeration', type: 'boolean', default: false },
        { name: 'kBelgesi', type: 'varchar', isNullable: true },
        { name: 'srcBelgesi', type: 'varchar', isNullable: true },
        { name: 'srcBelgeNo', type: 'varchar', isNullable: true },
        { name: 'srcBelgeSonTarih', type: 'date', isNullable: true },
        { name: 'ehliyetSonTarih', type: 'date', isNullable: true },
        { name: 'licenseType', type: 'varchar', isNullable: true },
        { name: 'rating', type: 'float', default: 0 },
        { name: 'completedLoads', type: 'int', default: 0 },
        { name: 'tcKimlikNo', type: 'varchar', isNullable: true },
        { name: 'isIdentityVerified', type: 'boolean', default: false },
        { name: 'isSrcVerified', type: 'boolean', default: false },
        { name: 'isKBelgesiVerified', type: 'boolean', default: false },
        { name: 'isPlateVerified', type: 'boolean', default: false },
        { name: 'iban', type: 'varchar', isNullable: true },
      ],
    }));

    // Copy carrier data from users
    await queryRunner.query(`
      INSERT INTO carrier_profiles (id, "userId", "licenseNumber", "plateNumber", "vehicleType", "vehicleCapacity", "tonnageCapacity", "volumeCapacity", "vehicleHeight", "vehicleWidth", "vehicleLength", "totalWeight", "axleWeight", "adrClass", "trailerType", "hasRefrigeration", "kBelgesi", "srcBelgesi", "srcBelgeNo", "srcBelgeSonTarih", "ehliyetSonTarih", "licenseType", "rating", "completedLoads", "tcKimlikNo", "isIdentityVerified", "isSrcVerified", "isKBelgesiVerified", "isPlateVerified", "iban")
      SELECT uuid_generate_v4(), id, "licenseNumber", "plateNumber", "vehicleType", "vehicleCapacity", "tonnageCapacity", "volumeCapacity", "vehicleHeight", "vehicleWidth", "vehicleLength", "totalWeight", "axleWeight", "adrClass", "trailerType", "hasRefrigeration", "kBelgesi", "srcBelgesi", "srcBelgeNo", "srcBelgeSonTarih", "ehliyetSonTarih", "licenseType", "rating", "completedLoads", "tcKimlikNo", "isIdentityVerified", "isSrcVerified", "isKBelgesiVerified", "isPlateVerified", "iban"
      FROM users
      WHERE "role" IN ('tasiyici', 'sofor', 'filo_yoneticisi')
    `);

    // ── CompanyProfile ──────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'company_profiles',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
        { name: 'userId', type: 'uuid', isUnique: true },
        { name: 'companyTitle', type: 'varchar', isNullable: true },
        { name: 'authorizedPerson', type: 'varchar', isNullable: true },
        { name: 'taxNumber', type: 'varchar', isNullable: true },
        { name: 'taxOffice', type: 'varchar', isNullable: true },
        { name: 'accountantName', type: 'varchar', isNullable: true },
        { name: 'accountantEmail', type: 'varchar', isNullable: true },
        { name: 'accountantPhone', type: 'varchar', isNullable: true },
        { name: 'businessType', type: 'varchar', isNullable: true },
        { name: 'businessAddress', type: 'varchar', isNullable: true },
        { name: 'companyId', type: 'varchar', isNullable: true },
      ],
    }));

    await queryRunner.query(`
      INSERT INTO company_profiles (id, "userId", "companyTitle", "authorizedPerson", "taxNumber", "taxOffice", "accountantName", "accountantEmail", "accountantPhone", "businessType", "businessAddress", "companyId")
      SELECT uuid_generate_v4(), id, "companyTitle", "authorizedPerson", "taxNumber", "taxOffice", "accountantName", "accountantEmail", "accountantPhone", "businessType", "businessAddress", "companyId"
      FROM users
      WHERE "companyTitle" IS NOT NULL OR "taxNumber" IS NOT NULL OR "businessType" IS NOT NULL
    `);

    // ── MfaSettings ──────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'mfa_settings',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
        { name: 'userId', type: 'uuid', isUnique: true },
        { name: 'mfaEnabled', type: 'boolean', default: false },
        { name: 'totpSecret', type: 'varchar', isNullable: true },
        { name: 'backupCodes', type: 'varchar', length: '500', isNullable: true },
        { name: 'mfaRequiredForWallet', type: 'boolean', default: false },
        { name: 'escrowAccountVerified', type: 'boolean', default: false },
      ],
    }));

    await queryRunner.query(`
      INSERT INTO mfa_settings (id, "userId", "mfaEnabled", "totpSecret", "backupCodes", "mfaRequiredForWallet", "escrowAccountVerified")
      SELECT uuid_generate_v4(), id, "mfaEnabled", "totpSecret", "backupCodes", "mfaRequiredForWallet", "escrowAccountVerified"
      FROM users
      WHERE "mfaEnabled" = true OR "escrowAccountVerified" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('mfa_settings');
    await queryRunner.dropTable('company_profiles');
    await queryRunner.dropTable('carrier_profiles');
  }
}
