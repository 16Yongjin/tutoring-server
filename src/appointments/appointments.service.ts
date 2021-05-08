import { Repository } from 'typeorm'
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
import { CreateAppointmentDto, RemoveAppointmentDto } from './dto'
import * as dayjs from 'dayjs'

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

  async findUserAppointments(userId: number | string) {
    return this.appointmentRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'tutor', 'feedback'],
    })
  }

  async makeAppointment(dto: CreateAppointmentDto): Promise<Appointment> {
    const user = await this.findUserWithNoAppointment(dto.userId)
    const tutor = await this.tutorsService.popSchedule(
      dto.tutorId,
      dto.startTime
    )

    const appointment = Appointment.create({
      user,
      tutor,
      startTime: dayjs(dto.startTime).set('seconds', 0),
      endTime: dayjs(dto.startTime).set('seconds', 0).add(25, 'minutes'),
    })

    return this.appointmentRepository.save(appointment)
  }

  async removeAppointment(dto: RemoveAppointmentDto): Promise<Appointment> {
    const appointment = await this.findOneById(dto.appointmentId)
    await this.tutorsService.addSchedule(
      appointment.tutor.id,
      appointment.startTime
    )
    return this.appointmentRepository.remove(appointment)
  }

  async findOneById(id: number | string) {
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

    delete appointment.user.password
    delete appointment.tutor.password

    return appointment
  }

  /**
   * 예정된 약속이 없는 경우에만 유저 반환
   */
  async findUserWithNoAppointment(userId: number | string) {
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
}
