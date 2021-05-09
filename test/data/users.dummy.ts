import * as day from 'dayjs'
import * as faker from 'faker'
import { Role } from '../../src/shared/enums'
import { User } from '../../src/users/user.entity'
import { Tutor } from '../../src/tutors/tutor.entity'
import { Schedule } from '../../src/tutors/schedule.entity'
import { Appointment } from '../../src/appointments/appointment.entity'

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

export const createDummyAppointment = (user: User, tutor: Tutor) =>
  Appointment.create({
    user,
    tutor,
    startTime: day().add(4, 'hours').set('minutes', 30).set('seconds', 0),
    endTime: day().add(4, 'hours').set('minutes', 55).set('seconds', 0),
  })

export const createEndedAppointment = (user: User, tutor: Tutor) =>
  Appointment.create({
    user,
    tutor,
    startTime: day().subtract(1, 'hours').set('seconds', 0),
    endTime: day().subtract(1, 'hours').add(25, 'minutes').set('seconds', 0),
  })
