import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TutorsService } from './tutors.service'
import { TutorGuard } from '../shared/guards/tutor.guard'
import { ValidationPipe } from '../shared/pipes'
import { PK } from '../shared/types'
import { UpdateTutorDto, AddSchedulesDto, RemoveSchedulesDto } from './dto'

@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorService: TutorsService) {}

  @Get()
  findAll() {
    return this.tutorService.findAll()
  }

  @Get(':id')
  findOneById(@Param('id') id: PK) {
    return this.tutorService.findOneById(id)
  }

  @Post(':id')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard, TutorGuard)
  updateTutor(@Body() dto: UpdateTutorDto) {
    return this.tutorService.updateTutor(dto)
  }

  @Post(':id/schedules')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard, TutorGuard)
  addSchedules(@Param('id') id: number, @Body() dto: AddSchedulesDto) {
    return this.tutorService.addSchedules(id, dto)
  }

  @Post(':id/schedules/remove')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard, TutorGuard)
  removeSchedules(@Param('id') id: number, @Body() dto: RemoveSchedulesDto) {
    return this.tutorService.removeSchedules(id, dto)
  }
}
