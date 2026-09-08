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

@Index(['yard', 'status', 'startTime', 'endTime'])
@Index(['status', 'startTime'])
@Index(['user'])
@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Yard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'yard_id' })
  yard: Yard;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'start_time', nullable: false, type: 'datetime' })
  startTime: Date;

  @Column({ name: 'end_time', nullable: false, type: 'datetime' })
  endTime: Date;

  @Column({ name: 'status', nullable: true, type: 'varchar', length: 20 })
  status: string | null;

  @Column({ name: 'priced', nullable: true, type: 'decimal' })
  priced: number | null;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
