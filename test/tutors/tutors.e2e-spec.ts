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
import { createDummyTutor, createDummyUser } from '../data/users.dummy'

describe('TutorModule Test (e2e)', () => {
  let app: INestApplication
  let tutorRepository: Repository<Tutor>
  let userRepository: Repository<Tutor>
  let tutors: Tutor[]
  let users: User[]

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
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    tutorRepository = moduleFixture.get('TutorRepository')
    userRepository = moduleFixture.get('UserRepository')
  })

  beforeEach(async () => {
    await Promise.all([
      tutorRepository.createQueryBuilder().delete().from(Tutor).execute(),
      userRepository.createQueryBuilder().delete().from(User).execute(),
    ])
    tutors = createDummyTutor()
    users = createDummyUser()

    await Promise.all([
      tutorRepository.save(tutors),
      userRepository.save(users),
    ])
  })

  describe('GET /tutors', () => {
    it('로그인 X, 유저 가져오기 불가', async () => {
      await request
        .agent(app.getHttpServer())
        .get('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)
    })
  })

  describe('POST /tutors', () => {
    it('튜터 생성', async () => {
      await request
        .agent(app.getHttpServer())
        .get('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)
    })
  })

  describe('POST /tutors/login', () => {
    it('튜터 로그인', async () => {
      await request
        .agent(app.getHttpServer())
        .get('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)
    })
  })

  describe('PUT /tutors', () => {
    it('튜터 업데이트', async () => {
      await request
        .agent(app.getHttpServer())
        .get('/tutors')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)
    })
  })

  afterEach(async () => {
    await Promise.all([
      tutorRepository.createQueryBuilder().delete().from(Tutor).execute(),
      userRepository.createQueryBuilder().delete().from(User).execute(),
    ])
  })

  afterAll(async () => {
    await app.close()
  })
})
