import {
  EntityManager,
  getManager,
  Repository,
  TransactionManager,
} from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Injectable, NotFoundException } from '@nestjs/common'
import { User } from './user.entity'
import { ChangePasswordDto, CreateUserDto, UpdateUserDto } from './dto'
import { PK } from '../shared/types'

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

  async findOneById(id: PK, relations: string[] = []): Promise<User> {
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

  async findOneByIdT(
    @TransactionManager() manager: EntityManager,
    id: PK,
    relations: string[] = []
  ): Promise<User> {
    const user = await manager.findOne(User, {
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

  async findOneByUsernameT(
    @TransactionManager() manager: EntityManager,
    username: string
  ): Promise<User> {
    const user = await manager.findOne(User, {
      where: { username },
    })
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errors: { username: 'not existing' },
      })
    }
    return user
  }

  checkExistingUser(
    username: string,
    email: string
  ): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: [{ username }, { email }],
    })
  }

  async changePassword({ username, password }: ChangePasswordDto) {
    return getManager().transaction(async (manager) => {
      const user = await this.findOneByUsernameT(manager, username)
      user.password = password
      await user.hashPassword()
      return manager.save(user)
    })
  }

  async updateUser({ username, ...dto }: UpdateUserDto) {
    return getManager().transaction(async (manager) => {
      const user = await this.findOneByUsernameT(manager, username)
      return manager.save(User, { ...user, ...dto })
    })
  }
}
