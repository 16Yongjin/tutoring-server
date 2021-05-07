import { Type } from 'class-transformer'
import { IsDate, IsNotEmpty } from 'class-validator'
import { type } from 'node:os'

export class CreateAppointmentDto {
  @IsNotEmpty()
  userId: number

  @IsNotEmpty()
  tutorId: number

  @IsDate()
  @Type(() => Date)
  startTime: Date
}
