import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CreateExerciseDto {
  @IsNotEmpty()
  courseId: number

  @IsNumber()
  index: number

  @IsNotEmpty()
  @IsString()
  title: string

  @IsString()
  description: string

  @IsNotEmpty()
  @IsString()
  text: string
}
