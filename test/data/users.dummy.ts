import { Tutor } from '../../src/tutors/tutor.entity'
import { Schedule } from '../../src/tutors/schedule.entity'
import { Role } from '../../src/shared/enums'
import { User } from '../../src/users/user.entity'
import * as day from 'dayjs'
import * as faker from 'faker'

export const createDummyUser = () => [
  User.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    role: Role.ADMIN,
    password: '123456',
  }),
  User.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123456',
  }),
]

export const createDummyTutor = () => [
  Tutor.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123456',
  }),
  Tutor.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123456',
  }),
]

export const createDummySchedules = (tutor: Tutor) => [
  Schedule.create({
    tutor,
    startTime: day().add(1, 'hours').set('minutes', 30).set('seconds', 0),
    endTime: day().add(1, 'hours').set('minutes', 55).set('seconds', 0),
  }),
  Schedule.create({
    tutor,
    startTime: day().add(2, 'hours').set('minutes', 0).set('seconds', 0),
    endTime: day().add(2, 'hours').set('minutes', 25).set('seconds', 0),
  }),
  Schedule.create({
    tutor,
    startTime: day().add(2, 'hours').set('minutes', 30).set('seconds', 0),
    endTime: day().add(2, 'hours').set('minutes', 55).set('seconds', 0),
  }),
  Schedule.create({
    tutor,
    startTime: day().add(3, 'hours').set('minutes', 30).set('seconds', 0),
    endTime: day().add(3, 'hours').set('minutes', 55).set('seconds', 0),
  }),
]
