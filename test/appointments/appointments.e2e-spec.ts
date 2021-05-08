import 'dotenv/config'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { User } from '../../src/users/user.entity'
import { Tutor } from '../../src/tutors/tutor.entity'
import {
  createDummyAppointment,
  createDummySchedules,
  createDummyTutor,
  createDummyUser,
} from '../data/users.dummy'
import { AuthModule } from '../../src/auth/auth.module'
import { Schedule } from '../../src/tutors/schedule.entity'
import { formatDate } from '../../src/utils/compareDate'
import { Appointment } from '../../src/appointments/appointment.entity'
import { Feedback } from '../../src/appointments/feedback.entity'
import { AppointmentsModule } from '../../src/appointments/appointments.module'
import { Role } from '../../src/shared/enums'

describe('AppointmentModule Test (e2e)', () => {
  let app: INestApplication

  let tutorRepository: Repository<Tutor>
  let userRepository: Repository<User>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let feedbackRepository: Repository<Feedback>

  let tutors: Tutor[]
  let users: User[]
  let schedules: Schedule[]
  let appointments: Appointment[]

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
        AppointmentsModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    tutorRepository = moduleFixture.get('TutorRepository')
    userRepository = moduleFixture.get('UserRepository')
    scheduleRepository = moduleFixture.get('ScheduleRepository')
    appointmentRepository = moduleFixture.get('AppointmentRepository')
    feedbackRepository = moduleFixture.get('FeedbackRepository')
  })

  beforeEach(async () => {
    await Promise.all([
      tutorRepository.createQueryBuilder().delete().from(Tutor).execute(),
      userRepository.createQueryBuilder().delete().from(User).execute(),
      scheduleRepository.createQueryBuilder().delete().from(Schedule).execute(),
      appointmentRepository
        .createQueryBuilder()
        .delete()
        .from(Appointment)
        .execute(),
      feedbackRepository.createQueryBuilder().delete().from(Feedback).execute(),
    ])
    tutors = createDummyTutor()
    users = createDummyUser()

    await Promise.all([
      tutorRepository.save(tutors),
      userRepository.save(users),
    ])
    schedules = createDummySchedules(tutors[0])
    appointments = createDummyAppointment(users[0], tutors[0])

    await Promise.all([
      scheduleRepository.save(schedules),
      appointmentRepository.save(appointments),
    ])
  })

  describe('POST /appointments 약속 잡기', () => {
    it('유저 약속 잡기', async () => {
      const loginData = {
        username: users[1].username,
        password: '123456',
      }

      const {
        body: { id, token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const { body: tutors } = await request
        .agent(app.getHttpServer())
        .get('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      const appointmentData = {
        userId: id,
        tutorId: tutors[0].id,
        startTime: tutors[0].schedules[0].startTime,
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/appointments')
        .send(appointmentData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      // 예약한 시간은 튜터 스케쥴에서 사라짐
      expect(
        body.tutor.schedules.map((s) => formatDate(s.startTime))
      ).not.toContain(formatDate(appointmentData.startTime))
    })

    it('유저 약속은 한 번에 하나만 잡을 수 있음', async () => {
      const loginData = {
        username: users[1].username,
        password: '123456',
      }

      const {
        body: { id, token },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      const { body: tutors } = await request
        .agent(app.getHttpServer())
        .get('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      const appointmentData1 = {
        userId: id,
        tutorId: tutors[0].id,
        startTime: tutors[0].schedules[0].startTime,
      }

      await request
        .agent(app.getHttpServer())
        .post('/appointments')
        .send(appointmentData1)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      const appointmentData2 = {
        userId: id,
        tutorId: tutors[0].id,
        startTime: tutors[0].schedules[1].startTime,
      }

      await request
        .agent(app.getHttpServer())
        .post('/appointments')
        .send(appointmentData2)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(400)
    })

    it('어드민이 유저 약속 대신 잡기', async () => {
      const loginData = {
        username: users[0].username,
        password: '123456',
      }

      const {
        body: { token, role },
      } = await request
        .agent(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)

      expect(role).toBe(Role.ADMIN)

      const { body: tutors } = await request
        .agent(app.getHttpServer())
        .get('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      const appointmentData = {
        userId: users[1].id,
        tutorId: tutors[0].id,
        startTime: tutors[0].schedules[0].startTime,
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/appointments')
        .send(appointmentData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      // 예약한 시간은 튜터 스케쥴에서 사라짐
      expect(
        body.tutor.schedules.map((s) => formatDate(s.startTime))
      ).not.toContain(formatDate(appointmentData.startTime))
    })
  })

  describe('DELETE /appointments 약속 취소하기', () => {
    it('유저 약속 취소', async () => {
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

      await request
        .agent(app.getHttpServer())
        .delete(`/appointments/${appointments[0].id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      const { body: tutor } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${appointments[0].tutor.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(tutor.schedules.map((s) => formatDate(s.startTime))).toContain(
        formatDate(appointments[0].startTime)
      )
    })
  })

  describe('GET /appointments/me 유저 약속 가져오기', () => {
    it('유저 약속 가져오기', async () => {
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
        .get(`/appointments/me`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body[0]).toEqual(
        expect.objectContaining({
          id: appointments[0].id,
          startTime: appointments[0].startTime.toISOString(),
          user: expect.objectContaining({ username: loginData.username }),
        })
      )
    })
  })

  afterEach(async () => {
    await Promise.all([
      tutorRepository.createQueryBuilder().delete().from(Tutor).execute(),
      userRepository.createQueryBuilder().delete().from(User).execute(),
      scheduleRepository.createQueryBuilder().delete().from(Schedule).execute(),
      appointmentRepository
        .createQueryBuilder()
        .delete()
        .from(Appointment)
        .execute(),
      feedbackRepository.createQueryBuilder().delete().from(Feedback).execute(),
    ])
  })

  afterAll(async () => {
    await app.close()
  })
})
