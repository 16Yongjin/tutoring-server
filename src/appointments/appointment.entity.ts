import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToOne,
  BaseEntity,
  JoinColumn,
  AfterLoad,
  RelationId,
} from 'typeorm'
import dayjs from 'dayjs'
import { User } from '../users/user.entity'
import { Tutor } from '../tutors/tutor.entity'
import { Feedback } from './feedback.entity'
import { Schedule } from '../tutors/schedule.entity'
import { USER_APPOINTMENT_CANCEL_TIME_LIMIT } from '../config/logic'

@Entity()
export class Appointment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Tutor, (tutor) => tutor.appointments, {
    onDelete: 'CASCADE',
  })
  tutor: Tutor

  @RelationId((appointment: Appointment) => appointment.tutor)
  tutorId: number

  @ManyToOne(() => User, (user) => user.appointments, {
    onDelete: 'CASCADE',
  })
  user: User

  @RelationId((appointment: Appointment) => appointment.user)
  userId: number

  @Column('timestamptz')
  startTime: Date

  @Column('timestamptz')
  endTime: Date

  @Column()
  material: string

  @Column({ type: 'integer', nullable: true })
  courseId: number

  @Column({ default: '' })
  request: string

  @Column({ type: 'integer', nullable: true })
  feedbackId: number

  @OneToOne(() => Feedback, (feedback) => feedback.appointment)
  @JoinColumn()
  feedback?: Feedback

  @OneToOne(() => Schedule, (schedule) => schedule.appointment)
  schedule: Schedule

  cancelable: boolean

  finished: boolean

  @AfterLoad()
  updateStatus() {
    this.cancelable =
      dayjs(this.startTime).diff(dayjs()) > USER_APPOINTMENT_CANCEL_TIME_LIMIT
    this.finished = dayjs(this.endTime).isBefore(dayjs())
  }
}
