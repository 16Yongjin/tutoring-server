import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator'

export class CreateMaterialDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsString()
  description: string

  @IsNumber()
  @Min(1)
  @Max(10)
  levelStart: number

  @IsNumber()
  @Min(1)
  @Max(10)
  levelEnd: number

  @IsString()
  image: string
}
