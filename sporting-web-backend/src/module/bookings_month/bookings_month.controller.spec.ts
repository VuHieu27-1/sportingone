import { Test, TestingModule } from '@nestjs/testing';
import { BookingsMonthController } from './bookings_month.controller';
import { BookingsMonthService } from './bookings_month.service';

describe('BookingsMonthController', () => {
  let controller: BookingsMonthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsMonthController],
      providers: [
        {
          provide: BookingsMonthService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findMyBookings: jest.fn(),
            payBookingsMonthWithWallet: jest.fn(),
            checkYardAvailability: jest.fn(),
            verifyQr: jest.fn(),
            verifyQrRedirect: jest.fn(),
            processRefund: jest.fn(),
            cancelPaidBookingMonth: jest.fn(),
            restoreBookingMonth: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BookingsMonthController>(BookingsMonthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
