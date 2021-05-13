import { clamp } from 'lodash'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  OneToMany,
  BeforeInsert,
  JoinColumn,
} from 'typeorm'
import { Exercise } from './exercise.entity'
import { Topic } from './topic.entity'

@Entity()
export class Course extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  title: string

  @Column({ default: '' })
  description: string

  @Column()
  level: number

  @Column({ default: '' })
  image: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: 'integer' })
  topicId: number

  @ManyToOne(() => Topic, (topic) => topic.courses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'topicId' })
  topic: Topic

  @OneToMany(() => Exercise, (exercise) => exercise.course)
  @JoinColumn()
  exercises: Exercise[]

  @BeforeInsert()
  clampLevel() {
    this.level = clamp(this.level, 1, 10)
  }
}
