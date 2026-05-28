import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * EX-030: Initial schema migration template.
 *
 * In production, run: npx typeorm-ts-node-commonjs migration:generate
 * to auto-generate the full migration from your entities.
 *
 * For now, this migration creates system_settings table as a
 * demonstration of the migration workflow.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create system_settings table (feature flags, config)
    await queryRunner.createTable(
      new Table({
        name: 'system_settings',
        columns: [
          { name: 'key', type: 'varchar', length: '60', isPrimary: true },
          { name: 'value', type: 'text', isNullable: true },
          { name: 'description', type: 'varchar', length: '200', isNullable: true },
          { name: 'updatedBy', type: 'varchar', isNullable: true },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true, // ifNotExists
    );

    // Create cities table (81 provinces)
    await queryRunner.createTable(
      new Table({
        name: 'cities',
        columns: [
          { name: 'plateCode', type: 'varchar', length: '2', isPrimary: true },
          { name: 'name', type: 'varchar', length: '50' },
        ],
      }),
      true,
    );

    // Create districts table
    await queryRunner.createTable(
      new Table({
        name: 'districts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'cityPlateCode', type: 'varchar', length: '2' },
          { name: 'name', type: 'varchar', length: '60' },
          { name: 'isDefault', type: 'boolean', default: false },
        ],
        foreignKeys: [
          {
            columnNames: ['cityPlateCode'],
            referencedTableName: 'cities',
            referencedColumnNames: ['plateCode'],
          },
        ],
      }),
      true,
    );

    // Create permissions table (RBAC)
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'key', type: 'varchar', length: '80', isUnique: true },
          { name: 'label', type: 'varchar', length: '150' },
          { name: 'group', type: 'varchar', length: '50' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    // Create role_permissions table
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'role', type: 'varchar', length: '40' },
          { name: 'permissionId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['permissionId'],
            referencedTableName: 'permissions',
            referencedColumnNames: ['id'],
          },
        ],
      }),
      true,
    );

    console.log('✅ Initial migration executed successfully.');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_permissions', true);
    await queryRunner.dropTable('permissions', true);
    await queryRunner.dropTable('districts', true);
    await queryRunner.dropTable('cities', true);
    await queryRunner.dropTable('system_settings', true);
    console.log('⬇️  Initial migration reverted.');
  }
}
