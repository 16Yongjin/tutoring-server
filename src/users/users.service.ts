import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindOneOptions, Repository } from 'typeorm'
import { CreateUserDto } from './dto'
import { User } from './user.entity'

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

  findAll(): Promise<User[]> {
    return this.userRepository.find()
  }

  async findOneById(
    id: number | string,
    relations: string[] = []
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations,
    })

    if (!user) {
      const error = {
        message: 'User not found',
        errors: { id: 'not existing' },
      }
      throw new NotFoundException(error)
    }

    return user
  }

  /**
   * 비밀번호를 포함하는 유저 쿼리
   */
  findOneByUsername(username: string): Promise<User | undefined> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username })
      .addSelect('user.password')
      .getOne()
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
