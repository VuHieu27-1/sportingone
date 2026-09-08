import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
  RegisterUser,
  RegisterUserStatus,
} from './entities/register-user.entity';
import { CreateRegisterUserDto } from './dto/create-register-user.dto';
import { VerifyRegisterUserDto } from './dto/verify-register-user.dto';
import { UpdateRegisterUserDto } from './dto/update-register-user.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { getVietnamDate } from '../../common/utils/date.util';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class RegisterUserService {
  constructor(
    @InjectRepository(RegisterUser)
    private readonly registerUserRepository: Repository<RegisterUser>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) { }


  private async supersedeOldPendingTokens(
    email: string,
    username: string,
  ): Promise<void> {
    const oldRecords = await this.registerUserRepository.find({
      where: [
        { email, status: RegisterUserStatus.PENDING },
        { username, status: RegisterUserStatus.PENDING },
      ],
    });

    for (const record of oldRecords) {
      record.status = RegisterUserStatus.SUPERSEDED;
    }

    if (oldRecords.length > 0) {
      await this.registerUserRepository.save(oldRecords);
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
  async create(createRegisterUserDto: CreateRegisterUserDto) {
    const { username, email, password } = createRegisterUserDto;

    const existingUser = await this.usersService.findOneByUsername(username);
    if (existingUser) {
      throw new ConflictException(
        `User with username "${username}" already exists`,
      );
    }

    const existingEmail = await this.usersService.findOneByEmail(email);
    if (existingEmail) {
      throw new ConflictException(
        `User with email "${email}" already exists`,
      );
    }

    const now = getVietnamDate();

    const latestBanRecord = await this.registerUserRepository.findOne({
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
        `Account is temporarily banned from registration. Please try again after ${timeStr}.`,
      );
    }

    const lastRecord = await this.registerUserRepository.findOne({
      where: [{ email }, { username }],
      order: { createdAt: 'DESC' },
    });

    if (lastRecord && lastRecord.createdAt) {
      const cooldownSeconds =
        Number(process.env.REGISTER_COOLDOWN_SECONDS) ||
        Number(process.env.FORGOT_PASSWORD_COOLDOWN_SECONDS) ||
        20;
      const elapsedSeconds =
        (now.getTime() - new Date(lastRecord.createdAt).getTime()) / 1000;

      if (elapsedSeconds < cooldownSeconds) {
        const remaining = Math.ceil(cooldownSeconds - elapsedSeconds);
        throw new BadRequestException(
          `Please wait ${remaining} second(s) before requesting another registration code.`,
        );
      }
    }

    const maxPendingRequests =
      Number(process.env.MAX_PENDING_REQUESTS) || 5;
    const pendingRecords = await this.registerUserRepository.find({
      where: [
        { email, status: RegisterUserStatus.PENDING },
        { username, status: RegisterUserStatus.PENDING },
      ],
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
      await this.registerUserRepository.save(latestPending);

      throw new BadRequestException(
        `You have requested ${maxPendingRequests} verification tokens without verifying. Your account is banned for ${spamBanHours} hour(s).`,
      );
    }

    await this.supersedeOldPendingTokens(email, username);

    const verificationToken = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const expiresInMinutes =
      Number(process.env.REGISTER_TOKEN_EXPIRES_IN_MINUTES) || 10;
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    const hashedPassword = await bcrypt.hash(password, 10);

    const registerUser = this.registerUserRepository.create({
      ...createRegisterUserDto,
      password: hashedPassword,
      status: RegisterUserStatus.PENDING,
      verificationToken,
      failCount: 0,
      expiresAt,
    });

    const saved = await this.registerUserRepository.save(registerUser);

    await this.mailService.sendVerificationEmail(
      saved.email,
      saved.username,
      verificationToken,
    );

    return {
      message: 'Registration request created. Verification email sent.',
      data: {
        id: saved.id,
        email: saved.email,
        username: saved.username,
        status: saved.status,
        expiresAt: saved.expiresAt,
      },
    };
  }

  /**
   * Validates and verifies parameters for verifyEmail.
   */
  async verifyEmail(verifyRegisterUserDto: VerifyRegisterUserDto) {
    const { email, token } = verifyRegisterUserDto;
    const now = getVietnamDate();

    const latestBanRecord = await this.registerUserRepository.findOne({
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

    const pendingRecord = await this.registerUserRepository.findOne({
      where: { email, status: RegisterUserStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (!pendingRecord) {
      throw new NotFoundException(
        `No pending registration found for email "${email}". Please request a new code.`,
      );
    }

    if (pendingRecord.expiresAt && now > new Date(pendingRecord.expiresAt)) {
      pendingRecord.status = RegisterUserStatus.EXPIRED;
      await this.registerUserRepository.save(pendingRecord);
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
        await this.registerUserRepository.save(pendingRecord);

        throw new BadRequestException(
          `You have entered wrong verification token ${pendingRecord.failCount} times. You are banned from verifying for ${banMinutes} minutes.`,
        );
      }

      await this.registerUserRepository.save(pendingRecord);
      const attemptsLeft = maxFails - pendingRecord.failCount;
      throw new BadRequestException(
        `Invalid verification token. You have ${attemptsLeft} attempt(s) remaining.`,
      );
    }

    pendingRecord.status = RegisterUserStatus.ACCEPTED;
    pendingRecord.bannedUntil = null;
    await this.registerUserRepository.save(pendingRecord);

    const createdUser = await this.usersService.create({
      username: pendingRecord.username,
      password: pendingRecord.password,
      email: pendingRecord.email,
    });

    delete (createdUser as Partial<typeof createdUser>).password;

    const payload = {
      username: createdUser.username,
      sub: createdUser.id,
      role: createdUser.role ? createdUser.role.roleName : 'user',
    };
    const access_token = this.jwtService.sign(payload);

    return {
      message: 'Email verification successful. User account created.',
      access_token,
      user: createdUser,
    };
  }


  /**
   * Retrieves All information without exposing passwords.
   */
  async findAll() {
    const records = await this.registerUserRepository.find();
    return records.map((r) => {
      const copy = { ...r };
      delete (copy as Partial<RegisterUser>).password;
      return copy;
    });
  }

  /**
   * Retrieves One information without exposing password.
   */
  async findOne(id: number) {
    const registerUser = await this.registerUserRepository.findOne({
      where: { id },
    });
    if (!registerUser) {
      throw new NotFoundException(`RegisterUser with ID ${id} not found`);
    }
    const copy = { ...registerUser };
    delete (copy as Partial<RegisterUser>).password;
    return copy;
  }

  /**
   * Updates record details.
   */
  async update(id: number, updateRegisterUserDto: UpdateRegisterUserDto) {
    const registerUser = await this.findOne(id);
    this.registerUserRepository.merge(registerUser, updateRegisterUserDto);
    return this.registerUserRepository.save(registerUser);
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number) {
    const registerUser = await this.findOne(id);
    await this.registerUserRepository.softDelete(id);
    return 'Delete success';
  }
}
