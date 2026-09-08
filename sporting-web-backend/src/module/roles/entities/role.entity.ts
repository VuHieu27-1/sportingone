import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'role_name', unique: true, nullable: false })
  roleName: string;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
