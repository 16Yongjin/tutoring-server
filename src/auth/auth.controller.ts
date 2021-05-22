import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { Request as Req } from 'express'
import { ChangePasswordDto, CreateUserDto, LoginUserDto } from '../users/dto'
import { ValidationPipe } from '../shared/pipes'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { Roles, UserInfo } from '../shared/decoratos'
import { UserAuth } from '../shared/interfaces'
import { Role } from '../shared/enums'
import { RolesGuard } from '../shared/guards'
import { AcceptTutorDto, CreateTutorDto } from '../tutors/dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: Req) {
    return req.user
  }

  @Post('signup')
  async signup(@Body(new ValidationPipe()) createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: Req) {
    return req.user
  }

  @UsePipes(new ValidationPipe())
  @Post('tutors/login')
  async tutorLogin(@Body() dto: LoginUserDto) {
    return this.authService.loginTutor(dto)
  }

  @UsePipes(new ValidationPipe())
  @Post('tutors/signup')
  async tutorSignup(@Body() dto: CreateTutorDto) {
    return this.authService.signupTutor(dto)
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe())
  @Post('change-password')
  async changePassword(
    @UserInfo() user: UserAuth,
    @Body() dto: ChangePasswordDto
  ) {
    const isAdmin = user.role === Role.ADMIN
    const isUserSelf = user.username === dto.username

    if (!isUserSelf && !isAdmin) {
      throw new UnauthorizedException({
        message: "You are not allowed to other's change password",
        errors: { username: 'not allowed' },
      })
    }

    return this.authService.changePassword(dto)
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe())
  @Post('tutors/change-password')
  async changeTutorPassword(
    @UserInfo() user: UserAuth,
    @Body() dto: ChangePasswordDto
  ) {
    const isAdmin = user.role === Role.ADMIN
    const isTutorSelf = user.username === dto.username

    if (!isTutorSelf && !isAdmin) {
      throw new UnauthorizedException({
        message: "You are not allowed to other's change password",
        errors: { username: 'not allowed' },
      })
    }

    return this.authService.changeTutorPassword(dto)
  }

  @Get('verify/:token')
  async verifyUser(@Param('token') token: string) {
    const user = await this.authService.verifyUser(token)
    return `Account(${user.email}) verified!! Please close this page and Login.`
  }

  @Get('tutors/verify/:token')
  async verifyTutor(@Param('token') token: string) {
    const tutor = await this.authService.verifyTutor(token)
    return `Account(${tutor.email}) verified!! Please close this page and login.`
  }

  @Post('tutors/accept')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  acceptTutor(@Body(new ValidationPipe()) dto: AcceptTutorDto) {
    return this.authService.acceptTutor(dto)
  }
}
