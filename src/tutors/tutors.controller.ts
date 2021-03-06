import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TutorsService } from './tutors.service'
import { TutorGuard } from '../shared/guards/tutor.guard'
import { ValidationPipe } from '../shared/pipes'
import { PK } from '../shared/types'
import { UpdateTutorDto, AddScheduleDto, RemoveScheduleDto } from './dto'
import { Roles, UserInfo } from '../shared/decoratos'
import { Role } from '../shared/enums'
import { RolesGuard } from '../shared/guards'

@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorService: TutorsService) {}

  @Get()
  findAll() {
    return this.tutorService.findAllByUser()
  }

  @Get('search')
  search(
    @Query('startTime') startTimeStr: string,
    @Query('endTime') endTimeStr: string
  ) {
    return this.tutorService.searchTutors({ startTimeStr, endTimeStr })
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard)
  findAllByAdmin() {
    return this.tutorService.findAllByAdmin()
  }

  @Get(':id')
  findOneById(@Param('id') id: PK) {
    return this.tutorService.findOneByIdWithSchedules(id)
  }

  @Post(':id')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard, TutorGuard)
  updateTutor(@Body() dto: UpdateTutorDto) {
    return this.tutorService.updateTutor(dto)
  }

  @Get(':id/schedules')
  @Roles(Role.ADMIN, Role.USER)
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard, RolesGuard)
  findSchedules(@Param('id') tutorId: number, @UserInfo('id') userId: number) {
    return this.tutorService.findTutorSchedules({
      tutorId,
      userId,
    })
  }

  @Post(':id/schedules')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard, TutorGuard)
  addSchedule(@Param('id') id: number, @Body() dto: AddScheduleDto) {
    return this.tutorService.addSchedule(id, dto)
  }

  @Post(':id/schedules/remove')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard, TutorGuard)
  removeSchedule(@Param('id') id: number, @Body() dto: RemoveScheduleDto) {
    return this.tutorService.removeSchedule(id, dto)
  }
}
