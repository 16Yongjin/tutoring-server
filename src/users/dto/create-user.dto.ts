import { IsEmail, IsEmpty, IsNotEmpty, Length } from 'class-validator'
import { Gender } from '../../shared/enums'

export class CreateUserDto {
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

  readonly language?: string

  readonly gender?: Gender

  @IsEmpty()
  readonly role?: string
}
