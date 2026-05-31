import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// EX-030: TypeORM CLI DataSource for migration management
//
// Usage:
//   DB_HOST=localhost DB_PORT=5432 DB_USER=kaptan DB_PASS=... DB_NAME=kaptan \
//     npx typeorm-ts-node-commonjs migration:generate src/migrations/InitialSchema -d ormconfig.ts
//
// For local dev, create a .env file with DB_* variables in backend/

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'] as const;
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`ormconfig: ${key} env var is required for migration management. Set it in .env or export it.`);
  }
}

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!, 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'kaptan_migrations',
  synchronize: false,
  logging: true,
});
