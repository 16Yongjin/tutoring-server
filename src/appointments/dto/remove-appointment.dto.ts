import { IsNotEmpty } from 'class-validator'
import { PK } from '../../shared/types'
import { Role } from '../../shared/enums'

export class RemoveAppointmentDto {
  @IsNotEmpty()
  appointmentId: PK

  role: Role
}
