import { User } from '../../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';

@Index(['status'])
@Index(['user'])
@Index(['status', 'latitude', 'longitude'])
@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.vendors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Yard, (yard) => yard.vendor)
  yards: Yard[];

  @Column({
    name: 'vendor_name',
    nullable: false,
    type: 'varchar',
    length: 100,
  })
  vendorName: string;

  @Column({ name: 'avatar', type: 'text', nullable: true })
  avatar: string | null;

  @Column({ name: 'vendor_address', nullable: true, type: 'text' })
  vendorAddress: string | null;

  @Column({ name: 'vendor_phone', nullable: true, type: 'varchar', length: 20 })
  vendorPhone: string | null;

  @Column({ name: 'open_time', nullable: true, type: 'varchar', length: 10, default: '06:00' })
  openTime: string | null;

  @Column({ name: 'close_time', nullable: true, type: 'varchar', length: 10, default: '23:00' })
  closeTime: string | null;

  @Column({ name: 'status', type: 'varchar', length: 10, default: 'pending' })
  status: 'pending' | 'reject' | 'active';

  @Column({
    name: 'latitude',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  latitude: number | null;

  @Column({
    name: 'longitude',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  longitude: number | null;

  @Column({ name: 'activated_at', nullable: true, type: 'datetime' })
  activatedAt: Date | null;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
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
