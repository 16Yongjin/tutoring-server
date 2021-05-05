import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  BaseEntity,
} from 'typeorm'
import { Tutor } from './tutor.entity'

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
}
