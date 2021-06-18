import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { CreateReviewDto, SetFeaturedDto } from './dto'
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

  @Get('featured')
  findFeaturedReview() {
    return this.reviewsService.findAllFeatured()
  }

  @Get('featured/admin')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findFeaturedReviewByAdmin() {
    return this.reviewsService.findAllFeaturedByAdmin()
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
  async removeReview(@Param('id') id: number) {
    return this.reviewsService.removeById(id)
  }

  @Put(':id/featured')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  toggleReviewFeatured(
    @Param('id') id: number,
    @Body(new ValidationPipe()) dto: SetFeaturedDto
  ) {
    return this.reviewsService.setFeatured(id, dto.featured)
  }
}
