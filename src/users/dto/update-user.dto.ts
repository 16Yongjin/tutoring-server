import { IsEmpty, IsEnum, IsNotEmpty } from 'class-validator'
import { Gender, Role } from '../../shared/enums'

export class UpdateUserDto {
  @IsNotEmpty()
  readonly username: string

  @IsNotEmpty()
  readonly fullname: string

  @IsNotEmpty()
  readonly language: string

  @IsNotEmpty()
  @IsEnum(Gender)
  readonly gender: Gender

  @IsEmpty()
  readonly role?: Role
}
