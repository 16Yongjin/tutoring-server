import 'dotenv/config'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthModule } from '../../src/auth/auth.module'
import { MaterialsModule } from '../../src/materials/materials.module'
import { Course, Exercise, Material, Topic } from '../../src/materials/entities'
import { User } from '../../src/users/user.entity'
import {
  createDummyCourses,
  createDummyExercises,
  createDummyTopics,
  createDummyMaterials,
} from './material.dummy'
import { createDummyUser } from '../data/users.dummy'
import { omit } from 'lodash'

describe.only('MaterialsModule Test (e2e)', () => {
  let app: INestApplication

  let userRepository: Repository<User>
  let materialRepository: Repository<Material>
  let topicRepository: Repository<Topic>
  let courseRepository: Repository<Course>
  let exerciseRepository: Repository<Exercise>

  let users: User[]
  let materials: Material[]
  let topics: Topic[]
  let courses: Course[]
  let exercises: Exercise[]

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
        MaterialsModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    userRepository = moduleFixture.get('UserRepository')
    materialRepository = moduleFixture.get('MaterialRepository')
    topicRepository = moduleFixture.get('TopicRepository')
    courseRepository = moduleFixture.get('CourseRepository')
    exerciseRepository = moduleFixture.get('ExerciseRepository')
  })

  beforeEach(async () => {
    await Promise.all([
      userRepository.createQueryBuilder().delete().from(User).execute(),
      materialRepository.createQueryBuilder().delete().from(Material).execute(),
      topicRepository.createQueryBuilder().delete().from(Topic).execute(),
      courseRepository.createQueryBuilder().delete().from(Course).execute(),
      exerciseRepository.createQueryBuilder().delete().from(Exercise).execute(),
    ])

    users = createDummyUser()
    await userRepository.save(users)
    materials = createDummyMaterials()
    await materialRepository.save(materials)
    topics = materials.flatMap((material) => createDummyTopics(material))
    await topicRepository.save(topics)
    courses = topics.flatMap((topic) => createDummyCourses(topic))
    await courseRepository.save(courses)
    exercises = courses.flatMap((course) => createDummyExercises(course))
    await exerciseRepository.save(exercises)
  })

  describe('GET /materials 교재 목록 가져오기', () => {
    it('교재 목록 가져오기', async () => {
      const { body } = await request
        .agent(app.getHttpServer())
        .get('/materials')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toHaveLength(materials.length)
      body.forEach((material) =>
        expect(material).toEqual(
          expect.objectContaining({
            title: expect.any(String),
            description: expect.any(String),
            levelStart: expect.any(Number),
            levelEnd: expect.any(Number),
          })
        )
      )
    })
  })

  describe('GET /materials/:id 교재 가져오기', () => {
    it('교재 가져오기', async () => {
      const material = materials[0]
      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/materials/${material.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          levelStart: expect.any(Number),
          levelEnd: expect.any(Number),
        })
      )

      expect(body.topics).toHaveLength(
        topics.filter((t) => t.material.id === material.id).length
      )

      expect(body.topics[0].courses).toHaveLength(
        courses.filter((c) => c.topic.id === body.topics[0].id).length
      )
    })

    xit('없는 교재 가져오기 실패', async () => {
      await request
        .agent(app.getHttpServer())
        .get(`/materials/-1`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
    })
  })

  describe('GET /materials/courses/:id 강의 가져오기', () => {
    it('강의 가져오기', async () => {
      const course = courses[0]
      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/materials/courses/${course.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(
        expect.objectContaining({
          topic: expect.any(Object),
          title: expect.any(String),
          description: expect.any(String),
          level: expect.any(Number),
        })
      )
      expect(body.exercises).toHaveLength(3)
      body.exercises.forEach((exercise) =>
        expect(exercise).toEqual(
          expect.objectContaining({
            title: expect.any(String),
            text: expect.any(String),
          })
        )
      )
    })

    xit('없는 강의 가져오기 실패', async () => {
      await request
        .agent(app.getHttpServer())
        .get(`/materials/courses/-999`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
    })
  })

  describe('POST /materials 교재 생성하기', () => {
    it('교재 생성하기', async () => {
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

      const materialData = {
        title: 'hello',
        description: 'world',
        levelStart: 1,
        levelEnd: 10,
        image: '',
      }
      const { body: newMaterial } = await request
        .agent(app.getHttpServer())
        .post(`/materials`)
        .send(materialData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(newMaterial).toEqual(expect.objectContaining(materialData))

      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/materials/${newMaterial.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(expect.objectContaining(materialData))
    })

    xit('title 없는 교재 생성 실패', async () => {
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

      const materialData = {
        title: 'hello',
        description: 'world',
        levelStart: 1,
        levelEnd: 10,
        image: '',
      }

      await request
        .agent(app.getHttpServer())
        .post(`/materials`)
        .send(omit(materialData, 'title'))
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(400)
    })
  })

  describe('POST /materials/topics 토픽 생성하기', () => {
    it('토픽 생성하기', async () => {
      const material = materials[1]
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

      const topicData = {
        materialId: material.id,
        title: 'hello',
        description: 'world',
      }

      const { body: newTopic } = await request
        .agent(app.getHttpServer())
        .post(`/materials/topics`)
        .send(topicData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(newTopic).toEqual(
        expect.objectContaining(omit(topicData, 'materialId'))
      )

      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/materials/${material.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body.topics).toHaveLength(
        topics.filter((t) => t.material.id === material.id).length + 1
      )
    })
  })

  describe('POST /materials/courses 강의 생성하기', () => {
    it('강의 생성하기', async () => {
      const topic = topics[4]
      const material = topic.material
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

      const courseData = {
        topicId: topic.id,
        title: 'hello',
        description: 'world',
        level: 5,
        image: '',
      }

      const { body: newCourses } = await request
        .agent(app.getHttpServer())
        .post(`/materials/courses`)
        .send(courseData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(newCourses).toEqual(
        expect.objectContaining(omit(courseData, 'topicId'))
      )

      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/materials/${material.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      const updatedTopic = body.topics.find((t) => t.id === topic.id)
      expect(updatedTopic.courses).toHaveLength(
        courses.filter((c) => c.topic.id === topic.id).length + 1
      )
    })
  })

  describe('POST /materials/exercise 연습 생성하기', () => {
    it('연습 생성하기', async () => {
      const course = courses[21]
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

      const exerciseData = {
        courseId: course.id,
        index: 4,
        title: 'hello',
        description: 'world',
        text: '<h>hello</h>',
      }

      const { body: newExercise } = await request
        .agent(app.getHttpServer())
        .post(`/materials/exercises`)
        .send(exerciseData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(newExercise).toEqual(
        expect.objectContaining(omit(exerciseData, 'courseId'))
      )

      const { body: updatedCourse } = await request
        .agent(app.getHttpServer())
        .get(`/materials/courses/${course.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(updatedCourse.exercises).toHaveLength(
        exercises.filter((e) => e.course.id === course.id).length + 1
      )
    })
  })

  describe('DELETE /materials/:id 교재 삭제하기', () => {
    it('교재 삭제하기', async () => {
      const material = materials[3]
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
        .delete(`/materials/${material.id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      const { body: updatedMaterials } = await request
        .agent(app.getHttpServer())
        .get(`/materials`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(updatedMaterials).toHaveLength(materials.length - 1)
    })
  })

  describe('DELETE /materials/topics/:id 토픽 삭제하기', () => {
    it('토픽 삭제하기', async () => {
      const topic = topics[8]
      const material = topic.material
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
        .delete(`/materials/topics/${topic.id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      const { body: updatedMaterial } = await request
        .agent(app.getHttpServer())
        .get(`/materials/${material.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(updatedMaterial.topics).toHaveLength(
        topics.filter((t) => t.material.id === material.id).length - 1
      )
    })
  })

  describe('DELETE /materials/courses/:id 강의 삭제하기', () => {
    it('강의 삭제하기', async () => {
      const course = courses[21]
      const topic = course.topic
      const material = topic.material
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
        .delete(`/materials/courses/${course.id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      const { body: updatedMaterial } = await request
        .agent(app.getHttpServer())
        .get(`/materials/${material.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      const updatedTopic = updatedMaterial.topics.find((t) => t.id === topic.id)
      expect(updatedTopic.courses).toHaveLength(
        courses.filter((c) => c.topic.id === topic.id).length - 1
      )
    })
  })

  describe('DELETE /materials/exercises/:id 연습 삭제하기', () => {
    it('연습 삭제하기', async () => {
      const exercise = exercises[72]
      const course = exercise.course
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
        .delete(`/materials/exercises/${exercise.id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)

      const { body: updatedCourse } = await request
        .agent(app.getHttpServer())
        .get(`/materials/courses/${course.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(updatedCourse.exercises).toHaveLength(
        exercises.filter((e) => e.course.id === course.id).length - 1
      )
    })
  })

  describe('POST /materials/:id 교재 수정하기', () => {
    it('교재 수정하기', async () => {
      const material = materials[2]
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

      const materialData = {
        id: material.id,
        title: 'hello World',
        description: 'world',
        levelStart: 1,
        levelEnd: 10,
        image: '',
      }
      const { body: newMaterial } = await request
        .agent(app.getHttpServer())
        .post(`/materials/${material.id}`)
        .send(materialData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(newMaterial).toEqual(expect.objectContaining(materialData))

      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/materials/${newMaterial.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(expect.objectContaining(materialData))
    })
  })

  describe('POST /materials/topics/:id 토픽 수정하기', () => {
    it('토픽 수정하기', async () => {
      const topic = topics[8]
      const material = topic.material
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

      const topicData = {
        id: topic.id,
        title: 'hello world!',
        description: 'world',
      }

      const { body: newTopic } = await request
        .agent(app.getHttpServer())
        .post(`/materials/topics/${topic.id}`)
        .send(topicData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(newTopic).toEqual(expect.objectContaining(topicData))

      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/materials/${material.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body.topics.find((t) => t.id === topic.id)).toEqual(
        expect.objectContaining(topicData)
      )
    })
  })

  describe('POST /materials/courses/:id 강의 수정하기', () => {
    it('강의 수정하기', async () => {
      const course = courses[28]
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

      const courseData = {
        id: course.id,
        title: 'hello world',
        description: 'world',
        level: 5,
        image: '',
      }

      const { body: updatedCourse } = await request
        .agent(app.getHttpServer())
        .post(`/materials/courses/${course.id}`)
        .send(courseData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(updatedCourse).toEqual(expect.objectContaining(courseData))

      const { body } = await request
        .agent(app.getHttpServer())
        .get(`/materials/courses/${course.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(body).toEqual(expect.objectContaining(courseData))
    })
  })

  describe('POST /materials/exercise 연습 수정하기', () => {
    it('연습 수정하기', async () => {
      const exercise = exercises[120]
      const course = exercise.course
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

      const exerciseData = {
        id: exercise.id,
        index: 4,
        title: 'hello world!!',
        description: 'world',
        text: '<h>hello</h>',
      }

      const { body: updatedExercise } = await request
        .agent(app.getHttpServer())
        .post(`/materials/exercises/${exercise.id}`)
        .send(exerciseData)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(updatedExercise).toEqual(expect.objectContaining(exerciseData))

      const { body: updatedCourse } = await request
        .agent(app.getHttpServer())
        .get(`/materials/courses/${course.id}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(updatedCourse.exercises.find((e) => e.id === exercise.id)).toEqual(
        expect.objectContaining(exerciseData)
      )
    })
  })

  afterEach(async () => {
    await Promise.all([
      userRepository.createQueryBuilder().delete().from(User).execute(),
      materialRepository.createQueryBuilder().delete().from(Material).execute(),
      topicRepository.createQueryBuilder().delete().from(Topic).execute(),
      courseRepository.createQueryBuilder().delete().from(Course).execute(),
      exerciseRepository.createQueryBuilder().delete().from(Exercise).execute(),
    ])
  })

  afterAll(async () => {
    await app.close()
  })
})
