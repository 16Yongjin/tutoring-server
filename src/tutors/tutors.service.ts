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
  Repository,
  TransactionManager,
} from 'typeorm'
import { Tutor } from './tutor.entity'
import * as argon2 from 'argon2'
import * as dayjs from 'dayjs'
import { Schedule } from './schedule.entity'
import { compareDate } from '../utils/compareDate'
import { APPOINTMENT_DURATION } from '../config/logic'
import { PK } from '../shared/types'
import {
  UpdateTutorDto,
  CreateTutorDto,
  AddSchedulesDto,
  RemoveSchedulesDto,
} from './dto'
import { Appointment } from '../appointments/appointment.entity'

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

  async findAll(): Promise<Tutor[]> {
    const tutors = await this.tutorRepository.find({ relations: ['schedules'] })
    return tutors
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

  async addSchedule(id: PK, startTime: Date) {
    const tutor = await this.findOneById(id)

    const existingSchedule = this.findSchedule(tutor, startTime)

    if (existingSchedule) return existingSchedule

    const newSchedule = Schedule.create({
      tutor,
      startTime: dayjs(startTime).set('second', 0),
      endTime: dayjs(startTime)
        .set('second', 0)
        .add(APPOINTMENT_DURATION, 'minutes'),
    })

    return this.scheduleRepository.save(newSchedule)
  }
  async addSchedules(id: PK, { schedules }: AddSchedulesDto) {
    return getManager().transaction(async (manager) => {
      const tutor = await this.findOneByIdT(manager, id)
      const hasSchedule = tutor.schedules
        .map((s) => dayjs(s.startTime).format('YYYY-MM-DDTHH:mm'))
        .reduce(
          (acc, v) => ((acc[v] = true), acc),
          {} as Record<string, boolean>
        )

      const filteredSchedules = schedules
        .filter((d) => !hasSchedule[dayjs(d).format('YYYY-MM-DDTHH:mm')])
        .map((startTime) =>
          Schedule.create({
            tutor,
            startTime,
            endTime: dayjs(startTime).add(APPOINTMENT_DURATION, 'minutes'),
          })
        )

      await manager.save(filteredSchedules)

      return this.findOneByIdT(manager, id)
    })
  }

  async removeSchedules(id: PK, { schedules }: RemoveSchedulesDto) {
    return getManager().transaction(async (manager) => {
      const tutor = await this.findOneByIdT(manager, id)
      const isTargetSchedule = schedules
        .map((d) => dayjs(d).format('YYYY-MM-DDTHH:mm'))
        .reduce(
          (acc, v) => ((acc[v] = true), acc),
          {} as Record<string, boolean>
        )

      const targetSchedules = tutor.schedules.filter(
        (s) => isTargetSchedule[dayjs(s.startTime).format('YYYY-MM-DDTHH:mm')]
      )

      if (targetSchedules.some((s) => !!s.appointmentId)) {
        throw new BadRequestException({
          message: 'Reserved Schedule cannot be deleted',
          errors: { schedules: 'contains reserved schedule' },
        })
      }

      await manager.remove(targetSchedules)

      return this.findOneByIdT(manager, id)
    })
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
}
