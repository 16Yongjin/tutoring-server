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
  createEndedAppointment,
} from '../data/users.dummy'
import { AuthModule } from '../../src/auth/auth.module'
import { Schedule } from '../../src/tutors/schedule.entity'
import { compareDate, formatDate } from '../../src/utils/compareDate'
import { Appointment } from '../../src/appointments/appointment.entity'
import { Feedback } from '../../src/appointments/feedback.entity'
import { AppointmentsModule } from '../../src/appointments/appointments.module'
import { Role } from '../../src/shared/enums'
import { testConnection } from '../connection/typeorm'

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

  let adminUser: User
  let userWithNoAppointments: User
  let userWithAppointment: User
  let endedAppointment: Appointment

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRoot(testConnection),
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
    appointments = [
      createDummyAppointment(users[0], tutors[0], schedules[4]),
      createEndedAppointment(users[2], tutors[0], schedules[0]),
    ]

    await Promise.all([
      scheduleRepository.save(schedules),
      appointmentRepository.save(appointments),
    ])

    appointments[0].schedule.appointmentId = appointments[0].id
    appointments[1].schedule.appointmentId = appointments[1].id

    await scheduleRepository.save([
      appointments[0].schedule,
      appointments[1].schedule,
    ])

    adminUser = users[0]
    userWithNoAppointments = users[1]
    userWithAppointment = users[2]
    endedAppointment = appointments[1]
  })

  describe('POST /appointments ?????? ??????', () => {
    it('?????? ?????? ??????', async () => {
      /**
       * ?????????
       */
      const loginData = {
        username: userWithNoAppointments.username,
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

      /**
       * ?????? ?????? ????????????
       */
      const { body: _tutor } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${tutors[0].id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      /**
       * ?????? ??????
       */
      const appointmentData = {
        userId: id,
        tutorId: _tutor.id,
        startTime: _tutor.schedules[1].startTime,
        material: 'teser1',
        request: 'hello',
      }

      await request
        .agent(app.getHttpServer())
        .post('/appointments')
        .send(appointmentData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      /**
       * ?????? ?????? ??? ????????? ???????????? ??????????????? ??????
       */
      const { body: tutor } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${appointmentData.tutorId}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      const reservedSchedule = tutor.schedules.find(
        (s) => formatDate(s.startTime) === formatDate(appointmentData.startTime)
      )
      expect(reservedSchedule.appointmentId).not.toBeNull()
      expect(reservedSchedule).toEqual(
        expect.objectContaining({
          closed: false,
          reserved: true,
        })
      )

      /**
       * ???????????? ????????? ???, ????????? ?????? ?????? ????????? ??????????????? ??????
       */
      const { body: _schedules } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${appointmentData.tutorId}/schedules`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(
        _schedules.find(
          (s) => s.appointmentId === reservedSchedule.appointmentId
        )
      ).toEqual(
        expect.objectContaining({
          appointment: expect.objectContaining({
            material: appointmentData.material,
            request: appointmentData.request,
          }),
        })
      )
    })

    it('?????? ????????? ??? ????????? ?????? ??? ??????', async () => {
      const loginData = {
        username: userWithNoAppointments.username,
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

      const { body: _tutor } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${tutors[0].id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      const appointmentData1 = {
        userId: id,
        tutorId: _tutor.id,
        startTime: _tutor.schedules[2].startTime,
        material: 'teser1',
        request: 'hello',
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
        tutorId: _tutor.id,
        startTime: _tutor.schedules[3].startTime,
        material: 'teser1',
        request: 'hello',
      }

      await request
        .agent(app.getHttpServer())
        .post('/appointments')
        .send(appointmentData2)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      const { body: tutor } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${appointmentData1.tutorId}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(
        tutor.schedules.find(
          (s) =>
            formatDate(s.startTime) === formatDate(appointmentData1.startTime)
        ).appointmentId
      ).not.toBeNull()

      expect(
        tutor.schedules.find(
          (s) =>
            formatDate(s.startTime) === formatDate(appointmentData2.startTime)
        ).appointmentId
      ).not.toBeNull()
    })

    it('???????????? ?????? ?????? ?????? ??????', async () => {
      const loginData = {
        username: adminUser.username,
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

      const { body: _tutor } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${tutors[0].id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      const appointmentData = {
        userId: userWithNoAppointments.id,
        tutorId: _tutor.id,
        startTime: _tutor.schedules[1].startTime,
        material: 'teser1',
        request: 'hello',
      }

      await request
        .agent(app.getHttpServer())
        .post('/appointments')
        .send(appointmentData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      const { body: tutor } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${appointmentData.tutorId}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(
        tutor.schedules.find(
          (s) =>
            formatDate(s.startTime) === formatDate(appointmentData.startTime)
        ).appointmentId
      ).not.toBeNull()
    })
  })

  describe('DELETE /appointments ?????? ????????????', () => {
    it('?????? ?????? ??????', async () => {
      const appointment = appointments[0]
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
        .delete(`/appointments/${appointment.id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      const { body: tutor } = await request
        .agent(app.getHttpServer())
        .get(`/tutors/${appointment.tutor.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(
        tutor.schedules.find((s) =>
          compareDate(s.startTime, appointment.startTime)
        ).appointmentId
      ).toBeNull()
    })

    it('????????? 30??? ????????? ?????? ?????? ?????? ??????', async () => {
      const loginData = {
        username: userWithAppointment.username,
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

      const {
        body: { errors },
      } = await request
        .agent(app.getHttpServer())
        .delete(`/appointments/${endedAppointment.id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(400)

      expect(errors.cancelTime).toBeDefined()
    })
  })

  describe('GET /appointments/me ????????? ?????? ????????????', () => {
    it('????????? ?????? ????????????', async () => {
      const loginData = {
        username: adminUser.username,
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
        .get(`/appointments`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toHaveLength(appointments.length)
    })

    it.only('????????? ?????? ???????????? ??????????????????', async () => {
      const take = 1
      const loginData = {
        username: adminUser.username,
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
        .get(`/appointments?take=${take}&page=1`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toHaveLength(take)
    })
  })

  describe('GET /appointments/me ?????? ?????? ????????????', () => {
    it('?????? ?????? ????????????', async () => {
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

  describe('GET /appointments/tutor ?????? ?????? ????????????', () => {
    it('?????? ?????? ????????????', async () => {
      const loginData = {
        username: tutors[0].username,
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
        .get(`/appointments/tutor`)
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

  describe('POST /appointments/feedback ????????? ?????????', () => {
    it('?????? ?????? ????????? ?????????', async () => {
      const loginData = {
        username: endedAppointment.tutor.username,
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

      const feedbackData = {
        appointmentId: endedAppointment.id,
        text: 'good tutee!!!',
      }

      const { body: feedback } = await request
        .agent(app.getHttpServer())
        .post('/appointments/feedback')
        .send(feedbackData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(feedback.text).toEqual(feedbackData.text)
    })

    it('???????????? ??? ?????? ?????? ??? ??????', async () => {
      const loginData = {
        username: endedAppointment.tutor.username,
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

      const feedbackData = {
        appointmentId: endedAppointment.id,
        text: 'good tutee!!!',
      }

      const { body: feedback } = await request
        .agent(app.getHttpServer())
        .post('/appointments/feedback')
        .send(feedbackData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(feedback.text).toEqual(feedbackData.text)

      await request
        .agent(app.getHttpServer())
        .post('/appointments/feedback')
        .send(feedbackData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(400)
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
