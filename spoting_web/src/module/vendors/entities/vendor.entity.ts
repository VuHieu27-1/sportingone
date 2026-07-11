import { User } from '../../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.vendors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Yard, (yard) => yard.vendor, { cascade: true })
  yards: Yard[];

  @Column({
    name: 'vendor_name',
    nullable: false,
    type: 'varchar',
    length: 100,
  })
  vendorName: string;

  @Column({ name: 'vendor_address', nullable: true, type: 'text' })
  vendorAddress: string | null;

  @Column({ name: 'vendor_phone', nullable: true, type: 'varchar', length: 20 })
  vendorPhone: string | null;

  @Column({ name: 'status', nullable: true, type: 'varchar', length: 10 })
  status: string | null;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
