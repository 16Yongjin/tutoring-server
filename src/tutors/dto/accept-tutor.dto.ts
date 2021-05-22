import { IsNotEmpty, IsNumber } from 'class-validator'

export class AcceptTutorDto {
  @IsNotEmpty()
  @IsNumber()
  readonly tutorId: string
}
