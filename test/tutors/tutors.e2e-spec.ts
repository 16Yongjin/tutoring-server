import 'dotenv/config'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { User } from '../../src/users/user.entity'
import { Tutor } from '../../src/tutors/tutor.entity'
import { TutorsModule } from '../../src/tutors/tutors.module'
import {
  createDummySchedules,
  createDummyTutor,
  createDummyUser,
} from '../data/users.dummy'
import { AuthModule } from '../../src/auth/auth.module'
import { Schedule } from '../../src/tutors/schedule.entity'
import { compareDate } from '../../src/utils/compareDate'
import { Gender } from '../../src/shared/enums'

describe('TutorModule Test (e2e)', () => {
  let app: INestApplication
  let tutorRepository: Repository<Tutor>
  let userRepository: Repository<User>
  let scheduleRepository: Repository<Schedule>
  let tutors: Tutor[]
  let users: User[]
  let schedules: Schedule[]

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
        TutorsModule,
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
    schedules = createDummySchedules(tutors[0])

    await scheduleRepository.save(schedules)
  })

  describe('GET /tutors 튜터 리스트', () => {
    it('모든 튜터 가져오기', async () => {
      const { body } = await request
        .agent(app.getHttpServer())
        .get('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(expect.any(Array))
      expect(body[0].password).not.toBeDefined()
      expect(body[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          fullname: expect.any(String),
          language: expect.any(String),
          image: expect.any(String),
          gender: expect.any(String),
          presentation: expect.any(String),
          country: expect.any(String),
        })
      )
      expect(body[0]).not.toEqual(
        expect.objectContaining({
          email: expect.any(String),
          username: expect.any(String),
        })
      )
    })
  })

  describe('GET /tutors/admin 어드민이 모든 튜터 정보 가져오기', () => {
    it('어드민이 모든 튜터 가져오기', async () => {
      const loginData = {
        username: users[0].username,
        password: '123456',
      }
      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .set('Accept', 'application/json')
        .send(loginData)

      const { body } = await request
        .agent(app.getHttpServer())
        .get('/tutors/admin')
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(expect.any(Array))
      expect(body[0].password).not.toBeDefined()
      expect(body[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          fullname: expect.any(String),
          language: expect.any(String),
          image: expect.any(String),
          gender: expect.any(String),
          presentation: expect.any(String),
          country: expect.any(String),
          verified: expect.any(Boolean),
          accepted: expect.any(Boolean),
        })
      )
    })
  })

  describe('GET /tutor/:id', () => {
    it('튜터 정보 확인', async () => {
      const id = tutors[0].id

      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(expect.objectContaining({ id }))
      expect(body.password).not.toBeDefined()
      if (body.schedules.length) {
        expect(body.schedules[0]).toEqual(
          expect.objectContaining({
            reserved: expect.any(Boolean),
            closed: expect.any(Boolean),
          })
        )
      }
    })

    it('존재하지 않은 튜터 확인 시 에러', async () => {
      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${-1}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)

      expect(body.message).toBeDefined()
    })
  })

  describe('PUT /tutors 튜터 업데이트', () => {
    it('튜터 업데이트', async () => {
      await request
        .agent(app.getHttpServer())
        .put('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
    })
  })

  describe('POST /tutor/schedule 튜터 스케쥴 추가', () => {
    it('튜터는 다른 튜터의 스케쥴 추가 불가', async () => {
      const loginData = {
        username: tutors[0].username,
        password: '123456',
      }
      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .set('Accept', 'application/json')
        .send(loginData)
        .expect(201)

      const id = tutors[1].id
      await request
        .agent(app.getHttpServer())
        .post(`/tutors/${id}/schedules`)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json')
        .send([])
        .expect('Content-Type', /json/)
        .expect(403)
    })

    it('스케쥴 추가', async () => {
      const loginData = {
        username: tutors[1].username,
        password: '123456',
      }
      const data = { schedules: [new Date()] }
      const {
        body: { id, token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .set('Accept', 'application/json')
        .send(loginData)

      const { body } = await request
        .agent(app.getHttpServer())
        .post(`/tutors/${id}/schedules`)
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      expect(
        compareDate(body.schedules[0].startTime, data.schedules[0])
      ).toBeTruthy()
    })
  })

  describe('POST /tutor/schedule/remove 튜터 스케쥴 제거', () => {
    it('튜터가 직접 본인 스케쥴 제거', async () => {
      const loginData = {
        username: tutors[0].username,
        password: '123456',
      }
      const data = { schedules: [schedules[0].startTime] }
      const {
        body: { id, token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .set('Accept', 'application/json')
        .send(loginData)

      const { body: tutor } = await request
        .agent(app.getHttpServer())
        .post(`/tutors/${id}/schedules/remove`)
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const compare = tutor.schedules.every(
        (s) => !compareDate(s.startTime, data.schedules[0])
      )
      expect(compare).toBeTruthy()
    })

    it('어드민이 다른 튜터의 스케쥴 제거', async () => {
      const loginData = {
        username: users[0].username,
        password: '123456',
      }
      const data = { schedules: [schedules[0].startTime] }
      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .set('Accept', 'application/json')
        .send(loginData)

      const { body: tutor } = await request
        .agent(app.getHttpServer())
        .post(`/tutors/${tutors[0].id}/schedules/remove`)
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const compare = tutor.schedules.every(
        (s) => !compareDate(s.startTime, data.schedules[0])
      )
      expect(compare).toBeTruthy()
    })
  })

  describe('POST /tutors/:id 튜터 정보 수정', () => {
    it('튜터 정보 수정', async () => {
      const tutor = tutors[1]
      const loginData = {
        username: tutor.username,
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

      const tutorData = {
        username: tutor.username,
        fullname: 'doge',
        language: 'ko',
        gender: Gender.MALE,
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post(`/tutors/${tutor.id}`)
        .send(tutorData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(body).toEqual(expect.objectContaining(tutorData))
    })

    it('Admin은 튜터 정보 수정 가능', async () => {
      const tutor = tutors[1]
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

      const tutorData = {
        username: tutor.username,
        fullname: 'doge',
        language: 'ko',
        gender: Gender.MALE,
        image: '123',
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post(`/tutors/${tutor.id}`)
        .send(tutorData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(body).toEqual(expect.objectContaining(tutorData))
    })

    it('Admin이 없는 튜터 정보 실패', async () => {
      const tutor = tutors[1]
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

      const tutorData = {
        username: 'Not existing',
        fullname: 'doge',
        language: 'ko',
        gender: Gender.MALE,
        image: '123',
      }

      await request
        .agent(app.getHttpServer())
        .post(`/tutors/${tutor.id}`)
        .send(tutorData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(404)
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
