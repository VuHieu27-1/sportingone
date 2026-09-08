import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @OneToOne(() => User, (user) => user.wallet, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'bank_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bankName: string | null;

  @Column({
    name: 'bank_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bankNumber: string | null;

  @Column({
    name: 'bank_account_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bankAccountName: string | null;

  @Column({
    name: 'balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  balance: number;

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
