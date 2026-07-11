import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Group } from '../../groups/entities/group.entity';
import { Yard } from '../../yards/entities/yard.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity('matchs')
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' }) // ponytail: corrected ERD typo "grounp_id"
  group: Group;

  @ManyToOne(() => Yard, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'yard_id' })
  yard: Yard;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_1' })
  team1: Team;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_2' })
  team2: Team;

  @Column({ name: 'match_date', nullable: false, type: 'datetime' })
  matchDate: Date;

  @Column({ name: 'score_team_1', nullable: true, type: 'int' })
  scoreTeam1: number | null;

  @Column({ name: 'score_team_2', nullable: true, type: 'int' })
  scoreTeam2: number | null;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'winner' })
  winner: Team | null;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
