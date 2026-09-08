import { Test, TestingModule } from '@nestjs/testing';
import { DetailUsersService } from './detail-users.service';

describe('DetailUsersService', () => {
  let service: DetailUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DetailUsersService],
    }).compile();

    service = module.get<DetailUsersService>(DetailUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
