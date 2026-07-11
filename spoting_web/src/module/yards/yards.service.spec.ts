import { Test, TestingModule } from '@nestjs/testing';
import { YardsService } from './yards.service';

describe('YardsService', () => {
  let service: YardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YardsService],
    }).compile();

    service = module.get<YardsService>(YardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
