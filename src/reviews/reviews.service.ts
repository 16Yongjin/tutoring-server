import {
  EntityManager,
  getManager,
  Repository,
  TransactionManager,
} from 'typeorm'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Review } from './review.entity'
import { TutorsService } from '../tutors/tutors.service'
import { UsersService } from '../users/users.service'
import { CreateReviewDto } from './dto'
import { AppointmentsService } from '../appointments/appointments.service'
import { PK } from '../shared/types'

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    private usersService: UsersService,
    private tutorsService: TutorsService,
    private appointmentsService: AppointmentsService
  ) {}

  async create({
    userId,
    tutorId,
    text,
    rating,
  }: CreateReviewDto): Promise<Review> {
    return getManager().transaction(async (manager) => {
      const [user, tutor] = await Promise.all([
        this.usersService.findOneByIdT(manager, userId),
        this.tutorsService.findOneByIdT(manager, tutorId, []),
        this.canUserReivewTutor(userId, tutorId),
      ])

      const review = Review.create({
        user,
        tutor,
        text,
        rating,
      })

      const savedReview = await manager.save(review)

      await this.tutorsService.updateTutorRating(
        manager,
        tutor,
        savedReview.rating
      )

      return savedReview
    })
  }

  findOneByUserAndTutor(userId: PK, tutorId: PK): Promise<Review> {
    return this.reviewRepository.findOne({
      where: { user: { id: userId }, tutor: { id: tutorId } },
    })
  }

  /**
   * 1. 유저와 튜터가 약속을 가진적 있고 2. 유저가 리뷰를 남긴 적 없는 경우에만 `true` 반환
   */
  async canUserReivewTutor(userId: PK, tutorId: PK): Promise<boolean> {
    const [canReview, existingReview] = await Promise.all([
      this.appointmentsService.hasUserMadeAppointmentWithTutor(userId, tutorId),
      this.findOneByUserAndTutor(userId, tutorId),
    ])

    if (!canReview) {
      throw new BadRequestException({
        message: "You can't reivew the tutor",
        errors: { appointment: 'not exists' },
      })
    }

    if (existingReview) {
      throw new BadRequestException({
        message: 'Review already exists',
        errors: { review: 'already exists' },
      })
    }

    return canReview && !existingReview
  }

  findOneById(id: PK, relations: string[] = []): Promise<Review> {
    return this.reviewRepository.findOne({
      where: { id },
      relations,
    })
  }

  async findOneByIdT(
    @TransactionManager() manager: EntityManager,
    id: PK,
    relations: string[] = []
  ): Promise<Review> {
    const review = await manager.findOne(Review, {
      where: { id },
      relations,
    })

    if (!review) {
      throw new NotFoundException({
        message: 'appointment not found',
        errors: { id: 'not exists' },
      })
    }

    return review
  }

  findAll(): Promise<Review[]> {
    return this.reviewRepository.find({ relations: ['user', 'tutor'] })
  }

  async findAllFeatured(): Promise<Review[]> {
    const reviews = await this.reviewRepository.find({
      relations: ['user', 'tutor'],
      where: { featured: true },
    })

    return reviews.map((review) => {
      return {
        ...review,
        user: {
          fullname: review.user.fullname.substr(0, 4) + '*****',
        },
        tutor: {
          fullname: review.tutor.fullname,
        },
      }
    }) as Review[]
  }

  findAllFeaturedByAdmin(): Promise<Review[]> {
    return this.reviewRepository.find({
      relations: ['user', 'tutor'],
      where: { featured: true },
    })
  }

  findUserReviews(userId: PK): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { user: { id: userId } },
      relations: ['tutor'],
    })
  }

  findTutorReivew(tutorId: PK): Promise<Review[]> {
    return this.reviewRepository
      .createQueryBuilder('review')
      .where({ tutor: { id: tutorId } })
      .select(['review.id', 'review.text', 'review.rating', 'user.fullname'])
      .leftJoin('review.user', 'user')
      .getMany()
  }

  async removeById(reviewId: PK): Promise<Review> {
    const review = await this.findOneById(reviewId)
    if (!review) {
      throw new BadRequestException({
        message: 'Review not exists',
        errors: { reviewId: 'invalid review id' },
      })
    }

    return this.reviewRepository.remove(review)
  }

  async setFeatured(id: PK, featured: boolean): Promise<Review> {
    return getManager().transaction(async (manager) => {
      const review = await this.findOneByIdT(manager, id)
      review.featured = featured
      return manager.save(review)
    })
  }
}
