import * as argon2 from 'argon2'
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { ChangePasswordDto, CreateUserDto, LoginUserDto } from '../users/dto'
import { User } from '../users/user.entity'
import { TutorsService } from '../tutors/tutors.service'
import { CreateTutorDto } from '../tutors/dto/create-tutor.dto'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tutorsService: TutorsService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUsername(username)
    if (!user) return null

    if (await argon2.verify(user.password, pass)) {
      return this.buildUserRO(user)
    }

    return null
  }

  async validateTutor(username: string, pass: string): Promise<any> {
    const tutor = await this.tutorsService.findOneByUsername(username)
    if (!tutor) return null

    if (await argon2.verify(tutor.password, pass)) {
      return this.buildUserRO(tutor)
    }

    return null
  }

  async loginTutor({ username, password }: LoginUserDto) {
    const tutor = await this.validateTutor(username, password)
    if (!tutor) throw new UnauthorizedException()
    return tutor
  }

  async signup(dto: CreateUserDto) {
    const user = await this.usersService.checkExistingUser(
      dto.username,
      dto.email
    )

    if (user) {
      const message = 'Bad signup request'
      const errors = {
        username:
          user.username === dto.username
            ? 'Username is already in use.'
            : undefined,
        email: user.email === dto.email ? 'Email is already in use' : undefined,
      }
      throw new BadRequestException({ message, errors })
    }

    const savedUser = await this.usersService.create(dto)
    return this.buildUserRO(savedUser)
  }

  async signupTutor(dto: CreateTutorDto) {
    const tutor = await this.tutorsService.checkExistingTutor(
      dto.username,
      dto.email
    )

    if (tutor) {
      const message = 'Bad signup request'
      const errors = {
        username:
          tutor.username === dto.username
            ? 'Username is already in use.'
            : undefined,
        email:
          tutor.email === dto.email ? 'Email is already in use' : undefined,
      }
      throw new BadRequestException({ message, errors })
    }

    const savedTutor = await this.tutorsService.create(dto)
    return this.buildUserRO(savedTutor)
  }

  async changePassword(dto: ChangePasswordDto) {
    const user = await this.usersService.changePassword(dto)
    return this.buildUserRO(user)
  }

  async changeTutorPassword(dto: ChangePasswordDto) {
    const tutor = await this.tutorsService.changePassword(dto)
    return this.buildUserRO(tutor)
  }

  public generateJWT(user: User) {
    const today = new Date()
    const exp = new Date(today)
    exp.setDate(today.getDate() + 60)

    return this.jwtService.sign({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      exp: exp.getTime() / 1000,
    })
  }

  private buildUserRO(user: User) {
    const userRO = {
      id: user.id,
      username: user.username,
      email: user.email,
      token: this.generateJWT(user),
      image: user.image,
      language: user.language,
      role: user.role,
    }

    return userRO
  }
}
