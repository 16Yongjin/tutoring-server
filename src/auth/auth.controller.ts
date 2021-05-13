import {
  Body,
  Controller,
  Get,
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
import { CreateTutorDto } from '../tutors/dto/create-tutor.dto'
import { UserInfo } from '../shared/decoratos'
import { UserAuth } from '../shared/interfaces'
import { Role } from '../shared/enums'

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
}
