import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Review } from './review.entity'
import { ReviewsService } from './reviews.service'
import { ReviewsController } from './reviews.controller'
import { UsersModule } from '../users/users.module'
import { TutorsModule } from '../tutors/tutors.module'
import { AppointmentsModule } from '../appointments/appointments.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    UsersModule,
    TutorsModule,
    AppointmentsModule,
  ],
  providers: [ReviewsService],
  controllers: [ReviewsController],
  exports: [TypeOrmModule, ReviewsService],
})
export class ReviewsModule {}
