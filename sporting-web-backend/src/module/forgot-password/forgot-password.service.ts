import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ForgotPassword,
  ForgotPasswordStatus,
} from './entities/forgot-password.entity';
import { RequestForgotPasswordDto } from './dto/request-forgot-password.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { getVietnamDate } from '../../common/utils/date.util';

@Injectable()
export class ForgotPasswordService {
  constructor(
    @InjectRepository(ForgotPassword)
    private readonly forgotPasswordRepository: Repository<ForgotPassword>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
  ) { }

  private async validateUserExists(
    username: string,
    email: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { username, email },
    });

    if (!user) {
      throw new NotFoundException(
        `User with username "${username}" and email "${email}" not found`,
      );
    }

    return user;
  }

  private async supersedeOldPendingTokens(
    email: string,
    username: string,
  ): Promise<void> {
    const oldRecords = await this.forgotPasswordRepository.find({
      where: { email, username, status: ForgotPasswordStatus.PENDING },
    });

    if (oldRecords.length > 0) {
      await this.forgotPasswordRepository.save(oldRecords);
    }
  }

  private formatRemainingBanTime(bannedUntil: Date, now: Date): string {
    const diffMs = new Date(bannedUntil).getTime() - now.getTime();
    const totalSecs = Math.max(1, Math.ceil(diffMs / 1000));
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;

    if (minutes > 0 && seconds > 0) {
      return `${minutes} minute(s) ${seconds} second(s)`;
    } else if (minutes > 0) {
      return `${minutes} minute(s)`;
    } else {
      return `${seconds} second(s)`;
    }
  }

  /**
   * Creates or saves record.
   */
  async create(requestDto: RequestForgotPasswordDto) {
    const { username, email } = requestDto;
    await this.validateUserExists(username, email);
    const now = getVietnamDate();

    const latestBanRecord = await this.forgotPasswordRepository.findOne({
      where: [
        { email, bannedUntil: Not(IsNull()) },
        { username, bannedUntil: Not(IsNull()) },
      ],
      order: { bannedUntil: 'DESC' },
    });

    if (
      latestBanRecord &&
      latestBanRecord.bannedUntil &&
      now < new Date(latestBanRecord.bannedUntil)
    ) {
      const timeStr = this.formatRemainingBanTime(
        latestBanRecord.bannedUntil,
        now,
      );
      throw new BadRequestException(
        `Account is temporarily banned from requesting password reset. Please try again after ${timeStr}.`,
      );
    }

    const lastRecord = await this.forgotPasswordRepository.findOne({
      where: { email, username },
      order: { createdAt: 'DESC' },
    });

    if (lastRecord && lastRecord.createdAt) {
      const cooldownSeconds =
        Number(process.env.FORGOT_PASSWORD_COOLDOWN_SECONDS) || 20;
      const elapsedSeconds =
        (now.getTime() - new Date(lastRecord.createdAt).getTime()) / 1000;

      if (elapsedSeconds < cooldownSeconds) {
        const remaining = Math.ceil(cooldownSeconds - elapsedSeconds);
        throw new BadRequestException(
          `Please wait ${remaining} second(s) before requesting another password reset code.`,
        );
      }
    }

    const maxPendingRequests =
      Number(process.env.MAX_PENDING_REQUESTS) || 5;
    const pendingRecords = await this.forgotPasswordRepository.find({
      where: { email, username, status: ForgotPasswordStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (pendingRecords.length >= maxPendingRequests) {
      const spamBanHours =
        Number(process.env.PENDING_SPAM_BAN_HOURS) || 1;
      const bannedUntil = new Date(
        now.getTime() + spamBanHours * 60 * 1000,
      );

      const latestPending = pendingRecords[0];
      latestPending.bannedUntil = bannedUntil;
      await this.forgotPasswordRepository.save(latestPending);

      throw new BadRequestException(
        `You have requested ${maxPendingRequests} OTP tokens without verifying. Your account is banned for ${spamBanHours} hour(s).`,
      );
    }

    await this.supersedeOldPendingTokens(email, username);

    const verificationToken = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const expiresInMinutes =
      Number(process.env.REGISTER_TOKEN_EXPIRES_IN_MINUTES) || 10;
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    const fpRecord = this.forgotPasswordRepository.create({
      username,
      email,
      verificationToken,
      status: ForgotPasswordStatus.PENDING,
      failCount: 0,
      expiresAt,
    });

    const saved = await this.forgotPasswordRepository.save(fpRecord);

    await this.mailService.sendForgotPasswordEmail(
      email,
      username,
      verificationToken,
    );

    return {
      message: 'Forgot password request created. Verification token sent.',
      data: {
        id: saved.id,
        username: saved.username,
        email: saved.email,
        expiresAt: saved.expiresAt,
      },
    };
  }

  /**
   * Validates and verifies parameters for verify.
   */
  async verify(verifyDto: VerifyForgotPasswordDto) {
    const { email, token } = verifyDto;
    const now = getVietnamDate();

    const latestBanRecord = await this.forgotPasswordRepository.findOne({
      where: { email, bannedUntil: Not(IsNull()) },
      order: { bannedUntil: 'DESC' },
    });

    if (
      latestBanRecord &&
      latestBanRecord.bannedUntil &&
      now < new Date(latestBanRecord.bannedUntil)
    ) {
      const timeStr = this.formatRemainingBanTime(
        latestBanRecord.bannedUntil,
        now,
      );
      throw new BadRequestException(
        `You are banned from verifying OTP due to security violations. Please try again after ${timeStr}.`,
      );
    }

    const pendingRecord = await this.forgotPasswordRepository.findOne({
      where: { email, status: ForgotPasswordStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (!pendingRecord) {
      throw new NotFoundException(
        `No active pending forgot-password request found for email "${email}". Please request a new code.`,
      );
    }

    if (pendingRecord.expiresAt && now > new Date(pendingRecord.expiresAt)) {
      pendingRecord.status = ForgotPasswordStatus.EXPIRED;
      await this.forgotPasswordRepository.save(pendingRecord);
      throw new BadRequestException(
        'Verification token has expired. Status updated to expired. Please request a new token.',
      );
    }

    if (pendingRecord.verificationToken !== token) {
      pendingRecord.failCount = (pendingRecord.failCount || 0) + 1;
      const maxFails = Number(process.env.MAX_VERIFY_FAILS) || 3;
      const banMinutes = Number(process.env.VERIFY_FAIL_BAN_MINUTES) || 15;

      if (pendingRecord.failCount >= maxFails) {
        pendingRecord.bannedUntil = new Date(
          now.getTime() + banMinutes * 60 * 1000,
        );
        await this.forgotPasswordRepository.save(pendingRecord);

        throw new BadRequestException(
          `You have entered wrong verification token ${pendingRecord.failCount} times. You are banned from verifying for ${banMinutes} minutes.`,
        );
      }

      await this.forgotPasswordRepository.save(pendingRecord);
      const attemptsLeft = maxFails - pendingRecord.failCount;
      throw new BadRequestException(
        `Invalid verification token. You have ${attemptsLeft} attempt(s) remaining.`,
      );
    }

    pendingRecord.status = ForgotPasswordStatus.VERIFIED;
    pendingRecord.bannedUntil = null;
    await this.forgotPasswordRepository.save(pendingRecord);

    return {
      message: 'Token verified successfully. You can now reset your password.',
      email: pendingRecord.email,
      username: pendingRecord.username,
    };
  }

  /**
   * Resets the user's password after OTP verification.
   */
  async resetPassword(resetDto: ResetPasswordDto) {
    const { username, email, newPassword } = resetDto;
    const now = getVietnamDate();

    const user = await this.validateUserExists(username, email);

    const latestVerified = await this.forgotPasswordRepository.findOne({
      where: { email, username, status: ForgotPasswordStatus.VERIFIED },
      order: { updatedAt: 'DESC' },
    });

    const token_verify = latestVerified?.verificationToken;

    const verifiedRecord = await this.forgotPasswordRepository.findOne({
      where: {
        email,
        username,
        verificationToken: token_verify,
        status: ForgotPasswordStatus.VERIFIED,
      },
      order: { updatedAt: 'DESC' },
    });

    if (!verifiedRecord) {
      throw new BadRequestException(
        'Invalid or unverified token. You must verify your email/OTP code before resetting your password.',
      );
    }

    if (verifiedRecord.expiresAt && now > new Date(verifiedRecord.expiresAt)) {
      verifiedRecord.status = ForgotPasswordStatus.EXPIRED;
      await this.forgotPasswordRepository.save(verifiedRecord);
      throw new BadRequestException(
        'Verified token has expired. Please request a new password reset code.',
      );
    }

    user.password = bcrypt.hashSync(newPassword, 10);
    await this.userRepository.save(user);

    verifiedRecord.status = ForgotPasswordStatus.SUPERSEDED;
    await this.forgotPasswordRepository.save(verifiedRecord);

    return {
      message:
        'Password updated successfully. You can now login with your new password.',
    };
  }
}
