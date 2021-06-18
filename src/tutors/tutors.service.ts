import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ChangePasswordDto, LoginUserDto } from '../users/dto'
import {
  EntityManager,
  getManager,
  MoreThan,
  Repository,
  TransactionManager,
} from 'typeorm'
import { Tutor } from './tutor.entity'
import * as argon2 from 'argon2'
import dayjs from 'dayjs'
import { Schedule } from './schedule.entity'
import { compareDate } from '../utils/compareDate'
import { APPOINTMENT_DURATION } from '../config/logic'
import { PK } from '../shared/types'
import {
  UpdateTutorDto,
  CreateTutorDto,
  AddScheduleDto,
  RemoveScheduleDto,
  AcceptTutorDto,
} from './dto'
import { Appointment } from '../appointments/appointment.entity'
import minMax from 'dayjs/plugin/minMax'
dayjs.extend(minMax)
@Injectable()
export class TutorsService {
  constructor(
    @InjectRepository(Tutor) private tutorRepository: Repository<Tutor>,
    @InjectRepository(Schedule) private scheduleRepository: Repository<Schedule>
  ) {}

  create(dto: CreateTutorDto) {
    const newTutor = new Tutor()
    newTutor.username = dto.username
    newTutor.email = dto.email
    newTutor.password = dto.password
    newTutor.fullname = dto.fullname
    newTutor.gender = dto.gender
    newTutor.language = dto.language
    newTutor.presentation = dto.presentation
    newTutor.image = dto.image
    newTutor.country = dto.country

    return this.tutorRepository.save(newTutor)
  }

  async verifyTutor({ username, password }: LoginUserDto): Promise<Tutor> {
    const tutor = await this.tutorRepository.findOne({ username })
    if (!tutor) return null

    if (await argon2.verify(tutor.password, password)) return tutor

    return null
  }

  async findAllByUser(): Promise<Tutor[]> {
    const tutors = await this.tutorRepository
      .createQueryBuilder('tutor')
      .select([
        'tutor.id',
        'tutor.fullname',
        'tutor.language',
        'tutor.image',
        'tutor.gender',
        'tutor.presentation',
        'tutor.country',
        'tutor.rating',
        'tutor.reviewCount',
      ])
      .where({ verified: true, accepted: true })
      .getMany()

    return tutors
  }

  async searchTutors({
    startTimeStr,
    endTimeStr,
  }: {
    startTimeStr: string
    endTimeStr: string
  }): Promise<Tutor[]> {
    const startTime = dayjs.max(dayjs(startTimeStr), dayjs())
    const endTime = dayjs(endTimeStr)
    const tutors = await this.tutorRepository
      .createQueryBuilder('tutor')
      .select([
        'tutor.id',
        'tutor.fullname',
        'tutor.language',
        'tutor.image',
        'tutor.gender',
        'tutor.presentation',
        'tutor.country',
        'tutor.rating',
        'tutor.reviewCount',
      ])
      .leftJoinAndSelect(
        'tutor.schedules',
        'schedule',
        'schedule.startTime BETWEEN :startTime AND :endTime',
        { startTime, endTime }
      )
      .where({ verified: true, accepted: true })
      .getMany()

    return tutors.filter((tutor) => tutor.schedules.length)
  }

  async findAllByAdmin(relations: string[] = []): Promise<Tutor[]> {
    const tutors = await this.tutorRepository.find({ relations })
    return tutors
  }

  async findOneByIdWithSchedules(id: PK): Promise<Tutor> {
    const tutor = await this.tutorRepository
      .createQueryBuilder('tutor')
      .select([
        'tutor.id',
        'tutor.fullname',
        'tutor.language',
        'tutor.image',
        'tutor.gender',
        'tutor.presentation',
        'tutor.country',
        'tutor.youtube',
        'tutor.rating',
        'tutor.reviewCount',
      ])
      .leftJoinAndSelect(
        'tutor.schedules',
        'schedule',
        'schedule.startTime >= :todayStart',
        { todayStart: dayjs().startOf('day') }
      )
      .where({ id, verified: true, accepted: true })
      .getOne()

    if (!tutor) {
      const error = {
        message: 'Tutor not found',
        errors: { id: 'not existing' },
      }
      throw new NotFoundException(error)
    }

    return tutor
  }

  async findOneById(
    id: PK,
    relations: string[] = ['schedules']
  ): Promise<Tutor> {
    const tutor = await this.tutorRepository.findOne({
      where: { id },
      relations,
    })
    if (!tutor) {
      const error = {
        message: 'Tutor not found',
        errors: { id: 'not existing' },
      }
      throw new NotFoundException(error)
    }

    return tutor
  }

  async findOneByIdT(
    @TransactionManager() manager: EntityManager,
    id: PK,
    relations: string[] = ['schedules']
  ): Promise<Tutor> {
    const tutor = manager.findOne(Tutor, {
      where: { id },
      relations,
    })

    if (!tutor) {
      const error = {
        message: 'Tutor not found',
        errors: { id: 'not existing' },
      }
      throw new NotFoundException(error)
    }

    return tutor
  }

