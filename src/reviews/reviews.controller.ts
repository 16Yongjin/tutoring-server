import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { Role } from '../shared/enums'
import { UserAuth } from '../shared/interfaces'
import { ValidationPipe } from '../shared/pipes'
import { PK } from '../shared/types'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles, UserInfo } from '../shared/decoratos'
import { RolesGuard } from '../shared/guards'
import { CreateReviewDto } from './dto'
import { ReviewsService } from './reviews.service'

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findReview() {
    return this.reviewsService.findAll()
  }

  @Get('me')
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findUserReivew(@UserInfo('id') userId: PK) {
    return this.reviewsService.findUserReviews(userId)
  }

  @Get('tutors/:id')
  findTutorReivew(@Param('id') tutorId: number) {
    return this.reviewsService.findTutorReivew(tutorId)
  }

  @Post()
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  makeReview(
    @UserInfo() user: UserAuth,
    @Body(new ValidationPipe()) dto: CreateReviewDto
  ) {
    const isUserSelf = dto.userId === user.id
    if (!isUserSelf) {
      throw new UnauthorizedException({
        message: "You're not allowed make other's reivew",
        errros: { userId: 'not allowed' },
      })
    }

    return this.reviewsService.create(dto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeAppointment(@Param('id') id: number) {
    return this.reviewsService.removeById(id)
  }
}
