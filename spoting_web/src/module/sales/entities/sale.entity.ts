import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Yard, (yard) => yard.sale, { cascade: true })
  yards: Yard[];

  @Column({ name: 'sales_name', nullable: false, type: 'varchar', length: 100 })
  salesName: string;

  @Column({ name: 'price', nullable: false, type: 'decimal' })
  price: number;

  @Column({ name: 'persent', nullable: true, type: 'decimal' })
  persent: number;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
