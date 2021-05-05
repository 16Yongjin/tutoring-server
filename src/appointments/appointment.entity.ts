import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToOne,
} from 'typeorm'
import { User } from '../users/user.entity'
import { Tutor } from '../tutors/tutor.entity'
import { Feedback } from '../feedbacks/feedback.entity'

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Tutor, (tutor) => tutor.appointments)
  tutor: Tutor

  @ManyToOne(() => User, (user) => user.appointments)
  user: User

  @Column('timestamptz')
  startTime: Date

  @Column('timestamptz')
  endTime: Date

  @OneToOne(() => Feedback, (feedback) => feedback.appointment)
  feedback?: Feedback
}
