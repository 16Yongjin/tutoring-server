import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator'

export class UpdateMaterialDto {
  @IsNotEmpty()
  id: number

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
