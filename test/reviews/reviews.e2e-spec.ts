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
  makeDummyReview,
} from '../data/users.dummy'
import { AuthModule } from '../../src/auth/auth.module'
import { Schedule } from '../../src/tutors/schedule.entity'
import { Appointment } from '../../src/appointments/appointment.entity'
import { Feedback } from '../../src/appointments/feedback.entity'
import { ReviewsModule } from '../../src/reviews/reviews.module'
import { Review } from '../../src/reviews/review.entity'
import { AppointmentsModule } from '../../src/appointments/appointments.module'

describe.only('ReviewModule Test (e2e)', () => {
  let app: INestApplication

  let tutorRepository: Repository<Tutor>
  let userRepository: Repository<User>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let feedbackRepository: Repository<Feedback>
  let reviewRepository: Repository<Review>

  let tutors: Tutor[]
  let users: User[]
  let schedules: Schedule[]
  let appointments: Appointment[]
  let reviews: Review[]

  let adminUser: User
  let userWithNoAppointments: User
  let userWithAppointment: User
  let endedAppointment: Appointment

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
        ReviewsModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    tutorRepository = moduleFixture.get('TutorRepository')
    userRepository = moduleFixture.get('UserRepository')
    scheduleRepository = moduleFixture.get('ScheduleRepository')
    appointmentRepository = moduleFixture.get('AppointmentRepository')
    feedbackRepository = moduleFixture.get('FeedbackRepository')
    reviewRepository = moduleFixture.get('ReviewRepository')
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
      reviewRepository.createQueryBuilder().delete().from(Review).execute(),
    ])
    tutors = createDummyTutor()
    users = createDummyUser()

    await Promise.all([
      tutorRepository.save(tutors),
      userRepository.save(users),
    ])
    schedules = createDummySchedules(tutors[0])
    appointments = [
      createDummyAppointment(users[0], tutors[0]),
      createEndedAppointment(users[2], tutors[0]),
    ]
    reviews = [makeDummyReview(users[0], tutors[0])]

    await Promise.all([
      scheduleRepository.save(schedules),
      appointmentRepository.save(appointments),
      reviewRepository.save(reviews),
    ])

    adminUser = users[0]
    userWithNoAppointments = users[1]
    userWithAppointment = users[2]
    endedAppointment = appointments[1]
  })

  describe('POST /reviews 리뷰 작성하기', () => {
    it('유저 리뷰 작성하기', async () => {
      const loginData = {
        username: endedAppointment.user.username,
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

      const reviewData = {
        userId: endedAppointment.user.id,
        tutorId: endedAppointment.tutor.id,
        text: 'hello world',
        rating: 5,
      }

      const { body: review } = await request
        .agent(app.getHttpServer())
        .post('/reviews')
        .send(reviewData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(review).toEqual(
        expect.objectContaining({
          text: reviewData.text,
          rating: reviewData.rating,
          tutor: expect.objectContaining({ id: reviewData.tutorId }),
          user: expect.objectContaining({ id: reviewData.userId }),
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
      reviewRepository.createQueryBuilder().delete().from(Review).execute(),
    ])
  })

  afterAll(async () => {
    await app.close()
  })
})
