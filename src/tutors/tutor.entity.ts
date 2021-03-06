import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  BeforeInsert,
  OneToMany,
} from 'typeorm'
import * as argon2 from 'argon2'
import { Country, Gender, Role } from '../shared/enums'
import { Schedule } from './schedule.entity'
import { Appointment } from '../appointments/appointment.entity'
import { Review } from '../reviews/review.entity'

@Entity()
export class Tutor extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.TUTOR,
  })
  role!: Role

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ unique: true })
  username!: string

  @Column()
  fullname!: string

  @Column({ unique: true })
  email!: string

  @Column({ select: false })
  password!: string

  @BeforeInsert()
  async hashPassword() {
    this.password = await argon2.hash(this.password)
  }

  @Column({ type: 'boolean', default: false })
  verified: boolean

  @Column({ type: 'boolean', default: false })
  accepted: boolean

  @Column({ default: 'en' })
  language: string

  @Column({ default: '' })
  image: string

  @Column({
    type: 'enum',
    enum: Gender,
    default: Gender.OTHER,
  })
  gender: Gender

  @Column({ default: '' })
  presentation: string

  @Column({
    type: 'enum',
    enum: Country,
    default: Country.Korea,
  })
  country: Country

  @Column({ default: '' })
  youtube: string

  @OneToMany(() => Schedule, (schedule) => schedule.tutor, {
    cascade: true,
  })
  schedules: Schedule[]

  @OneToMany(() => Appointment, (appontment) => appontment.tutor, {
    cascade: true,
  })
  appointments: Appointment[]

  @OneToMany(() => Review, (reivew) => reivew.tutor)
  reviews: Review[]

  @Column({ default: 5 })
  rating: number

  @Column({ default: 0 })
  reviewCount: number

  toJSON() {
    delete this.password
    return this
  }
}
