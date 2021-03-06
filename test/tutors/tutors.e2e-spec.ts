import 'dotenv/config'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import dayjs from 'dayjs'
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
import { testConnection } from '../connection/typeorm'

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
        TypeOrmModule.forRoot(testConnection),
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

  describe('GET /tutors ?????? ?????????', () => {
    it('?????? ?????? ????????????', async () => {
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

  describe('GET /tutors/search ?????? ?????? ??????', () => {
    it('?????? ?????? ?????? ?????? ??????', async () => {
      const startTime = dayjs().startOf('day').toISOString()
      const endTime = dayjs().endOf('day').toISOString()
      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/search`)
        .query({ startTime, endTime })
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
      // ???????????? ?????? ?????? ????????? timestamp ???????????? ??????
      expect(
        body[0].schedules.every((schedule) =>
          dayjs(schedule.startTime).isAfter(dayjs())
        )
      ).toBeTruthy()
    })
  })

  describe('GET /tutors/admin ???????????? ?????? ?????? ?????? ????????????', () => {
    it('???????????? ?????? ?????? ????????????', async () => {
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
    it('?????? ?????? ??????', async () => {
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

    it('???????????? ?????? ?????? ?????? ??? ??????', async () => {
      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${-1}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)

      expect(body.message).toBeDefined()
    })
  })

  describe('PUT /tutors ?????? ????????????', () => {
    it('?????? ????????????', async () => {
      await request
        .agent(app.getHttpServer())
        .put('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
    })
  })

  describe('POST /tutor/schedule ?????? ????????? ??????', () => {
    it('????????? ?????? ????????? ????????? ?????? ??????', async () => {
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

    it('????????? ??????', async () => {
      const loginData = {
        username: tutors[1].username,
        password: '123456',
      }
      const data = { schedule: dayjs() }
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

      expect(compareDate(body.startTime, data.schedule.toDate())).toBeTruthy()
    })
  })

  describe('POST /tutor/schedule/remove ?????? ????????? ??????', () => {
    it('????????? ?????? ?????? ????????? ??????', async () => {
      const loginData = {
        username: tutors[0].username,
        password: '123456',
      }
      const data = { schedule: schedules[0].startTime }
      const {
        body: { id, token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/tutors/login')
        .set('Accept', 'application/json')
        .send(loginData)

      const { body: schedule } = await request
        .agent(app.getHttpServer())
        .post(`/tutors/${id}/schedules/remove`)
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      expect(
        compareDate(schedule.startTime, new Date(data.schedule))
      ).toBeTruthy()
    })

    it('???????????? ?????? ????????? ????????? ??????', async () => {
      const loginData = {
        username: users[0].username,
        password: '123456',
      }
      const data = { schedule: schedules[0].startTime }
      const {
        body: { token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .set('Accept', 'application/json')
        .send(loginData)

      const { body: schedule } = await request
        .agent(app.getHttpServer())
        .post(`/tutors/${tutors[0].id}/schedules/remove`)
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      expect(
        compareDate(schedule.startTime, new Date(data.schedule))
      ).toBeTruthy()
    })
  })

  describe('POST /tutors/:id ?????? ?????? ??????', () => {
    it('?????? ?????? ??????', async () => {
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

    it('Admin??? ?????? ?????? ?????? ??????', async () => {
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

    it('Admin??? ?????? ?????? ?????? ??????', async () => {
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
