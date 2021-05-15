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

xdescribe('ReviewModule Test (e2e)', () => {
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
  let nonAdminUser: User
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
      createDummyAppointment(users[0], tutors[0], schedules[4]),
      createEndedAppointment(users[2], tutors[0], schedules[0]),
    ]
    reviews = [makeDummyReview(users[0], tutors[0])]

    await Promise.all([
      scheduleRepository.save(schedules),
      appointmentRepository.save(appointments),
      reviewRepository.save(reviews),
    ])

    appointments[0].schedule.appointmentId = appointments[0].id
    appointments[1].schedule.appointmentId = appointments[1].id

    await scheduleRepository.save([
      appointments[0].schedule,
      appointments[1].schedule,
    ])

    adminUser = users[0]
    nonAdminUser = users[1]
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

    it('이미 리뷰 완료한 튜터는 리뷰 작성 불가', async () => {
      const review = reviews[0]
      const loginData = {
        username: review.user.username,
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
        userId: review.user.id,
        tutorId: review.tutor.id,
        text: 'hello world',
        rating: 5,
      }

      const { body } = await request
        .agent(app.getHttpServer())
        .post('/reviews')
        .send(reviewData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(400)

      expect(body.message).toBeDefined()
    })
  })

  describe('GET /reviews 모든 리뷰 가져오기', () => {
    it('어드민 모든 리뷰 가져오기', async () => {
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

      const { body: allReviews } = await request
        .agent(app.getHttpServer())
        .get('/reviews')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      allReviews.forEach((review, idx) =>
        expect(review).toEqual(
          expect.objectContaining({
            id: reviews[idx].id,
            rating: reviews[idx].rating,
            text: reviews[idx].text,
          })
        )
      )
    })

    it('어드민이 아닌 유저는 모든 리뷰 가져오기 불가', async () => {
      const loginData = {
        username: nonAdminUser.username,
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
        .get('/reviews')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(403)

      expect(body.message).toBeDefined()
    })
  })

  describe('GET /reviews/me 내 리뷰 가져오기', () => {
    it('유저가 모든 리뷰 가져오기', async () => {
      const review = reviews[0]
      const loginData = {
        username: review.user.username,
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

      const { body: allReviews } = await request
        .agent(app.getHttpServer())
        .get('/reviews/me')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(allReviews[0]).toEqual(
        expect.objectContaining({
          text: review.text,
          rating: review.rating,
          tutor: expect.objectContaining({ username: review.tutor.username }),
        })
      )
    })
  })

  describe('GET /reviews/tutors/:id 튜터 리뷰 가져오기', () => {
    it('튜터 리뷰 가져오기', async () => {
      const review = reviews[0]
      const tutorId = review.tutor.id
      const { body: tutorReviews } = await request
        .agent(app.getHttpServer())
        .get(`/reviews/tutors/${tutorId}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(tutorReviews[0]).toEqual(
        expect.objectContaining({
          text: review.text,
          rating: review.rating,
          user: { fullname: review.user.fullname },
        })
      )
    })
  })

  describe('DELETE /reviews/:id 리뷰 삭제하기', () => {
    it('어드민 리뷰 삭제하기', async () => {
      const review = reviews[0]
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

      const { body: removedReview } = await request
        .agent(app.getHttpServer())
        .delete(`/reviews/${review.id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(removedReview).toEqual(
        expect.objectContaining({
          text: review.text,
          rating: review.rating,
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
