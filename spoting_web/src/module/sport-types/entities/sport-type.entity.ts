import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';

@Entity('sport_types')
export class SportType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sport_name', nullable: false, type: 'varchar', length: 100 })
  sportName: string;

  @Column({ name: 'vendors', nullable: true, type: 'text' })
  vendors: string | null;

  @OneToMany(() => Yard, (yard) => yard.sportType)
  yards: Yard[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
