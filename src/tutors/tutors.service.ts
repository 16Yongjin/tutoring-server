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
    const tutor = await this.findOneById(id)
    const hasSchedule = tutor.schedules
      .map((s) => dayjs(s.startTime).format('YYYY-MM-DDTHH:mm'))
      .reduce((acc, v) => ((acc[v] = true), acc), {} as Record<string, boolean>)

    const filteredSchedules = schedules
      .filter((d) => !hasSchedule[dayjs(d).format('YYYY-MM-DDTHH:mm')])
      .map((startTime) =>
        Schedule.create({
          tutor,
          startTime,
          endTime: dayjs(startTime).add(APPOINTMENT_DURATION, 'minutes'),
        })
      )

    await this.scheduleRepository.save(filteredSchedules)

    return this.findOneById(id)
  }

  async removeSchedules(id: PK, { schedules }: RemoveSchedulesDto) {
    const tutor = await this.findOneById(id)
    const isTargetSchedule = schedules
      .map((d) => dayjs(d).format('YYYY-MM-DDTHH:mm'))
      .reduce((acc, v) => ((acc[v] = true), acc), {} as Record<string, boolean>)

    const targetSchedules = tutor.schedules.filter(
      (s) => isTargetSchedule[dayjs(s.startTime).format('YYYY-MM-DDTHH:mm')]
    )

    await this.scheduleRepository.remove(targetSchedules)

    return this.findOneById(id)
  }

  async popSchedule(id: PK, date: Date) {
    const tutor = await this.findOneById(id)
    const schedule = this.findSchedule(tutor, date)

    if (!schedule) {
      throw new BadRequestException({
        message: "Tutor's schedule is not available.",
        errors: { startTime: 'schedule is not available' },
      })
    }

    await this.scheduleRepository.remove(schedule)

    return this.findOneById(id)
  }

  findSchedule(tutor: Tutor, date: Date): Schedule {
    return tutor.schedules?.find(({ startTime }) =>
      compareDate(startTime, date)
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
