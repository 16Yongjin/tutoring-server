import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateTopicDto {
  @IsNotEmpty()
  id: number

  @IsNotEmpty()
  @IsString()
  title: string

  @IsString()
  description: string
}
