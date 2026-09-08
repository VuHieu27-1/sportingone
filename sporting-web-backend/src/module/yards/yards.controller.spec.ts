import { Test, TestingModule } from '@nestjs/testing';
import { YardsController } from './yards.controller';
import { YardsService } from './yards.service';

describe('YardsController', () => {
  let controller: YardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YardsController],
      providers: [YardsService],
    }).compile();

    controller = module.get<YardsController>(YardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
