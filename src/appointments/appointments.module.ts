import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Appointment } from './appointment.entity'
import { AppointmentsService } from './appointments.service'
import { TutorsModule } from '../tutors/tutors.module'
import { UsersModule } from '../users/users.module'
import { Feedback } from './feedback.entity'
import { AppointmentsController } from './appointments.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Feedback]),
    UsersModule,
    TutorsModule,
  ],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}
