import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  BaseEntity,
  OneToOne,
  JoinColumn,
  AfterLoad,
} from 'typeorm'
import dayjs from 'dayjs'
import { Tutor } from './tutor.entity'
import { Appointment } from '../appointments/appointment.entity'
import { USER_APPOINTMENT_MAKE_TIME_LIMIT } from '../config/logic'

@Entity()
export class Schedule extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Tutor, (tutor) => tutor.schedules, {
    onDelete: 'CASCADE',
  })
  tutor: Tutor

  @Column('timestamptz')
  startTime: Date

  @Column('timestamptz')
  endTime: Date

  @Column({ type: 'integer', nullable: true })
  appointmentId?: number

  @OneToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment?: Appointment

  closed: boolean

  reserved: boolean

  @AfterLoad()
  updateStatus() {
    this.reserved = !!this.appointmentId
    this.closed =
      dayjs(this.startTime).diff(dayjs()) < USER_APPOINTMENT_MAKE_TIME_LIMIT
  }
}
