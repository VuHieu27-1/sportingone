import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Index(['booking'])
@Index(['user'])
@Index(['yard'])
@Index(['status'])
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Yard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'yard_id' })
  yard: Yard;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'total_price', nullable: false, type: 'decimal' })
  totalPrice: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  paymentMethod: string | null;

  @Column({ name: 'time_buy', default: () => 'CURRENT_TIMESTAMP' })
  timeBuy: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
