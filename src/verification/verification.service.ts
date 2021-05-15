import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { generateCode } from '../utils/generateCode'
import { getManager, Repository } from 'typeorm'
import {
  EmailVerification,
  TutorEmailVerification,
} from './email-verification.entity'
import { User } from '../users/user.entity'
import {
  sendUserVerificationEmail,
  sendTutorVerificationEmail,
} from '../utils/sendEmail'
import { Tutor } from '../tutors/tutor.entity'

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(TutorEmailVerification)
    private tutorEmailVerificatoinRepository: Repository<TutorEmailVerification>
  ) {}

  async sendVerification(user: User) {
    const token = generateCode()
    const verification = EmailVerification.create({
      userId: user.id,
      token,
    })
    await this.emailVerificationRepository.save(verification)
    return sendUserVerificationEmail(user.email, token)
  }

  async verifyUser(token: string) {
    return getManager().transaction(async (manager) => {
      const verification = await manager.findOne(EmailVerification, {
        where: { token },
      })
      if (!verification) {
        throw new BadRequestException({
          message: 'token not found',
          errors: { token: 'not found' },
        })
      }

      const user = await manager.findOne(User, {
        where: { id: verification.userId },
      })
      user.verified = true
      await manager.remove(verification)
      return manager.save(user)
    })
  }

  async sendTutorVerification(tutor: Tutor) {
    const token = generateCode()
    const verification = TutorEmailVerification.create({
      tutorId: tutor.id,
      token,
    })
    await this.tutorEmailVerificatoinRepository.save(verification)
    return sendTutorVerificationEmail(tutor.email, token)
  }

  async verifyTutor(token: string) {
    return getManager().transaction(async (manager) => {
      const verification = await manager.findOne(TutorEmailVerification, {
        where: { token },
      })
      if (!verification) {
        throw new BadRequestException({
          message: 'token not found',
          errors: { token: 'not found' },
        })
      }

      const tutor = await manager.findOne(Tutor, {
        where: { id: verification.tutorId },
      })
      tutor.verified = true
      await manager.remove(verification)
      return manager.save(tutor)
    })
  }
}
