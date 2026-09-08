import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { Types } from '../../types/entities/type.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { SportType } from '../../sport-types/entities/sport-type.entity';
import { ImagesYard } from '../../images-yard/entities/images-yard.entity';
import { Rate } from '../../rates/entities/rate.entity';

@Index(['vendor'])
@Index(['sportType'])
@Index(['typeYard'])
@Index(['status'])
@Index(['vendor', 'status'])
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

  @Column({ name: 'price', nullable: false, type: 'decimal' })
  price: number;

  @Column({ name: 'peak_hour_price', nullable: true, type: 'decimal' })
  peakHourPrice: number | null;

  @Column({ name: 'status', nullable: true, type: 'varchar', length: 20, default: 'available' })
  status: string | null;

  @OneToMany(() => ImagesYard, (image) => image.yard)
  images: ImagesYard[];

  @OneToMany(() => Rate, (rate) => rate.yard)
  rates: Rate[];

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
