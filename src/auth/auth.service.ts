import * as argon2 from 'argon2'
import { BadRequestException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { CreateUserDto } from '../users/dto'
import { User } from '../users/user.entity'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
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
    }

    return userRO
  }
}
