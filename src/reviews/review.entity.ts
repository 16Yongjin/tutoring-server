import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm'
import { User } from '../users/user.entity'
import { Tutor } from '../tutors/tutor.entity'
import { clamp } from 'lodash'

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Tutor, (tutor) => tutor.reviews)
  tutor: Tutor

  @ManyToOne(() => User, (user) => user.reviews)
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
