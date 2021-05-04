import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm'
import { Tutor } from './tutor.entity'

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Tutor, (tutor) => tutor.schedules)
  tutor: Tutor

  @Column('timestamp')
  startTime: Date

  @Column('timestamp')
  endTime: Date
}
