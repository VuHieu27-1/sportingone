import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CamerasService } from './cameras.service';
import { CamerasController } from './cameras.controller';
import { Camera } from './entities/camera.entity';
import { Yard } from '../yards/entities/yard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Camera, Yard])],
  controllers: [CamerasController],
  providers: [CamerasService],
  exports: [TypeOrmModule],
})
export class CamerasModule {}
