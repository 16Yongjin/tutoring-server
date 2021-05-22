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
import * as emailUtils from '../../src/utils/sendEmail'
import * as generateCode from '../../src/utils/generateCode'
import {
  EmailVerification,
  TutorEmailVerification,
} from '../../src/verification/email-verification.entity'

describe('AuthModule /auth (e2e)', () => {
  let app: INestApplication
  let tutorRepository: Repository<Tutor>
  let userRepository: Repository<User>
  let scheduleRepository: Repository<Schedule>
  let emailVerificationRepository: Repository<EmailVerification>
  let tutorEmailVerificationRepository: Repository<TutorEmailVerification>
  let tutors: Tutor[]
  let users: User[]

    // 이메일 보내기 기능 목업
  ;(emailUtils.sendEmail as jest.Mock) = jest
    .fn()
    .mockImplementation(console.log)
  // 토큰 생성 기능 목업
  ;(generateCode.generateCode as jest.Mock) = jest
    .fn()
    .mockReturnValue('123456')

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
    emailVerificationRepository = moduleFixture.get(
      'EmailVerificationRepository'
    )
    tutorEmailVerificationRepository = moduleFixture.get(
      'TutorEmailVerificationRepository'
    )
  })

  beforeEach(async () => {
    await Promise.all([
      tutorRepository.createQueryBuilder().delete().from(Tutor).execute(),
      userRepository.createQueryBuilder().delete().from(User).execute(),
      scheduleRepository.createQueryBuilder().delete().from(Schedule).execute(),
      emailVerificationRepository.clear(),
      tutorEmailVerificationRepository.clear(),
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

    it('회원가입 후 이메일 미 인증 시 로그인 실패', async () => {
      const signupData = {
        username: 'test-user-3',
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }

      await request
        .agent(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(403)

      expect(body.errors.email).toBeDefined()
    })

    it('회원가입 후 이메일 인증 시 로그인 성공', async () => {
      const signupData = {
        username: 'test-user-3',
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }

      await request
        .agent(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      await request
        .agent(app.getHttpServer())
        .get('/auth/verify/123456')
        .expect(200)

      await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
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

  describe('POST /auth/tutors/login 튜터 로그인', () => {
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

    it('회원가입 후 이메일 미 인증 시 로그인 실패', async () => {
      const signupData = {
        username: 'test-tutor-3',
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }
      await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(403)

      expect(body.errors.email).toBeDefined()
    })

    it('회원가입 & 이메일 인증 후 관리자 미 승인 시 로그인 실패', async () => {
      const signupData = {
        username: 'test-tutor-3',
        email: 'test-3@test.com',
        fullname: 'paul',
        password: '123456',
      }

      await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      await request
        .agent(app.getHttpServer())
        .get('/auth/tutors/verify/123456')
        .expect(200)

      await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(403)
    })

    it('회원가입 & 이메일 인증 후 관리자 승인 시 로그인 성공', async () => {
      const signupData = {
        username: 'test-tutor-4',
        email: 'test-4@test.com',
        fullname: 'paul',
        password: '123456',
      }

      const { body: tutor } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/signup')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      await request
        .agent(app.getHttpServer())
        .get('/auth/tutors/verify/123456')
        .expect(200)

      const adminLoginData = {
        username: users[0].username,
        password: '123456',
      }

      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(adminLoginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const tutorAcceptData = {
        tutorId: tutor.id,
      }

      await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/accept')
        .send(tutorAcceptData)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .send(signupData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
    })
  })

  describe('POST /auth/change-password 유저 비밀번호 변경', () => {
    it('유저 비밀번호 변경', async () => {
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

      const changePasswordData = {
        username: users[1].username,
        password: '654321',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/change-password')
        .send(changePasswordData)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      expect(body.password).not.toBeDefined()

      await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(changePasswordData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
    })

    it('다른 유저의 비밀번호 변경 불가: ', async () => {
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

      const changePasswordData = {
        username: users[2].username,
        password: '654321',
      }

      await request
        .agent(app.getHttpServer())
        .post('/auth/change-password')
        .send(changePasswordData)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)
    })
  })
  describe('POST /auth/tutors/change-password 튜터 비밀번호 변경', () => {
    it('튜터 비밀번호 변경', async () => {
      const loginData = {
        username: tutors[0].username,
        password: '123456',
      }

      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const changePasswordData = {
        username: tutors[0].username,
        password: '654321',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/change-password')
        .send(changePasswordData)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      expect(body.password).not.toBeDefined()

      await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .send(changePasswordData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
    })

    it('다른 튜터의 비밀번호 변경 불가: ', async () => {
      const loginData = {
        username: tutors[0].username,
        password: '123456',
      }

      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const changePasswordData = {
        username: tutors[1].username,
        password: '654321',
      }

      await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/change-password')
        .send(changePasswordData)
        .set('Authorization', `Bearer ${token}`)
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
      emailVerificationRepository.clear(),
      tutorEmailVerificationRepository.clear(),
    ])
  })

  afterAll(async () => {
    await app.close()
  })
})
