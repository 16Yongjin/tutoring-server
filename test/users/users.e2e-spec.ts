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
import { Gender } from '../../src/shared/enums'
import { testConnection } from '../connection/typeorm'

describe('UserController (e2e)', () => {
  let app: INestApplication
  let repository: Repository<User>
  let users: User[]

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRoot(testConnection),
        AuthModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
    repository = moduleFixture.get('UserRepository')
  })

  beforeEach(async () => {
    await repository.createQueryBuilder().delete().from(User).execute()
    users = createDummyUser()
    await repository.save(users)
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
        username: users[1].username,
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
        username: users[0].username,
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

  describe('POST /users/:id 유저 정보 수정', () => {
    it('유저 정보 수정', async () => {
      const user = users[1]
      const loginData = {
        username: user.username,
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

      const userData = {
        username: user.username,
        fullname: 'doge',
        language: 'ko',
        gender: Gender.MALE,
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post(`/users/${user.id}`)
        .send(userData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(body).toEqual(expect.objectContaining(userData))
    })

    it('Admin은 유저 수정 가능', async () => {
      const user = users[1]
      const loginData = {
        username: users[0].username,
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

      const userData = {
        username: user.username,
        fullname: 'doge',
        language: 'ko',
        gender: Gender.MALE,
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post(`/users/${user.id}`)
        .send(userData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(body).toEqual(expect.objectContaining(userData))
    })

    it('Admin은 없는 유저 수정 실패', async () => {
      const loginData = {
        username: users[0].username,
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

      const userData = {
        username: 'Not existing',
        fullname: 'doge',
        language: 'ko',
        gender: Gender.MALE,
      }

      await request
        .agent(app.getHttpServer())
        .post(`/users/123`)
        .send(userData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(404)
    })
  })

  afterEach(async () => {
    await repository.createQueryBuilder().delete().from(User).execute()
  })

  afterAll(async () => {
    await app.close()
  })
})
