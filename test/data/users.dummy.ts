import * as day from 'dayjs'
import * as faker from 'faker'
import { Role } from '../../src/shared/enums'
import { User } from '../../src/users/user.entity'
import { Tutor } from '../../src/tutors/tutor.entity'
import { Schedule } from '../../src/tutors/schedule.entity'
import { Appointment } from '../../src/appointments/appointment.entity'
import { Review } from '../../src/reviews/review.entity'

export const createDummyUser = () => [
  User.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    role: Role.ADMIN,
    password: '123456',
    verified: true,
  }),
  User.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123456',
    verified: true,
  }),
  User.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123456',
    verified: true,
  }),
  User.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123456',
    verified: true,
  }),
]

export const createDummyTutor = () => [
  Tutor.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123456',
    verified: true,
  }),
  Tutor.create({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123456',
    verified: true,
  }),
]

export const createDummySchedules = (tutor: Tutor) => [
  Schedule.create({
    tutor,
    startTime: day().subtract(1, 'hours').set('minutes', 30).set('seconds', 0),
    endTime: day().subtract(1, 'hours').set('minutes', 55).set('seconds', 0),
  }),
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

export const createDummyAppointment = (
  user: User,
  tutor: Tutor,
  schedule: Schedule
) => {
  return Appointment.create({
    user,
    tutor,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    schedule,
    material: 'conversation',
  })
}
export const createEndedAppointment = (
  user: User,
  tutor: Tutor,
  schedule: Schedule
) => {
  return Appointment.create({
    user,
    tutor,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    schedule,
    material: 'conversation',
  })
}

export const makeDummyReview = (user: User, tutor: Tutor) =>
  Review.create({
    user,
    tutor,
    text: 'hello world',
    rating: 5,
  })
