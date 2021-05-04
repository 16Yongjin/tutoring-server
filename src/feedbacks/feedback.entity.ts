import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm'
import { Appointment } from '../appointments/appointment.entity'

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn()
  id!: number

  @OneToOne(() => Appointment, (appointment) => appointment.feedback)
  appointment: Appointment

  @Column()
  text: string
}
