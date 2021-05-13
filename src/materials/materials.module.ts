import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Material, Topic, Course, Exercise } from './entities'
import { MaterialsService } from './materials.service'
import { MaterialsController } from './materials.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Material, Topic, Course, Exercise])],
  providers: [MaterialsService],
  controllers: [MaterialsController],
})
export class MaterialsModule {}
