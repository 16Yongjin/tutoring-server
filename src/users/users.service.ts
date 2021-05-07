import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateUserDto, LoginUserDto } from './dto'
import { User } from './user.entity'
import * as argon2 from 'argon2'
import { omit } from 'lodash'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>
  ) {}

  create(dto: CreateUserDto) {
    const newUser = new User()
    newUser.username = dto.username
    newUser.email = dto.email
    newUser.fullname = dto.fullname
    newUser.password = dto.password
    newUser.language = dto.language

    return this.userRepository.save(newUser)
  }

  async verifyUser({ username, password }: LoginUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ username })
    console.log('user', user)
    if (!user) return null

    if (await argon2.verify(user.password, password)) return user

    return null
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find()
    return users.map((user) => omit(user, 'password')) as User[]
  }

  async findOneById(id: number | string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    })

    if (!user) {
      const error = {
        message: 'User not found',
        errors: { id: 'not existing' },
      }
      throw new NotFoundException(error)
    }

    return omit(user, 'password') as User
  }

  findOneByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({ username })
  }

  checkExistingUser(
    username: string,
    email: string
  ): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: [{ username }, { email }],
    })
  }
}
