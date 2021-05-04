import 'dotenv/config'
import * as request from 'supertest'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuthModule } from './../../src/auth/auth.module'
import { User } from './../../src/users/user.entity'
import { Role } from './../../src/shared/enums'

xdescribe('AuthModule /auth (e2e)', () => {
  let app: INestApplication
  let repository: Repository<User>
  let dummyData: User[]

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.POSTGRES_HOST,
          port: 5432,
          username: process.env.POSTGRES_PASSWORD,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_TEST_DATABASE,
          entities: [User],
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
    await repository.clear()
    dummyData = [
      User.create({
        username: 'test-user-1',
        role: Role.ADMIN,
        email: 'test-1@test.com',
        fullname: 'paul',
        password: '123456',
      }),
      User.create({
        username: 'test-user-2',
        email: 'test-2@test.com',
        fullname: 'james',
        password: '123456',
      }),
    ]
    await repository.save(dummyData)
  })

  describe('POST /signup 회원가입', () => {
    it('회원가입 성공', async () => {
      const signupData = {
        username: 'test-user-3',
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      // 기본 정보 + 토큰 확인
      expect(body).toEqual(
        expect.objectContaining({
          username: signupData.username,
          email: signupData.email,
          token: expect.any(String),
        })
      )
      // 비밀번호 제거
      expect(body.password).not.toBeDefined()
    })

    it('중복 이름이 있는 경우 회원가입 실패', async () => {
      const signupData = {
        username: 'test-user-1',
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)

      expect(body.errors).toBeDefined()
    })

    it('username이 없는 경우 회원가입 실패', async () => {
      const signupData = {
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)

      expect(body.errors.username).toBeDefined()
    })

    it('비밀번호는 6글자 이상', async () => {
      const signupData = {
        username: 'test-user-4',
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '12345',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)

      expect(body.errors.password).toBeDefined()
    })
  })

  describe('POST /login 로그인', () => {
    it('로그인 성공', async () => {
      const loginData = {
        username: dummyData[0].username,
        password: '123456',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      // 기본 정보 + 토큰 확인
      expect(body).toEqual(
        expect.objectContaining({
          username: loginData.username,
          token: expect.any(String),
        })
      )

      expect(body.password).not.toBeDefined()
    })

    it('로그인 실패: 잘못된 비밀번호', async () => {
      const loginData = {
        username: dummyData[0].username,
        password: '12345',
      }

      await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)
    })
  })

  describe('GET /me 로그인 정보 확인', () => {
    it('로그인 정보 확인 성공', async () => {
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
        .get('/auth/me')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(
        expect.objectContaining({
          username: loginData.username,
        })
      )
    })

    it('로그인 정보 확인 실패: 잘못된 토큰', async () => {
      const token = '123'

      await request
        .agent(app.getHttpServer())
        .get('/auth/me')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(401)
    })
  })

  afterEach(async () => {
    await repository.clear()
  })

  afterAll(async () => {
    await app.close()
  })
})
