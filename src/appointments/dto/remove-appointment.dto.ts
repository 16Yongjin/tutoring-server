import { IsNotEmpty } from 'class-validator'

export class RemoveAppointmentDto {
  @IsNotEmpty()
  appointmentId: number | string
}
