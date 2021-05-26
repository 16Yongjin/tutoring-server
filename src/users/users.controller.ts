import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { RolesGuard } from '../shared/guards/roles.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/decoratos/roles.decorator'
import { User } from './user.entity'
import { UsersService } from './users.service'
import { Role } from '../shared/enums'
import { ValidationPipe } from '../shared/pipes'
import { UpdateUserDto } from './dto'
import { UserGuard } from '../shared/guards'

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
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(JwtAuthGuard, RolesGuard, UserGuard)
  findOne(@Param('id') id: number): Promise<User> {
    return this.userService.findOneById(id)
  }

  @Post(':id')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard, UserGuard)
  updateTutor(@Body() dto: UpdateUserDto) {
    return this.userService.updateUser(dto)
  }
}
