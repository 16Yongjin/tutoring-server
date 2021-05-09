import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  BaseEntity,
} from 'typeorm'
import { Appointment } from './appointment.entity'

@Entity()
export class Feedback extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @OneToOne(() => Appointment, (appointment) => appointment.feedback)
  appointment: Appointment

  @Column()
  text: string
}
