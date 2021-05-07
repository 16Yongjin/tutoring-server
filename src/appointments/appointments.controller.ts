import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { ValidationPipe } from '../shared/pipes'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateAppointmentDto } from './dto'
import { Roles, UserInfo } from '../shared/decoratos'
import { UserAuth } from '../shared/interfaces'
import { Role } from '../shared/enums'
import { RolesGuard } from '../shared/guards'

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  makeAppointment(
    @UserInfo() user: UserAuth,
    @Body(new ValidationPipe()) dto: CreateAppointmentDto
  ) {
    const isAdmin = user.role !== Role.ADMIN
    const isUserSelf = dto.userId !== user.id
    if (!isAdmin && isUserSelf) {
      throw new UnauthorizedException({
        message: '',
        errros: { userId: 'not allowed' },
      })
    }

    return this.appointmentsService.makeAppointment(dto)
  }
}
