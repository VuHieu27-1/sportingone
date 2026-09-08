import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { SportType } from '../../sport-types/entities/sport-type.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { Group } from '../../groups/entities/group.entity';
import { TournamentTeam } from '../../tournament-teams/entities/tournament-team.entity';

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'tournament_name',
    nullable: false,
    type: 'varchar',
    length: 150,
  })
  tournamentName: string;

  @ManyToOne(() => SportType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sport_id' })
  sportType: SportType;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'start_date', nullable: false, type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', nullable: false, type: 'date' })
  endDate: Date;

  @Column({ name: 'quantity', nullable: false, type: 'int', default: 0 })
  quantity: number;

  @Column({ name: 'status', nullable: true, type: 'varchar', length: 20 })
  status: string | null;

  @OneToMany(() => Group, (group) => group.tournament)
  groups: Group[];

  @OneToMany(() => TournamentTeam, (tt) => tt.tournament)
  tournamentTeams: TournamentTeam[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
