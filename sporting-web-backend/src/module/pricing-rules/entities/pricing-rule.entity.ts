import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';

@Entity('pricing_rules')
export class PricingRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rule_name', nullable: false, type: 'varchar', length: 100 })
  ruleName: string;

  @ManyToOne(() => Yard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'yard_id' })
  yard: Yard;

  @Column({
    name: 'is_holiday',
    nullable: false,
    type: 'boolean',
    default: false,
  })
  isHoliday: boolean;

  @Column({ name: 'day_of_week', nullable: true, type: 'varchar', length: 20 })
  dayOfWeek: string | null;

  @Column({ name: 'start_time', nullable: false, type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', nullable: false, type: 'time' })
  endTime: string;

  @Column({ name: 'price', nullable: false, type: 'decimal' })
  price: number;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
