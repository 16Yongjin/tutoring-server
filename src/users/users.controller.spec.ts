import { Test, TestingModule } from '@nestjs/testing'
import { User } from './user.entity'
import { UsersController } from './users.controller'
import { mockUserData } from './mocks/users.mock'
import { UsersService } from './users.service'
import { mockUserRepository } from './mocks/users.repository.mock'

describe('UsersController', () => {
  let controller: UsersController
  let userData: User[]

  beforeEach(async () => {
    userData = mockUserData()

    const module: TestingModule = await Test.createTestingModule({
      providers: [mockUserRepository(userData), UsersService],
      controllers: [UsersController],
    }).compile()

    controller = module.get<UsersController>(UsersController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should return all users', async () => {
    const users = await controller.findAll()
    expect(users).toEqual(userData)
  })

  it('should return a user', () => {
    expect(controller.findOne(1)).toBe(`user with 1`)
  })
})
