import 'dotenv/config'
import * as request from 'supertest'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuthModule } from './../../src/auth/auth.module'
import { User } from './../../src/users/user.entity'
import { Role } from './../../src/shared/enums'
import { Tutor } from './../../src/tutors/tutor.entity'
import { Schedule } from '../../src/tutors/schedule.entity'
import { createDummyTutor, createDummyUser } from '../data/users.dummy'

xdescribe('AuthModule /auth (e2e)', () => {
  let app: INestApplication
  let tutorRepository: Repository<Tutor>
  let userRepository: Repository<User>
  let scheduleRepository: Repository<Schedule>
  let tutors: Tutor[]
  let users: User[]

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
          entities: ['./**/*.entity.ts'],
          synchronize: true,
        }),
        AuthModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    tutorRepository = moduleFixture.get('TutorRepository')
    userRepository = moduleFixture.get('UserRepository')
    scheduleRepository = moduleFixture.get('ScheduleRepository')
  })

  beforeEach(async () => {
    await Promise.all([
      tutorRepository.createQueryBuilder().delete().from(Tutor).execute(),
      userRepository.createQueryBuilder().delete().from(User).execute(),
      scheduleRepository.createQueryBuilder().delete().from(Schedule).execute(),
    ])
    tutors = createDummyTutor()
    users = createDummyUser()

    await Promise.all([
      tutorRepository.save(tutors),
      userRepository.save(users),
    ])
  })

  describe('POST /signup 사용자 회원가입', () => {
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
        username: users[0].username,
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

  describe('POST /login 사용자 로그인', () => {
    it('로그인 성공', async () => {
      const loginData = {
        username: users[0].username,
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
        username: users[0].username,
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

  describe('GET /me 로그인 사용자 정보 확인', () => {
    it('로그인 정보 확인 성공', async () => {
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

  describe('POST /tutor/signup 튜터 회원가입', () => {
    it('튜터 회원가입 성공', async () => {
      const signupData = {
        username: 'test-tutor-3',
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/signup')
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
          role: Role.TUTOR,
        })
      )
      // 비밀번호 제거
      expect(body.password).not.toBeDefined()
    })

    it('중복 튜터 이름이 있는 경우 회원가입 실패', async () => {
      const signupData = {
        username: tutors[0].username,
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/signup')
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
        .post('/auth/tutors/signup')
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
        .post('/auth/tutors/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)

      expect(body.errors.password).toBeDefined()
    })
  })

  describe('POST /tutor/login 튜터 로그인', () => {
    it('튜터 로그인 성공', async () => {
      const loginData = {
        username: tutors[0].username,
        password: '123456',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
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
        username: users[0].username,
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

  afterEach(async () => {
    await Promise.all([
      tutorRepository.createQueryBuilder().delete().from(Tutor).execute(),
      userRepository.createQueryBuilder().delete().from(User).execute(),
      scheduleRepository.createQueryBuilder().delete().from(Schedule).execute(),
    ])
  })

  afterAll(async () => {
    await app.close()
  })
})
