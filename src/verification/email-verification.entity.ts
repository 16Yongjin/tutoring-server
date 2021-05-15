import { Entity, BaseEntity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class EmailVerification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'integer' })
  userId: number

  @Column()
  token: string
}

@Entity()
export class TutorEmailVerification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'integer' })
  tutorId: number

  @Column()
  token: string
}
