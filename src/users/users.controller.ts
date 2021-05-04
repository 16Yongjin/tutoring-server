import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { RolesGuard } from '../shared/guards/roles.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/decoratos/roles.decorator'
import { User } from './user.entity'
import { UsersService } from './users.service'
import { Role } from '../shared/enums'

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAll(): Promise<User[]> {
    return this.userService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: number): string {
    return `user with ${id}`
  }
}
