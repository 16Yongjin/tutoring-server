import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export const testConnection: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: 5432,
  username: process.env.POSTGRES_PASSWORD,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_TEST_DATABASE,
  entities: ['./**/*.entity.ts'],
  synchronize: true,
}
