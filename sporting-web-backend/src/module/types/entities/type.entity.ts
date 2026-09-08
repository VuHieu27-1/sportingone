import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';
import { SportType } from '../../sport-types/entities/sport-type.entity';

@Entity('types')
export class Types {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'type_name', nullable: false, type: 'varchar', length: 100 })
  typeName: string;

  @OneToMany(() => Yard, (yard) => yard.typeYard)
  yards: Yard[];

  @ManyToOne(() => SportType, (sportType) => sportType.types)
  @JoinColumn({ name: 'sport_type_id' })
  sportType: SportType;

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
