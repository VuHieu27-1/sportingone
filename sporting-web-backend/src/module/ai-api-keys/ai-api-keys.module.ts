import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiApiKey } from './entities/ai-api-key.entity';
import { User } from '../users/entities/user.entity';
import { AiApiKeysService } from './ai-api-keys.service';
import { AiApiKeysController } from './ai-api-keys.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiApiKey, User])],
  controllers: [AiApiKeysController],
  providers: [AiApiKeysService],
  exports: [AiApiKeysService, TypeOrmModule],
})
export class AiApiKeysModule {}
