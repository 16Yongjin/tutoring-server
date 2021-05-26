import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator'

export class CreateReviewDto {
  @IsNotEmpty()
  userId: number

  @IsNotEmpty()
  tutorId: number

  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number

  text: string
}
