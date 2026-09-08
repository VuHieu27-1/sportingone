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
import { BookingsMonthModule } from './module/bookings_month/bookings_month.module';
import { PaymentsModule } from './module/payments/payments.module';
import { PostsModule } from './module/posts/posts.module';
import { CommentsModule } from './module/comments/comments.module';
import { NotificationsModule } from './module/notifications/notifications.module';
import { NotificationUsersModule } from './module/notification-users/notification-users.module';
import { ImagesYardModule } from './module/images-yard/images-yard.module';
import { RatesModule } from './module/rates/rates.module';
import { ChatModule } from './module/chat/chat.module';
import { BonusPointsModule } from './module/bonus-points/bonus-points.module';
import { TournamentsModule } from './module/tournaments/tournaments.module';
import { GroupsModule } from './module/groups/groups.module';
import { TeamsModule } from './module/teams/teams.module';
import { TournamentTeamsModule } from './module/tournament-teams/tournament-teams.module';
import { MatchesModule } from './module/matches/matches.module';
import { GroupTeamsModule } from './module/group-teams/group-teams.module';
import { AuthModule } from './module/auth/auth.module';
import { RegisterUserModule } from './module/register-user/register-user.module';
import { MailModule } from './module/mail/mail.module';
import { ForgotPasswordModule } from './module/forgot-password/forgot-password.module';
import { DetailAddressModule } from './module/detail-address/detail-address.module';
import { UserAddressModule } from './module/user_address/user_address.module';
import { WalletsModule } from './module/wallets/wallets.module';
import { CoinTransactionsModule } from './module/coin_transactions/coin_transactions.module';
import { GeolocationModule } from './common/geolocation/geolocation.module';
import { PayOSModule } from './common/payos/payos.module';
import { BanksModule } from './common/banks/banks.module';
import { GoogleDriveModule } from './common/google-drive/google-drive.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AiApiKeysModule } from './module/ai-api-keys/ai-api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    GoogleDriveModule,
    GeolocationModule,
    PayOSModule,
    BanksModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<number>('DB_PORT', 3306)),
        username: configService.get<string>('DB_USER', 'root'),
        password: configService.get<string>('DB_PASS', ''),
        database: configService.get<string>('DB_NAME', 'sporting_web'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        extra: {
          connectionLimit: Number(configService.get<number>('DB_CONNECTION_LIMIT', 20)),
          waitForConnections: true,
          queueLimit: 0,
        },
      }),
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
    BookingsMonthModule,
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
    AuthModule,
    RegisterUserModule,
    MailModule,
    ForgotPasswordModule,
    DetailAddressModule,
    UserAddressModule,
    WalletsModule,
    CoinTransactionsModule,
    ImagesYardModule,
    ChatModule,
    RatesModule,
    AiApiKeysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
