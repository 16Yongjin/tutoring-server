import { Type } from 'class-transformer'
import { IsArray, ValidateNested } from 'class-validator'

export class AddSchedulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Date)
  readonly schedules: Date[]
}
