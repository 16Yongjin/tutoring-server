import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  BeforeInsert,
  BaseEntity,
  RelationId,
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

  @RelationId((review: Review) => review.tutor)
  tutorId: number

  @ManyToOne(() => User, (user) => user.reviews, {
    onDelete: 'CASCADE',
  })
  user: User

  @RelationId((review: Review) => review.user)
  userId: number

  @CreateDateColumn()
  createdAt: Date

  @Column()
  rating!: number

  @Column()
  text!: string

  @Column({ default: false })
  featured: boolean

  @BeforeInsert()
  clampRating() {
    this.rating = clamp(this.rating, 0, 5)
  }
}
