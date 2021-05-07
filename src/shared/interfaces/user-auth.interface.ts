import { Role } from '../enums'

export interface UserAuth {
  id: number
  username: string
  email: string
  role: Role
  exp: number
}
