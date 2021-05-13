import { IsNotEmpty, IsString } from 'class-validator'

export class CreateTopicDto {
  @IsNotEmpty()
  materialId: number

  @IsNotEmpty()
  @IsString()
  title: string

  @IsString()
  description: string
}
