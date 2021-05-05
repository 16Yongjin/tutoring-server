import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { Request as Req } from 'express'
import { CreateUserDto, LoginUserDto } from '../users/dto'
import { ValidationPipe } from '../shared/pipes'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CreateTutorDto } from '../tutors/dto/create-tutor.dto'

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
}