  findOneByUsername(username: string): Promise<Tutor | undefined> {
    return this.tutorRepository
      .createQueryBuilder('tutor')
      .where('tutor.username = :username', { username })
      .addSelect('tutor.password')
      .getOne()
  }

  async findOneByUsernameT(
    @TransactionManager() manager: EntityManager,
    username: string
  ): Promise<Tutor> {
    const tutor = await manager.findOne(Tutor, {
      where: { username },
    })
    if (!tutor) {
      throw new NotFoundException({
        message: 'Tutor not found',
        errors: { username: 'not existing' },
      })
    }
    return tutor
  }

  checkExistingTutor(
    username: string,
    email: string
  ): Promise<Tutor | undefined> {
    return this.tutorRepository.findOne({
      where: [{ username }, { email }],
    })
  }

  async findTutorSchedules({ tutorId, userId }: { tutorId: PK; userId?: PK }) {
    const todayStart = dayjs().startOf('day')
    return this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect(
        'schedule.appointment',
        'appointment',
        'appointment.userId = :userId',
        { userId }
      )
      .where('schedule.tutorId = :tutorId', { tutorId })
      .andWhere('schedule.startTime > :todayStart', { todayStart })
      .getMany()
  }

  async findTutorSchedule({
    tutorId,
    schedule,
  }: {
    tutorId: PK
    schedule: Date
  }) {
    return this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.tutorId = :tutorId', { tutorId })
      .andWhere(
        'schedule.startTime > :rangeStart AND schedule.startTime < :rangeEnd',
        {
          rangeStart: dayjs(schedule).subtract(1, 'minute'),
          rangeEnd: dayjs(schedule).add(1, 'minute'),
        }
      )

      .getOne()
  }

  async addSchedule(tutorId: PK, { schedule }: AddScheduleDto) {
    const existingSchedule = await this.findTutorSchedule({ tutorId, schedule })

    if (existingSchedule) return existingSchedule

    const tutor = await this.findOneById(tutorId)

    const newSchedule = Schedule.create({
      tutor,
      startTime: dayjs(schedule).set('second', 0),
      endTime: dayjs(schedule)
        .set('second', 0)
        .add(APPOINTMENT_DURATION, 'minutes'),
    })

    return this.scheduleRepository.save(newSchedule)
  }

  async removeSchedule(tutorId: PK, { schedule }: RemoveScheduleDto) {
    const existingSchedule = await this.findTutorSchedule({ tutorId, schedule })

    if (!existingSchedule) {
      throw new NotFoundException({
        message: 'Schedule not found',
        errors: { schedule: 'Not found' },
      })
    }

    if (existingSchedule.appointmentId) {
      throw new BadRequestException({
        message: 'Reserved Schedule cannot be deleted',
        errors: { schedule: 'contains reserved schedule' },
      })
    }

    return this.scheduleRepository.remove(existingSchedule)
  }

  occupySchedule(
    @TransactionManager() manager: EntityManager,
    schedule: Schedule,
    appointment: Appointment
  ) {
    schedule.appointmentId = appointment.id
    return manager.save(schedule)
  }

  releaseSchedule(
    @TransactionManager() manager: EntityManager,
    schedule: Schedule
  ) {
    schedule.appointmentId = null
    return manager.save(schedule)
  }

  findSchedule(tutor: Tutor, date: Date): Schedule {
    return tutor.schedules?.find(({ startTime }) =>
      compareDate(startTime, date)
    )
  }

  findEmptySchedule(tutor: Tutor, date: Date): Schedule {
    return tutor.schedules?.find(
      ({ startTime, appointmentId }) =>
        compareDate(startTime, date) && !appointmentId
    )
  }

  async changePassword({ username, password }: ChangePasswordDto) {
    return getManager().transaction(async (manager) => {
      const tutor = await this.findOneByUsernameT(manager, username)
      tutor.password = password
      await tutor.hashPassword()
      return manager.save(tutor)
    })
  }

  async updateTutor({ username, ...dto }: UpdateTutorDto) {
    return getManager().transaction(async (manager) => {
      const tutor = await this.findOneByUsernameT(manager, username)
      return manager.save(Tutor, { ...tutor, ...dto })
    })
  }

  async acceptTutor({ tutorId }: AcceptTutorDto) {
    return getManager().transaction(async (manager) => {
      const tutor = await this.findOneByIdT(manager, tutorId, [])
      tutor.accepted = true
      return manager.save(Tutor, tutor)
    })
  }

  updateTutorRating(
    @TransactionManager() manager: EntityManager,
    tutor: Tutor,
    rating: number
  ) {
    if (tutor.reviewCount === 0) {
      tutor.reviewCount = 1
      tutor.rating = rating
    } else {
      tutor.rating =
        (tutor.rating * tutor.reviewCount + rating) / (tutor.reviewCount + 1)
      tutor.reviewCount += 1
    }

    return manager.save(tutor)
  }
}
