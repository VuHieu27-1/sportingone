import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { DetailUser } from '../../detail-users/entities/detail-user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'username', nullable: false, length: 100 })
  username: string;

  @Column({ name: 'password', nullable: false, length: 255 })
  password: string;

  @ManyToOne(() => Role, (role) => role.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToOne(() => DetailUser, (detailUser) => detailUser.user, {
    cascade: true,
  })
  detailUser: DetailUser;

  @OneToMany(() => Vendor, (vendor) => vendor.user)
  vendors: Vendor[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
