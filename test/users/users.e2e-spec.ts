import 'dotenv/config'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { User } from './../../src/users/user.entity'
import { AuthModule } from './../../src/auth/auth.module'
import { createDummyUser } from '../data/users.dummy'

xdescribe('AppController (e2e)', () => {
  let app: INestApplication
  let repository: Repository<User>
  let dummyData: User[]

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.POSTGRES_HOST,
          port: 5432,
          username: process.env.POSTGRES_PASSWORD,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_TEST_DATABASE,
          entities: ['./**/*.entity.ts'],
          synchronize: true,
        }),
        AuthModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
    repository = moduleFixture.get('UserRepository')
  })

  beforeEach(async () => {
    await repository.createQueryBuilder().delete().from(User).execute()
    dummyData = createDummyUser()
    await repository.save(dummyData)
  })

  describe('GET /users', () => {
    it('로그인 X, 유저 가져오기 불가', async () => {
      await request
        .agent(app.getHttpServer())
        .get('/users')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)
    })

    it('User role은 모든 가져오기 불가', async () => {
      const loginData = {
        username: dummyData[1].username,
        password: '123456',
      }

      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      await request
        .agent(app.getHttpServer())
        .get('/users')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(403)
    })

    it('Admin role은 모든 유저 가져오기 가능', async () => {
      const loginData = {
        username: dummyData[0].username,
        password: '123456',
      }

      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const { body } = await request
        .agent(app.getHttpServer())
        .get('/users')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(expect.any(Array))
    })
  })

  afterEach(async () => {
    await repository.createQueryBuilder().delete().from(User).execute()
  })

  afterAll(async () => {
    await app.close()
  })
})
