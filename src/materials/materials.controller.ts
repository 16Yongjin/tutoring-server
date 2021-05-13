import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../shared/decoratos'
import { Role } from '../shared/enums'
import { RolesGuard } from '../shared/guards'
import { ValidationPipe } from '../shared/pipes'
import { PK } from '../shared/types'
import {
  CreateCourseDto,
  CreateExerciseDto,
  CreateMaterialDto,
  CreateTopicDto,
} from './dto'
import { MaterialsService } from './materials.service'

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialService: MaterialsService) {}

  @Get()
  findMaterials() {
    return this.materialService.findMaterials()
  }

  @Get(':id')
  findMaterial(@Param('id') id: PK) {
    return this.materialService.findMaterial(id)
  }

  @Get('courses/:id')
  findCourse(@Param('id') id: PK) {
    return this.materialService.findCourse(id)
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createMaterial(@Body(new ValidationPipe()) dto: CreateMaterialDto) {
    return this.materialService.createMaterial(dto)
  }

  @Post('topics')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createTopic(@Body(new ValidationPipe()) dto: CreateTopicDto) {
    return this.materialService.createTopic(dto)
  }

  @Post('courses')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createCourse(@Body(new ValidationPipe()) dto: CreateCourseDto) {
    return this.materialService.createCourse(dto)
  }

  @Post('exercises')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createExercise(@Body(new ValidationPipe()) dto: CreateExerciseDto) {
    return this.materialService.createExercise(dto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  removeMaterial(@Param('id') id: number) {
    return this.materialService.removeMaterial(id)
  }
  @Delete('topics/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  removeTopic(@Param('id') id: number) {
    return this.materialService.removeTopic(id)
  }
  @Delete('courses/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  removeCourse(@Param('id') id: number) {
    return this.materialService.removeCourse(id)
  }
  @Delete('exercises/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  removeExercise(@Param('id') id: number) {
    return this.materialService.removeExercise(id)
  }
}
