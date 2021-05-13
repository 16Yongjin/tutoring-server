import { IsEmpty, IsNotEmpty, Length } from 'class-validator'
import { Country, Gender, Role } from '../../shared/enums'

export class UpdateTutorDto {
  @IsNotEmpty()
  @Length(4)
  readonly username: string

  @IsNotEmpty()
  readonly fullname: string

  readonly gender?: Gender

  readonly image?: string

  readonly language?: string

  readonly presentation?: string

  readonly country?: Country

  @IsEmpty()
  readonly role?: Role
}
