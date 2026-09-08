import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { AiApiKeysModule } from '../ai-api-keys/ai-api-keys.module';
import { GoogleDriveModule } from '../../common/google-drive/google-drive.module';
import { CourtContextService } from './tools/court-context.service';
import { UserContextService } from './tools/user-context.service';
import { GeminiService } from './gemini/gemini.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ChatMessage,
      Vendor,
      Yard,
      User,
      Booking,
      Wallet,
    ]),
    BookingsModule,
    AiApiKeysModule,
    GoogleDriveModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, CourtContextService, UserContextService, GeminiService],
  exports: [ChatService, GeminiService],
})
export class ChatModule {}
