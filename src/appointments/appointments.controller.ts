import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { ValidationPipe } from '../shared/pipes'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateAppointmentDto, FeedbackAppointmentDto } from './dto'
import { Roles, UserInfo } from '../shared/decoratos'
import { UserAuth } from '../shared/interfaces'
import { Role } from '../shared/enums'
import { RolesGuard } from '../shared/guards'

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('me')
  @Roles(Role.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findUserAppointment(@UserInfo('id') userId: number) {
    return this.appointmentsService.findUserAppointments(userId)
  }

  @Post()
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  makeAppointment(
    @UserInfo() user: UserAuth,
    @Body(new ValidationPipe()) dto: CreateAppointmentDto
  ) {
    const isAdmin = user.role === Role.ADMIN
    const isUserSelf = dto.userId === user.id
    if (!isAdmin && !isUserSelf) {
      throw new UnauthorizedException({
        message: "You're not allowed make other's appointment",
        errros: { userId: 'not allowed' },
      })
    }

    return this.appointmentsService.makeAppointment(dto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeAppointment(@Param('id') id: number, @UserInfo() user: UserAuth) {
    const appointment = await this.appointmentsService.findOneById(id)
    const isAdmin = user.role === Role.ADMIN
    const isUserOwned = appointment.user.id === user.id
    if (!isAdmin && !isUserOwned) {
      throw new UnauthorizedException({
        message: "Yor're not allowed to remove other's appointment",
        errros: { appointmentId: 'not allowed' },
      })
    }

    return this.appointmentsService.removeAppointment({
      role: user.role,
      appointmentId: id,
    })
  }

  @Post('feedback')
  @Roles(Role.ADMIN, Role.TUTOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async feedbackAppointment(
    @UserInfo() user: UserAuth,
    @Body(new ValidationPipe()) dto: FeedbackAppointmentDto
  ) {
    const appointment = await this.appointmentsService.findOneById(
      dto.appointmentId
    )
    const isAdmin = user.role === Role.ADMIN
    const isTutorOwned = appointment.tutor.id === user.id
    if (!isAdmin && !isTutorOwned) {
      throw new UnauthorizedException({
        message: "Yor're not allowed to feedback other's appointment",
        errros: { appointmentId: 'not allowed' },
      })
    }

    return this.appointmentsService.feedbackAppointment(dto)
  }
}
