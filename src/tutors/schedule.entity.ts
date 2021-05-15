import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  BaseEntity,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { Tutor } from './tutor.entity'
import { Appointment } from '../appointments/appointment.entity'

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
}
