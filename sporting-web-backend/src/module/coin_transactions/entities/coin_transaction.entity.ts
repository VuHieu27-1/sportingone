import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CoinTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  PAYMENT = 'payment',
  REFUND = 'refund',
}

export enum CoinTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('coin_transactions')
export class CoinTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'type',
    type: 'enum',
    enum: CoinTransactionType,
    default: CoinTransactionType.DEPOSIT,
  })
  type: CoinTransactionType;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  balanceAfter: number | null;

  @Column({
    name: 'transaction_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionCode: string | null;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CoinTransactionStatus,
    default: CoinTransactionStatus.COMPLETED,
  })
  status: CoinTransactionStatus;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    name: 'update_at',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
