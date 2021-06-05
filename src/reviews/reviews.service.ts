import { getManager, Repository } from 'typeorm'
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Review } from './review.entity'
import { TutorsService } from '../tutors/tutors.service'
import { UsersService } from '../users/users.service'
import { CreateReviewDto } from './dto'
import { AppointmentsService } from '../appointments/appointments.service'
import { PK } from '../shared/types'
import { Tutor } from '../tutors/tutor.entity'

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Tutor)
    private tutorRepository: Repository<Tutor>,
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
      const [user, tutor, _canReview] = await Promise.all([
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

  findAll(): Promise<Review[]> {
    return this.reviewRepository.find({ relations: ['user', 'tutor'] })
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
}
