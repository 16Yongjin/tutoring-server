import { IsNotEmpty } from 'class-validator'

export class SetFeaturedDto {
  @IsNotEmpty()
  featured: boolean
}
