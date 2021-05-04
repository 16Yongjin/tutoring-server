module.exports = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'tutoring',
  entities: ['dist/**/**.entity{.ts,.js}'],
  synchronize: true,
}
