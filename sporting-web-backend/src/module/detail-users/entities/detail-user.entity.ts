import { User } from '../../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('detail_users')
export class DetailUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @OneToOne(() => User, (user) => user.detailUser, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  userRelation: User;

  @Column({ name: 'name', nullable: true, type: 'varchar', length: 100 })
  name: string | null;

  @Column({ name: 'birthday', nullable: true, type: 'date' })
  birthday: Date | string | null;

  @Column({ name: 'gender', nullable: true, type: 'varchar', length: 10 })
  gender: string | null;

  @Column({ name: 'phone', nullable: true, type: 'varchar', length: 20 })
  phone: string | null;

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
