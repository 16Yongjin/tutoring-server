import 'dotenv/config'
import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TutorsModule } from './tutors/tutors.module'
import { AppointmentsModule } from './appointments/appointments.module'
import { ReviewsModule } from './reviews/reviews.module'
import { MaterialsModule } from './materials/materials.module'

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    AuthModule,
    UsersModule,
    TutorsModule,
    AppointmentsModule,
    ReviewsModule,
    MaterialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
