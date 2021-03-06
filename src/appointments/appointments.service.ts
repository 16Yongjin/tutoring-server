import {
  EntityManager,
  getManager,
  LessThan,
  MoreThan,
  Repository,
  TransactionManager,
} from 'typeorm'
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { TutorsService } from '../tutors/tutors.service'
import { UsersService } from '../users/users.service'
import { Appointment } from './appointment.entity'
import { Feedback } from './feedback.entity'
import {
  CreateAppointmentDto,
  FeedbackAppointmentDto,
  RemoveAppointmentDto,
} from './dto'
import dayjs from 'dayjs'
import { Role } from '../shared/enums'
import {
  APPOINTMENT_DURATION,
  USER_APPOINTMENT_CANCEL_TIME_LIMIT,
  USER_APPOINTMENT_COUNT_LIMIT,
  USER_APPOINTMENT_MAKE_TIME_LIMIT,
} from '../config/logic'
import { PK } from '../shared/types'
import { clamp } from 'lodash'

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private usersService: UsersService,
    private tutorsService: TutorsService
  ) {}

  async findAppointments({
    page = 1,
    take = 10,
  }: {
    page: number
    take: number
  }) {
    const size = clamp(take, 1, 10)
    const skip = Math.max((page - 1) * size, 0)
    const appointments = await this.appointmentRepository.find({
      relations: ['user', 'tutor', 'feedback'],
      skip,
      take: size,
    })

    return appointments
  }

  async findUserAppointments({
    userId,
    page = 1,
    take = 10,
  }: {
    userId: PK
    page: number
    take: number
  }) {
    const size = clamp(take, 1, 10)
    const skip = Math.max((page - 1) * size, 0)
    const appointments = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.user', 'user')
      .leftJoinAndSelect('appointment.tutor', 'tutor')
      .leftJoinAndSelect('appointment.feedback', 'feedback')
      .leftJoinAndSelect(
        'tutor.reviews',
        'reviews',
        'reviews.userId = appointment.userId'
      )
      .where('appointment.user.id = :userId', { userId })
      .orderBy('appointment.startTime', 'DESC')
      .skip(skip)
      .take(size)
      .getMany()
    return appointments
  }

  async findTutorAppointments({
    tutorId,
    page = 1,
    take = 10,
  }: {
    tutorId: PK
    page: number
    take: number
  }) {
    const size = clamp(take, 1, 10)
    const skip = Math.max((page - 1) * size, 0)
    const appointments = await this.appointmentRepository.find({
      where: { tutor: { id: tutorId } },
      relations: ['user', 'tutor', 'feedback'],
      order: { startTime: 'DESC' },
      skip,
      take: size,
    })

    return appointments
  }

  async findOneById(id: PK, relations = ['user', 'tutor', 'feedback']) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations,
    })

    if (!appointment) {
      throw new NotFoundException({
        message: 'appointment not found',
        errors: { id: 'not exists' },
      })
    }

    return appointment
  }

  async findOneByIdT(
    @TransactionManager() manager: EntityManager,
    id: PK,
    relations: string[] = []
  ): Promise<Appointment> {
    const appointment = await manager.findOne(Appointment, {
      where: { id },
      relations,
    })

    if (!appointment) {
      throw new NotFoundException({
        message: 'appointment not found',
        errors: { id: 'not exists' },
      })
    }

    return appointment
  }

  async findUpcomingUserAppointment(userId: PK) {
    const appointments = await this.appointmentRepository.find({
      where: { user: { id: userId }, endTime: MoreThan(dayjs()) },
      relations: ['user', 'tutor', 'feedback'],
      order: { startTime: 'ASC' },
    })

    const [appointment] = appointments.sort(
      (a1, a2) => a1.startTime.getTime() - a2.startTime.getTime()
    )

    return appointment
  }

  async findUpcomingTutorAppointment(tutorId: PK) {
    const appointments = await this.appointmentRepository.find({
      where: { tutor: { id: tutorId }, endTime: MoreThan(dayjs()) },
      relations: ['user', 'tutor', 'feedback'],
      order: { startTime: 'ASC' },
    })

    const [appointment] = appointments.sort(
      (a1, a2) => a1.startTime.getTime() - a2.startTime.getTime()
    )

    return appointment
  }

  async makeAppointment({
    userId,
    tutorId,
    startTime,
    material,
    request,
    courseId,
  }: CreateAppointmentDto): Promise<Appointment> {
    if (dayjs(startTime).diff(dayjs()) < USER_APPOINTMENT_MAKE_TIME_LIMIT) {
      throw new BadRequestException({
        message: 'Too late to make appointment',
        errors: { startTime: "It's too late" },
      })
    }

    return getManager().transaction(async (manager) => {
      const user = await this.usersService.findOneByIdT(manager, userId)
      const appointmentCount = await this.countUserDueAppointment(
        manager,
        userId
      )
      if (appointmentCount >= USER_APPOINTMENT_COUNT_LIMIT) {
        throw new BadRequestException({
          message: 'Your appointment count limit is exceeded',
          errors: { appointmentCount: 'has exceeded' },
        })
      }

      const tutor = await this.tutorsService.findOneByIdT(manager, tutorId)
      const schedule = this.tutorsService.findEmptySchedule(tutor, startTime)
      if (!schedule) {
        throw new BadRequestException({
          message: 'Tutor is not available',
          errors: { startTime: 'not available' },
        })
      }

      const appointment = Appointment.create({
        user,
        tutor,
        startTime: dayjs(startTime).set('seconds', 0),
        endTime: dayjs(startTime)
          .set('seconds', 0)
          .add(APPOINTMENT_DURATION, 'minutes'),
        schedule,
        material,
        request,
        courseId,
      })
      const savedAppointment = await manager.save(appointment)
      await this.tutorsService.occupySchedule(manager, schedule, appointment)
      return savedAppointment
    })
  }

  async removeAppointment(dto: RemoveAppointmentDto): Promise<Appointment> {
    return getManager().transaction(async (manager) => {
      const appointment = await this.findOneByIdT(manager, dto.appointmentId, [
        'schedule',
      ])
      if (dto.role !== Role.ADMIN)
        this.checkUserCanCancelAppointment(appointment)

      await this.tutorsService.releaseSchedule(manager, appointment.schedule)

      return manager.remove(appointment)
    })
  }

  /**
   * ?????? ??? ????????? ?????? ?????? ?????? ?????? ??????
   */
  async countUserDueAppointment(
    @TransactionManager() manager: EntityManager,
    userId: PK
  ): Promise<number> {
    const appointment = await manager.find(Appointment, {
      where: { user: { id: userId }, endTime: MoreThan(dayjs()) },
    })
    return appointment.length
  }

  /**
   * ????????? ????????? ?????? ???????????? ?????? ??????
   */
  async findUserWithNoAppointment(userId: PK) {
    const user = await this.usersService.findOneById(userId, ['appointments'])
    const now = dayjs()
    const hasAppointment = user.appointments.find((appointment) =>
      now.isBefore(appointment.endTime)
    )

    if (hasAppointment) {
      throw new BadRequestException({
        message: 'Only one appointment can be made.',
        errors: { user: 'User already has appointment' },
      })
    }

    return user
  }

  checkUserCanCancelAppointment(appointment: Appointment) {
    if (
      dayjs(appointment.startTime).diff(dayjs()) <
      USER_APPOINTMENT_CANCEL_TIME_LIMIT
    ) {
      throw new BadRequestException({
        message: "It's too late to cancel the appointment",
        errors: { cancelTime: "I't too late" },
      })
    }
  }

  async feedbackAppointment({ appointmentId, text }: FeedbackAppointmentDto) {
    return getManager().transaction(async (manager) => {
      const appointment = await this.findOneByIdT(manager, appointmentId, [
        'feedback',
      ])

      if (dayjs().isBefore(appointment.endTime)) {
        throw new BadRequestException({
          message: "It's too early to leave a feedback",
          errors: { currentTime: "It's too early" },
        })
      }

      if (appointment.feedback) {
        throw new BadRequestException({
          message: 'Feedback already exists',
          errors: { feedback: 'Alreay exists' },
        })
      }

      const feedback = Feedback.create({
        appointment,
        text,
      })

      return manager.save(feedback)
    })
  }

  async hasUserMadeAppointmentWithTutor(userId: PK, tutorId: PK) {
    const appointment = await this.appointmentRepository.findOne({
      where: {
        user: { id: userId },
        tutor: { id: tutorId },
        endTime: LessThan(dayjs()),
      },
    })
    return !!appointment
  }
}
