import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Course } from './course.entity'

@Entity()
export class Exercise extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  index: number

  @Column()
  title: string

  @Column({ default: '' })
  description: string

  @Column()
  text: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: 'int' })
  courseId: number

  @ManyToOne(() => Course, (course) => course.exercises, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'courseId' })
  course: Course
}
