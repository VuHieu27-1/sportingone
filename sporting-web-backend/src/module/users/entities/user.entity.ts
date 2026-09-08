import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { DetailUser } from '../../detail-users/entities/detail-user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { UserAddress } from '../../user_address/entities/user_address.entity';

@Index(['username'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'username', nullable: false, length: 100 })
  username: string;

  @Column({ name: 'email', nullable: true, unique: true, length: 255 })
  email: string;

  @Column({ name: 'password', nullable: false, length: 255 })
  password: string;

  @Column({ name: 'avatar', type: 'text', nullable: true })
  avatar: string | null;

  @ManyToOne(() => Role, (role) => role.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToOne(() => DetailUser, (detailUser) => detailUser.userRelation)
  detailUser: DetailUser;

  @OneToMany(() => UserAddress, (userAddress) => userAddress.user)
  addresses: UserAddress[];

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => Vendor, (vendor) => vendor.user)
  vendors: Vendor[];

  @Column({ name: 'status_time', type: 'datetime', nullable: true })
  statusTime: Date | null;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
