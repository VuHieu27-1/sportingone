import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BookingsMonthService } from './bookings_month.service';
import { BookingsMonth } from './entities/bookings_month.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CoinTransaction } from '../coin_transactions/entities/coin_transaction.entity';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('BookingsMonthService', () => {
  let service: BookingsMonthService;

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        withDeleted: jest.fn().mockReturnThis(),
      })),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsMonthService,
        { provide: getRepositoryToken(BookingsMonth), useValue: mockRepo() },
        { provide: getRepositoryToken(Booking), useValue: mockRepo() },
        { provide: getRepositoryToken(Yard), useValue: mockRepo() },
        { provide: getRepositoryToken(User), useValue: mockRepo() },
        { provide: getRepositoryToken(Wallet), useValue: mockRepo() },
        { provide: getRepositoryToken(CoinTransaction), useValue: mockRepo() },
        {
          provide: MailService,
          useValue: { sendBookingMonthConfirmationEmail: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { sendSystemNotification: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { createQueryRunner: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BookingsMonthService>(BookingsMonthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
