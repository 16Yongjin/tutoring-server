import { IsNotEmpty, Length } from 'class-validator'

export class FeedbackAppointmentDto {
  @IsNotEmpty()
  appointmentId: number

  @Length(10)
  text: string
}
