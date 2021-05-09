import { IsNotEmpty } from 'class-validator'
import { Role } from '../../shared/enums'

export class RemoveAppointmentDto {
  @IsNotEmpty()
  appointmentId: number | string

  role: Role
}
