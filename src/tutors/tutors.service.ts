import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LoginUserDto } from '../users/dto'
import { Repository } from 'typeorm'
import { CreateTutorDto } from './dto/create-tutor.dto'
import { Tutor } from './tutor.entity'
import * as argon2 from 'argon2'
import { omit } from 'lodash'

@Injectable()
export class TutorsService {
  constructor(
    @InjectRepository(Tutor) private tutorRepository: Repository<Tutor>
  ) {}

  create(dto: CreateTutorDto) {
    const newTutor = new Tutor()
    newTutor.username = dto.username
    newTutor.email = dto.email
    newTutor.password = dto.password
    newTutor.fullname = dto.fullname
    newTutor.gender = dto.gender
    newTutor.language = dto.language
    newTutor.presentation = dto.presentation
    newTutor.image = dto.image
    newTutor.country = dto.country

    return this.tutorRepository.save(newTutor)
  }

  async verifyTutor({ username, password }: LoginUserDto): Promise<Tutor> {
    const tutor = await this.tutorRepository.findOne({ username })
    if (!tutor) return null

    if (await argon2.verify(tutor.password, password)) return tutor

    return null
  }

  async findAll(): Promise<Tutor[]> {
    const users = await this.tutorRepository.find()
    return users.map((user) => omit(user, 'password')) as Tutor[]
  }

  findOneByUsername(username: string): Promise<Tutor | undefined> {
    return this.tutorRepository.findOne({ username })
  }

  checkExistingTutor(
    username: string,
    email: string
  ): Promise<Tutor | undefined> {
    return this.tutorRepository.findOne({
      where: [{ username }, { email }],
    })
  }
}
