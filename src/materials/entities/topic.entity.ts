import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Course } from './course.entity'
import { Material } from './material.entity'

@Entity()
export class Topic extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  title: string

  @Column({ default: '' })
  description: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: 'int' })
  materialId: number

  @ManyToOne(() => Material, (material) => material.topics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'materialId' })
  material: Material

  @OneToMany(() => Course, (course) => course.topic)
  @JoinColumn()
  courses: Course[]
}
