import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { GroupTeam } from '../../group-teams/entities/group-team.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'group_name', nullable: false, type: 'varchar', length: 50 })
  groupName: string;

  @ManyToOne(() => Tournament, (tournament) => tournament.groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @OneToMany(() => GroupTeam, (gt) => gt.group)
  groupTeams: GroupTeam[];

  @DeleteDateColumn({ name: 'ondeleted', nullable: true, type: 'datetime' })
  ondeleted: Date | null;
}
