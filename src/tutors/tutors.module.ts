import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Tutor } from './tutor.entity'
import { Schedule } from './schedule.entity'
import { TutorsService } from './tutors.service'
import { TutorsController } from './tutors.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Tutor, Schedule])],
  providers: [TutorsService],
  controllers: [TutorsController],
  exports: [TypeOrmModule, TutorsService],
})
export class TutorsModule {}
