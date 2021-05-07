import { Repository } from 'typeorm'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { TutorsService } from '../tutors/tutors.service'
import { UsersService } from '../users/users.service'
import { Appointment } from './appointment.entity'
import { Tutor } from '../tutors/tutor.entity'
import { Feedback } from './feedback.entity'
import { CreateAppointmentDto, RemoveAppointmentDto } from './dto'
import * as dayjs from 'dayjs'
import { compareDate } from '../utils/compareDate'

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

  async makeAppointment(dto: CreateAppointmentDto): Promise<Appointment> {
    const tutor = await this.tutorsService.popSchedule(
      dto.tutorId,
      dto.startTime
    )
    const user = await this.usersService.findOneById(dto.userId)

    const appointment = Appointment.create({
      user,
      tutor,
      startTime: dto.startTime,
      endTime: dayjs(dto.startTime).add(25, 'minutes'),
    })

    return this.appointmentRepository.save(appointment)
  }

  async removeAppointment(dto: RemoveAppointmentDto): Promise<Appointment> {
    const appointment = await this.findOneById(dto.appointmentId)
    return this.appointmentRepository.remove(appointment)
  }

  findOneById(id: number | string) {
    const appointment = this.appointmentRepository.findOne({
      where: { id },
      relations: ['feedback'],
    })

    if (!appointment) {
      throw new NotFoundException({
        message: 'Appointment not found',
        errors: { id: 'not existing' },
      })
    }

    return appointment
  }
}
