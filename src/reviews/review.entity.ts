import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  BeforeInsert,
  BaseEntity,
} from 'typeorm'
import { User } from '../users/user.entity'
import { Tutor } from '../tutors/tutor.entity'
import { clamp } from 'lodash'

@Entity()
export class Review extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Tutor, (tutor) => tutor.reviews, {
    onDelete: 'CASCADE',
  })
  tutor: Tutor

  @ManyToOne(() => User, (user) => user.reviews, {
    onDelete: 'CASCADE',
  })
  user: User

  @CreateDateColumn()
  createdAt: Date

  @Column()
  rating!: number

  @Column()
  text!: string

  @BeforeInsert()
  clampRating() {
    this.rating = clamp(this.rating, 0, 5)
  }
}
