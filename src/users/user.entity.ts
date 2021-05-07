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
import { Role } from '../shared/enums'
import { Appointment } from '../appointments/appointment.entity'
import { Review } from '../reviews/review.entity'

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
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

  @Column()
  password!: string

  @BeforeInsert()
  async hashPassword() {
    this.password = await argon2.hash(this.password)
  }

  @Column({ default: 'en' })
  language!: string

  @Column({ default: '' })
  image: string

  @OneToMany(() => Appointment, (appointment) => appointment.user, {
    cascade: true,
  })
  appointments: Appointment[]

  @OneToMany(() => Review, (review) => review.user, {
    cascade: true,
  })
  reviews: Review[]
}
