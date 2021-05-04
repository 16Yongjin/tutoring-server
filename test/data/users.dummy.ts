import { Tutor } from '../../src/tutors/tutor.entity'
import { Role } from '../../src/shared/enums'
import { User } from '../../src/users/user.entity'

export const createDummyUser = () => [
  User.create({
    username: 'test-user-1',
    email: 'test-1@test.com',
    fullname: 'paul',
    role: Role.ADMIN,
    password: '123456',
  }),
  User.create({
    username: 'test-user-2',
    email: 'test-2@test.com',
    fullname: 'james',
    password: '123456',
  }),
]

export const createDummyTutor = () => [
  Tutor.create({
    username: 'test-tutor-1',
    email: 'test-tutor1@test.com',
    fullname: 'paul',
    password: '123456',
  }),
  Tutor.create({
    username: 'test-tutor-2',
    email: 'test-tutor2@test.com',
    fullname: 'james',
    password: '123456',
  }),
]
