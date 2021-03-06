import { Type } from 'class-transformer'
import { IsDate, IsNotEmpty, IsNumber, MaxLength } from 'class-validator'

export class CreateAppointmentDto {
  @IsNotEmpty()
  userId: number

  @IsNotEmpty()
  tutorId: number

  @IsDate()
  @Type(() => Date)
  startTime: Date

  @IsNotEmpty()
  material: string

  @MaxLength(200)
  request: string

  @IsNumber()
  courseId: number
}
