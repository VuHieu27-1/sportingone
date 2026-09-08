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

@Index(['yard', 'status', 'startDate', 'endDate'])
@Index(['user'])
@Entity('bookings_month')
export class BookingsMonth {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Yard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'yard_id' })
  yard: Yard;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'booking_type',
    type: 'varchar',
    length: 50,
    default: 'month',
  })
  bookingType: string;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string | Date;

  @Column({ name: 'end_date', type: 'date', nullable: false })
  endDate: string | Date;

  @Column({ name: 'start_time', type: 'varchar', length: 20, nullable: false })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 20, nullable: false })
  endTime: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'unpaid',
  })
  status: string;

  @Column({
    name: 'priced',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  priced: number | null;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
