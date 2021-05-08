import { Test, TestingModule } from '@nestjs/testing'
import { User } from './user.entity'
import { mockUserData } from './mocks/users.mock'
import { UsersService } from './users.service'
import { mockUserRepository } from './mocks/users.repository.mock'

describe('UsersService', () => {
  let service: UsersService
  let userData: User[]

  beforeEach(async () => {
    userData = mockUserData()
    const module: TestingModule = await Test.createTestingModule({
      providers: [mockUserRepository(userData), UsersService],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  it('should find all users', async () => {
    expect(await service.findAll()).toEqual(userData)
  })

  it('should find a user by username', async () => {
    const user = await service.findOneByUsername(userData[0].username)
    expect(user).toEqual(userData[0])
  })
})
