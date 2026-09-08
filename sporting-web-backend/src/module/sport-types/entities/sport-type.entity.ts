import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';
import { Types } from '../../types/entities/type.entity';

@Entity('sport_types')
export class SportType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sport_name', nullable: false, type: 'varchar', length: 100 })
  sportName: string;

  @OneToMany(() => Yard, (yard) => yard.sportType)
  yards: Yard[];

  @OneToMany(() => Types, (typeItem) => typeItem.sportType)
  types: Types[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
