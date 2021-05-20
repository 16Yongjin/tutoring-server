import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToOne,
  BaseEntity,
  JoinColumn,
} from 'typeorm'
import { User } from '../users/user.entity'
import { Tutor } from '../tutors/tutor.entity'
import { Feedback } from './feedback.entity'
import { Schedule } from '../tutors/schedule.entity'

@Entity()
export class Appointment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Tutor, (tutor) => tutor.appointments, {
    onDelete: 'CASCADE',
  })
  tutor: Tutor

  @ManyToOne(() => User, (user) => user.appointments, {
    onDelete: 'CASCADE',
  })
  user: User

  @Column('timestamptz')
  startTime: Date

  @Column('timestamptz')
  endTime: Date

  @Column()
  material: string

  @Column({ default: '' })
  request: string

  @Column({ type: 'integer', nullable: true })
  feedbackId: number

  @OneToOne(() => Feedback, (feedback) => feedback.appointment)
  @JoinColumn()
  feedback?: Feedback

  @OneToOne(() => Schedule, (schedule) => schedule.appointment)
  schedule: Schedule
}
