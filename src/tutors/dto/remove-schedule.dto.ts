import { Type } from 'class-transformer'
import { IsDate } from 'class-validator'

export class RemoveScheduleDto {
  @Type(() => Date)
  @IsDate()
  readonly schedule: Date
}
