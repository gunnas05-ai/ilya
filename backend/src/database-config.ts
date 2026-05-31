import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { ALL_ENTITIES } from './all-entities';

const logger = new Logger('DatabaseConfig');

export function getDatabaseConfig(): TypeOrmModuleOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const usePostgres = !!process.env.DB_HOST;

  if (usePostgres) {
    logger.log(`🐘 PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`);
    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: ALL_ENTITIES,
      // EX-030: Production uses migrations, development uses synchronize
      synchronize: !isProduction,
      migrations: isProduction ? ['dist/migrations/*.js'] : undefined,
      migrationsRun: isProduction,
      migrationsTableName: 'kaptan_migrations',
      logging: !isProduction ? ['error', 'warn'] : ['error'],
    };
  }

  const isDev = !isProduction;
  logger.log(`📦 SQLite (${isDev ? 'geliştirme' : 'production'}) — sync:${isDev}`);
  return {
    type: 'sqlite',
    database: './data/kaptan.db',
    entities: ALL_ENTITIES,
    synchronize: isDev, // Development'ta auto-sync, production'da migration
    migrations: isDev ? undefined : ['dist/migrations/*.js'],
    migrationsRun: !isDev,
    logging: isDev ? ['error', 'warn'] : ['error'],
  };
}
