import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './module/users/users.module';
import { RolesModule } from './module/roles/roles.module';
import { DetailUsersModule } from './module/detail-users/detail-users.module';
import { VendorsModule } from './module/vendors/vendors.module';
import { YardsModule } from './module/yards/yards.module';
import { TypesModule } from './module/types/types.module';
import { SalesModule } from './module/sales/sales.module';
import { SportTypesModule } from './module/sport-types/sport-types.module';
import { CamerasModule } from './module/cameras/cameras.module';
import { PricingRulesModule } from './module/pricing-rules/pricing-rules.module';
import { BookingsModule } from './module/bookings/bookings.module';
import { PaymentsModule } from './module/payments/payments.module';
import { PostsModule } from './module/posts/posts.module';
import { CommentsModule } from './module/comments/comments.module';
import { NotificationsModule } from './module/notifications/notifications.module';
import { NotificationUsersModule } from './module/notification-users/notification-users.module';
import { BonusPointsModule } from './module/bonus-points/bonus-points.module';
import { TournamentsModule } from './module/tournaments/tournaments.module';
import { GroupsModule } from './module/groups/groups.module';
import { TeamsModule } from './module/teams/teams.module';
import { TournamentTeamsModule } from './module/tournament-teams/tournament-teams.module';
import { MatchesModule } from './module/matches/matches.module';
import { GroupTeamsModule } from './module/group-teams/group-teams.module';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'sporting_web',
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsersModule,
    RolesModule,
    DetailUsersModule,
    VendorsModule,
    YardsModule,
    TypesModule,
    SalesModule,
    SportTypesModule,
    CamerasModule,
    PricingRulesModule,
    BookingsModule,
    PaymentsModule,
    PostsModule,
    CommentsModule,
    NotificationsModule,
    NotificationUsersModule,
    BonusPointsModule,
    TournamentsModule,
    GroupsModule,
    TeamsModule,
    TournamentTeamsModule,
    MatchesModule,
    GroupTeamsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
