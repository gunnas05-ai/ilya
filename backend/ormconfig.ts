import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { ALL_ENTITIES } from './src/all-entities';

dotenv.config();

// EX-030: TypeORM CLI DataSource for migration management
//
// Usage:
//   npx typeorm-ts-node-commonjs migration:generate src/migrations/InitialSchema -d ormconfig.ts
//   npx typeorm-ts-node-commonjs migration:run -d ormconfig.ts
//   npx typeorm-ts-node-commonjs migration:revert -d ormconfig.ts

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USER || 'kaptan',
  password: process.env.DB_PASS || 'kaptan_dev_2026',
  database: process.env.DB_NAME || 'kaptan',
  entities: ALL_ENTITIES,
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'kaptan_migrations',
  synchronize: false,
  logging: true,
});
