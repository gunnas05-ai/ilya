import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseConfig');

export function getDatabaseConfig(): TypeOrmModuleOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceSync = process.env.DB_SYNCHRONIZE === 'true';
  const forceNoSync = process.env.DB_SYNCHRONIZE === 'false';
  const usePostgres = !!process.env.DB_HOST;

  // synchronize: only for local dev. Shared dev/staging must use migrations.
  const shouldSynchronize = forceNoSync ? false : forceSync ? true : !isProduction;

  if (usePostgres) {
    if (shouldSynchronize && !forceSync) {
      logger.warn(
        '⚠️  Postgres + synchronize=true aktif. ' +
        'Bu ayar tablolari SILEBILIR. Paylasimli ortamlarda DB_SYNCHRONIZE=false yapin.',
      );
    }
    logger.log(`🐘 PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432} — sync:${shouldSynchronize}`);

    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true, // Each module declares its own entities via TypeOrmModule.forFeature()
      synchronize: shouldSynchronize,
      migrations: isProduction || !shouldSynchronize ? ['dist/migrations/*.js'] : undefined,
      migrationsRun: isProduction && !shouldSynchronize,
      migrationsTableName: 'kaptan_migrations',
      logging: !isProduction ? ['error', 'warn'] : ['error'],
    };
  }

  // SQLite fallback — strictly for local single-developer use
  logger.log(`📦 SQLite (${isProduction ? 'production' : 'geliştirme'}) — sync:${shouldSynchronize} — sadece lokal geliştirme icin`);
  return {
    type: 'sqlite',
    database: './data/kaptan.db',
    autoLoadEntities: true,
    synchronize: shouldSynchronize && !isProduction,
    migrations: !shouldSynchronize ? ['dist/migrations/*.js'] : undefined,
    migrationsRun: !shouldSynchronize,
    logging: !isProduction ? ['error', 'warn'] : ['error'],
  };
}
