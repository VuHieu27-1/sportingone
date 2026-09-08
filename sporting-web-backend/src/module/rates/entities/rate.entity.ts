import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Yard } from '../../yards/entities/yard.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Index(['yard', 'status', 'parentRate', 'rating'])
@Entity('rates')
export class Rate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Yard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'yard_id' })
  yard: Yard;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking | null;

  @ManyToOne(() => Rate, (rate) => rate.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rate_id' })
  parentRate: Rate | null;

  @OneToMany(() => Rate, (rate) => rate.parentRate)
  replies: Rate[];

  @Column({ name: 'rating', type: 'tinyint', nullable: true })
  rating: number | null;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'images', type: 'json', nullable: true })
  images: string[] | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: string;

  @Column({ name: 'likes_count', type: 'int', default: 0 })
  likesCount: number;

  @Column({
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
