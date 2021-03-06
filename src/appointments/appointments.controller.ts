import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
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

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAppointments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number
  ) {
    return this.appointmentsService.findAppointments({ page, take })
  }

  @Get('upcoming')
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findUpcomingUserAppointments(@UserInfo('id') userId: number) {
    return this.appointmentsService.findUpcomingUserAppointment(userId)
  }

  @Get('tutors/upcoming')
  @Roles(Role.TUTOR, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findUpcomingTutorAppointments(@UserInfo('id') tutorId: number) {
    return this.appointmentsService.findUpcomingTutorAppointment(tutorId)
  }

  @Get('me')
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findUserAppointments(
    @UserInfo('id') userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number
  ) {
    return this.appointmentsService.findUserAppointments({ userId, page, take })
  }

  @Get('tutors')
  @Roles(Role.TUTOR, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findTutorAppointments(
    @UserInfo('id') tutorId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number
  ) {
    return this.appointmentsService.findTutorAppointments({
      tutorId,
      page,
      take,
    })
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.USER, Role.TUTOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findOneById(@Param('id') id: number, @UserInfo() user: UserAuth) {
    const appointment = await this.appointmentsService.findOneById(id)

    const isAdmin = user.role === Role.ADMIN
    const isOwner =
      (user.role === Role.USER && user.id === appointment.user.id) ||
      (user.role === Role.TUTOR && user.id === appointment.tutor.id)

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException({
        message: 'You are not allowed to access appointment.',
        errors: { id: 'not allowed' },
      })
    }

    return appointment
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
