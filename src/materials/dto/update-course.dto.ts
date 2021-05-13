import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator'

export class UpdateCourseDto {
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
  level: number

  @IsString()
  image: string
}
