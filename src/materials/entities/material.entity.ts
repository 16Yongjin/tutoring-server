import { clamp } from 'lodash'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
  BeforeInsert,
  JoinColumn,
} from 'typeorm'
import { Topic } from './topic.entity'

@Entity()
export class Material extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  title: string

  @Column({ default: '' })
  description: string

  @Column()
  levelStart: number

  @Column()
  levelEnd: number

  @Column({ default: '' })
  image: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Topic, (topic) => topic.material)
  @JoinColumn()
  topics: Topic[]

  @BeforeInsert()
  clampLevel() {
    this.levelStart = clamp(this.levelStart, 1, 10)
    this.levelEnd = clamp(this.levelEnd, 1, 10)
  }
}
