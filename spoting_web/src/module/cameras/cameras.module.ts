import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Camera } from './entities/camera.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Camera])],
  exports: [TypeOrmModule],
})
export class CamerasModule {}
