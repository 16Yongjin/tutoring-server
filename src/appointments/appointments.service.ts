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
import * as dayjs from 'dayjs'
import { Role } from '../shared/enums'
import {
  APPOINTMENT_DURATION,
  USER_APPOINTMENT_CANCEL_TIME_LIMIT,
  USER_APPOINTMENT_COUNT_LIMIT,
  USER_APPOINTMENT_MAKE_TIME_LIMIT,
} from '../config/logic'
import { PK } from '../shared/types'

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

  async findUserAppointments(userId: PK) {
    const appointment = await this.appointmentRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'tutor', 'feedback'],
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

  async makeAppointment({
    userId,
    tutorId,
    startTime,
    material,
    request,
  }: CreateAppointmentDto): Promise<Appointment> {
    if (dayjs(startTime).diff(dayjs()) < USER_APPOINTMENT_MAKE_TIME_LIMIT) {
      throw new BadRequestException({
        message: 'Too late to make appointment',
        errors: { startTime: "It's too late" },
      })
    }

    return getManager()
      .transaction(async (manager) => {
        const user = await this.usersService.findOneByIdT(manager, userId)
        const appointmentCount = await this.countUserDueAppointment(
          manager,
          userId
        )
        if (appointmentCount >= USER_APPOINTMENT_COUNT_LIMIT) {
          throw new BadRequestException({
            message: "You'r appointment count limit is exceeded",
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
        })
        const savedAppointment = await manager.save(appointment)
        await this.tutorsService.occupySchedule(manager, schedule, appointment)
        return savedAppointment
      })
      .catch((e) => {
        console.log(e)
        throw e
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

  async findOneById(id: PK) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['user', 'tutor', 'feedback'],
    })

    if (!appointment) {
      throw new NotFoundException({
        message: 'Appointment not found',
        errors: { id: 'not existing' },
      })
    }

    return appointment
  }

  /**
   * 아직 안 끝나서 남아 있는 약속 개수 세기
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
   * 예정된 약속이 없는 경우에만 유저 반환
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
