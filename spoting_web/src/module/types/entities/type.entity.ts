import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';

@Entity('types')
export class Types {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'type_name', nullable: false, type: 'varchar', length: 100 })
  typeName: string;

  @OneToMany(() => Yard, (yard) => yard.typeYard, { cascade: true })
  yards: Yard[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
