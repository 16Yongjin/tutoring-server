import { Type } from 'class-transformer'
import { IsDate } from 'class-validator'

export class AddScheduleDto {
  @Type(() => Date)
  @IsDate()
  readonly schedule: Date
}
