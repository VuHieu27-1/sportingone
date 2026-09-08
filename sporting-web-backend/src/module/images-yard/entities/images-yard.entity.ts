import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';

@Entity('images_yard')
export class ImagesYard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: false })
  imageUrl: string;

  @ManyToOne(() => Yard, (yard) => yard.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'yard_id' })
  yard: Yard;

  @Column({ name: 'is_cover', type: 'boolean', default: false, nullable: true })
  isCover: boolean;

  @Column({ name: 'caption', type: 'varchar', length: 255, nullable: true })
  caption: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
