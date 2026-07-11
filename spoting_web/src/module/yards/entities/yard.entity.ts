import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { Types } from '../../types/entities/type.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { SportType } from '../../sport-types/entities/sport-type.entity';

@Entity('yards')
export class Yard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'yard_name', nullable: false, type: 'varchar', length: 100 })
  yardName: string;

  @ManyToOne(() => SportType, (sportType) => sportType.yards, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'sport_id' })
  sportType: SportType;

  @ManyToOne(() => Vendor, (vendor) => vendor.yards, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ManyToOne(() => Sale, (sale) => sale.yards, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'sales_id' })
  sale: Sale;

  @ManyToOne(() => Types, (typeYard) => typeYard.yards, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'type_id' })
  typeYard: Types;

  @Column({ name: 'quantity', nullable: false, type: 'int' })
  quantity: number;

  @Column({ name: 'price', nullable: false, type: 'decimal' })
  price: number;

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
