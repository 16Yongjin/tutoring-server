import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  EmailVerification,
  TutorEmailVerification,
} from './email-verification.entity'
import { VerificationService } from './verification.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification, TutorEmailVerification]),
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
