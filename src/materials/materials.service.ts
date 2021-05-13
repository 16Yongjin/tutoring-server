import {
  EntityManager,
  getManager,
  Repository,
  TransactionManager,
} from 'typeorm'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Material, Course, Exercise, Topic } from './entities'
import { PK } from '../shared/types'
import {
  CreateCourseDto,
  CreateExerciseDto,
  CreateMaterialDto,
  CreateTopicDto,
} from './dto'

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Exercise)
    private exerciseRepository: Repository<Exercise>
  ) {}

  async findMaterial(
    id: PK,
    relations = ['topics', 'topics.courses']
  ): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id },
      relations,
    })

    if (!material) {
      throw new NotFoundException({
        message: 'Material not found',
        errors: { materialId: 'not exists' },
      })
    }
    return material
  }

  async findMaterialT(
    @TransactionManager() manager: EntityManager,
    id: PK,
    relations = []
  ): Promise<Material> {
    const material = await manager.findOne(Material, {
      where: { id },
      relations,
    })

    if (!material) {
      throw new NotFoundException({
        message: 'Material not found',
        errors: { materialId: 'not exists' },
      })
    }
    return material
  }

  async findTopic(id: PK, relations: string[] = []): Promise<Topic> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations,
    })
    if (!topic) {
      throw new NotFoundException({
        message: 'Topic not found',
        errors: { topicId: 'not exists' },
      })
    }
    return topic
  }

  async findTopicT(
    @TransactionManager() manager: EntityManager,
    id: PK,
    relations: string[] = []
  ): Promise<Topic> {
    const topic = await manager.findOne(Topic, {
      where: { id },
      relations,
    })
    if (!topic) {
      throw new NotFoundException({
        message: 'Topic not found',
        errors: { topicId: 'not exists' },
      })
    }
    return topic
  }

  async findCourse(
    id: PK,
    relations = ['topic', 'exercises']
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations,
    })

    if (!course) {
      throw new NotFoundException({
        message: 'Course not found',
        errors: { courseId: 'not exists' },
      })
    }

    return course
  }
  async findCourseT(
    @TransactionManager() manager: EntityManager,
    id: PK,
    relations = []
  ): Promise<Course> {
    const course = await manager.findOne(Course, {
      where: { id },
      relations,
    })

    if (!course) {
      throw new NotFoundException({
        message: 'Course not found',
        errors: { courseId: 'not exists' },
      })
    }

    return course
  }

  async findExercise(id: PK, relations: string[] = []): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id },
      relations,
    })
    if (!exercise) {
      throw new NotFoundException({
        message: 'Topic not found',
        errors: { exerciseId: 'not exists' },
      })
    }
    return exercise
  }
  async findExerciseT(
    @TransactionManager() manager: EntityManager,
    id: PK,
    relations: string[] = []
  ): Promise<Exercise> {
    const exercise = await manager.findOne(Exercise, {
      where: { id },
      relations,
    })
    if (!exercise) {
      throw new NotFoundException({
        message: 'Topic not found',
        errors: { exerciseId: 'not exists' },
      })
    }
    return exercise
  }

  findMaterials(): Promise<Material[]> {
    return this.materialRepository.find()
  }

  findTopics(materialId: PK, relations = ['courses']): Promise<Topic[]> {
    return this.topicRepository.find({
      where: { material: { id: materialId } },
      relations,
    })
  }

  createMaterial(dto: CreateMaterialDto) {
    return getManager().transaction(async (manager) => {
      const material = Material.create(dto)
      return manager.save(material)
    })
  }

  async createTopic({ materialId, ...dto }: CreateTopicDto): Promise<Topic> {
    return getManager().transaction(async (manager) => {
      const material = await this.findMaterialT(manager, materialId)
      const topic = Topic.create({
        material,
        ...dto,
      })
      return manager.save(topic)
    })
  }

  async createCourse({ topicId, ...dto }: CreateCourseDto): Promise<Course> {
    return getManager().transaction(async (manager) => {
      const topic = await this.findTopicT(manager, topicId)
      const course = Course.create({
        topic,
        ...dto,
      })
      return manager.save(course)
    })
  }

  async createExercise({
    courseId,
    ...dto
  }: CreateExerciseDto): Promise<Exercise> {
    return getManager().transaction(async (manager) => {
      const exercise = Exercise.create({
        courseId,
        ...dto,
      })
      return manager.save(exercise)
    })
  }

  async removeMaterial(id: PK) {
    return getManager().transaction(async (manager) => {
      const material = await this.findMaterialT(manager, id)
      return manager.remove(material)
    })
  }
  async removeTopic(id: PK) {
    return getManager().transaction(async (manager) => {
      const topic = await this.findTopicT(manager, id)
      return manager.remove(topic)
    })
  }
  async removeCourse(id: PK) {
    return getManager().transaction(async (manager) => {
      const course = await this.findCourseT(manager, id)
      return manager.remove(course)
    })
  }
  async removeExercise(id: PK) {
    return getManager().transaction(async (manager) => {
      const exercise = await this.findExerciseT(manager, id)
      return manager.remove(exercise)
    })
  }
}
