import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  /**
   * Health check endpoint for chat service
   */
  @Get('health')
  async getHealth() {
    return {
      status: 'healthy',
      serverReachable: true,
      message: 'Chat service is ready.',
    };
  }

  /**
   * Standard JSON non-streaming chat endpoint
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    const userId = req.user?.id || null;
    return this.chatService.processMessage(userId, dto);
  }

  /**
   * SSE Streaming Chat endpoint
   */
  @Post('stream')
  @UseGuards(OptionalJwtAuthGuard)
  async streamMessage(
    @Req() req: any,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    const userId = req.user?.id || null;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const stream = this.chatService.processStreamMessage(userId, dto);
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      const errorPayload = {
        error: true,
        code: err?.code || 'AI_ERROR',
        message: err?.message || 'Có lỗi xảy ra trong quá trình xử lý câu trả lời.',
      };
      res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
      res.end();
    }
  }

  /**
   * Get list of conversations for logged-in user
   */
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getConversations(@Req() req: any) {
    const userId = req.user.id;
    return this.chatService.getUserConversations(userId);
  }

  /**
   * Get messages for a specific conversation with cursor-based pagination
   */
  @Get('conversations/:id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  async getMessages(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limitQuery?: string,
    @Query('before') beforeQuery?: string,
  ) {
    const userId = req.user?.id || null;
    const defaultLimit = Number(process.env.CHAT_MESSAGES_LIMIT) || 10;
    const parsedLimit = limitQuery ? parseInt(limitQuery, 10) : defaultLimit;
    const limit = isNaN(parsedLimit) ? defaultLimit : Math.min(Math.max(parsedLimit, 1), 100);
    const parsedBefore = beforeQuery ? parseInt(beforeQuery, 10) : undefined;
    const before = parsedBefore && !isNaN(parsedBefore) ? parsedBefore : undefined;

    return this.chatService.getConversationMessages(userId, id, limit, before);
  }

  /**
   * Delete a conversation
   */
  @Delete('conversations/:id')
  @UseGuards(JwtAuthGuard)
  async deleteConversation(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.id;
    return this.chatService.deleteConversation(userId, id);
  }
}
