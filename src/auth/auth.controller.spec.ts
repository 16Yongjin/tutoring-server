import { Test, TestingModule } from '@nestjs/testing'
import * as httpMocks from 'node-mocks-http'
import { AuthController } from './auth.controller'

import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { mockUserData } from '../users/mocks/users.mock'
import * as argon2 from 'argon2'
import { mockUserRepository } from '../users/mocks/users.repository.mock'
import { AuthService } from './auth.service'
import { LocalStrategy } from './local.strategy'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { mockedJwtService } from '../utils/mocks/jwt.service'

jest.mock('argon2')

describe('AuthController', () => {
  let controller: AuthController
  let userData: User[]
  let argon2Hash: jest.Mock

  beforeEach(async () => {
    userData = mockUserData()
    argon2Hash = jest.fn().mockImplementation((t) => Promise.resolve(t))
    ;(argon2.hash as jest.Mock) = argon2Hash

    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule, ConfigModule.forRoot()],
      providers: [
        mockUserRepository(userData),
        {
          provide: JwtService,
          useValue: mockedJwtService,
        },
        UsersService,
        AuthService,
        LocalStrategy,
      ],
      controllers: [AuthController],
    }).compile()

    controller = module.get<AuthController>(AuthController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('/auth/login', () => {
    it('should return logged in user', async () => {
      const request = httpMocks.createRequest({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          username: userData[0].username,
          password: userData[0].password,
        },
      })
      const response = await controller.login(request)
    })
  })

  describe('/auth/signup', () => {
    it('should return signup user', async () => {
      const createUserData = {
        username: 'new-user',
        fullname: 'jonny',
        password: '123456',
        email: 'jonny@test.com',
      }
      const response = await controller.signup(createUserData)

      expect(response).toEqual(
        expect.objectContaining({
          username: createUserData.username,
          email: createUserData.email,
          token: expect.any(String),
        })
      )
    })
  })
})
