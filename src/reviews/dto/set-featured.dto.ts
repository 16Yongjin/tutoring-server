import { IsBoolean, IsNotEmpty } from 'class-validator'

export class SetFeaturedDto {
  @IsNotEmpty()
  @IsBoolean()
  featured: boolean
}
