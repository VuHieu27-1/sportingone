import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';

@Entity('cameras')
export class Camera {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'camera_name',
    nullable: false,
    type: 'varchar',
    length: 100,
  })
  cameraName: string;

  @Column({ name: 'video_path', nullable: true, type: 'varchar', length: 255 })
  videoPath: string | null;

  @ManyToOne(() => Yard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'yard_id' })
  yard: Yard;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
