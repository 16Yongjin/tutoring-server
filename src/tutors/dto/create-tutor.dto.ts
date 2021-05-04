import { IsEmail, IsEmpty, IsNotEmpty, Length } from 'class-validator'
import { Country, Gender } from './../../shared/enums'

export class CreateTutorDto {
  @IsNotEmpty()
  @Length(4)
  readonly username: string

  @IsNotEmpty()
  @IsEmail()
  readonly email: string

  @IsNotEmpty()
  @Length(6)
  readonly password: string

  @IsNotEmpty()
  readonly fullname: string

  readonly gender?: Gender

  readonly image?: string

  readonly language?: string

  readonly presentation?: string

  readonly country?: Country

  @IsEmpty()
  readonly role?: string
}
