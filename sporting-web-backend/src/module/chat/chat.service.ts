import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { SendMessageDto, ChatAttachmentDto } from './dto/send-message.dto';
import { GeminiService, ChatHistoryMessage, StreamChunkResult } from './gemini/gemini.service';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
    private readonly geminiService: GeminiService,
    private readonly googleDriveService: GoogleDriveService,
  ) { }

  /**
   * Retrieves or creates a conversation instance strictly isolated per user.
   */
  async getOrCreateConversation(
    userId: number | null,
    conversationId?: number,
    initialMessage?: string,
  ): Promise<Conversation> {
    if (conversationId) {
      const conv = await this.convRepo.findOne({
        where: { id: conversationId },
      });
      if (conv) {
        if (userId && conv.userId === userId) {
          return conv;
        }
        if (!userId && !conv.userId) {
          return conv;
        }
      }
    }

    const title = initialMessage
      ? initialMessage.slice(0, 40) + (initialMessage.length > 40 ? '...' : '')
      : 'Hội thoại mới';

    const newConv = this.convRepo.create({
      userId: userId || null,
      title,
    });
    return this.convRepo.save(newConv);
  }

  /**
   * Gets list of conversations for authenticated user.
   */
  async getUserConversations(userId: number): Promise<Conversation[]> {
    const limit = Number(process.env.CHAT_CONVERSATIONS_LIMIT) || 10;
    return this.convRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Gets message history for a specific conversation with strict user verification
   * and high-performance cursor-based pagination.
   */
  async getConversationMessages(
    userId: number | null,
    conversationId: number,
    limit?: number,
    before?: number,
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean; nextCursor: number | null }> {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new NotFoundException(`Conversation ID ${conversationId} không tồn tại`);
    }

    if (conv.userId) {
      if (!userId || conv.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập đoạn hội thoại này');
      }
    } else {
      if (userId) {
        throw new ForbiddenException('Đoạn hội thoại này thuộc phiên khách');
      }
    }

    const effectiveLimit = limit || Number(process.env.CHAT_MESSAGES_LIMIT) || 10;

    const query = this.msgRepo
      .createQueryBuilder('msg')
      .where('msg.conversationId = :conversationId', { conversationId });

    if (before) {
      query.andWhere('msg.id < :before', { before });
    }
    query.orderBy('msg.id', 'DESC').take(effectiveLimit + 1);

    const rows = await query.getMany();
    const hasMore = rows.length > effectiveLimit;
    const items = hasMore ? rows.slice(0, effectiveLimit) : rows;
    const messages = items.reverse();
    const nextCursor = hasMore && messages.length > 0 ? messages[0].id : null;

    return {
      messages,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Deletes a conversation strictly checking user ownership.
   */
  async deleteConversation(userId: number, conversationId: number): Promise<{ success: boolean }> {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new NotFoundException(`Conversation ID ${conversationId} không tồn tại`);
    }
    if (conv.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xoá đoạn hội thoại này');
    }

    await this.convRepo.remove(conv);
    return { success: true };
  }

  /**
   * Non-streaming chat processing with Gemini AI.
   */
  async processMessage(
    userId: number | null,
    dto: SendMessageDto,
  ): Promise<{
    conversationId: number;
    messageId: number;
    content: string;
    model: string;
    createdAt: Date;
  }> {
    const rawMessage =
      dto.message?.trim() ||
      (dto.attachments?.length
        ? `[Đính kèm ${dto.attachments.length} tệp/ảnh: ${dto.attachments.map((a) => a.name).join(', ')}]`
        : 'Xin chào');

    this.validateAttachments(dto.attachments);

    const conv = await this.getOrCreateConversation(userId, dto.conversationId, rawMessage);

    const processedAttachments = await this.uploadAttachmentsToDrive(dto.attachments, userId);
    const userMsg = this.msgRepo.create({
      conversationId: conv.id,
      role: 'user',
      content: rawMessage,
      attachments: processedAttachments,
    });
    await this.msgRepo.save(userMsg);

    // Load recent history (last 8 messages)
    const history = await this.loadRecentHistory(conv.id, 8);

    const startTime = Date.now();
    const aiResult = await this.geminiService.generateResponse(
      userId,
      rawMessage,
      history,
      dto.attachments,
    );
    const durationMs = Date.now() - startTime;

    // Save assistant message to database
    const assistantMsg = this.msgRepo.create({
      conversationId: conv.id,
      role: 'assistant',
      content: aiResult.content,
      model: aiResult.model,
      durationMs,
    });
    const savedMsg = await this.msgRepo.save(assistantMsg);

    // Update conversation timestamp
    conv.updatedAt = new Date();
    await this.convRepo.save(conv);

    return {
      conversationId: conv.id,
      messageId: savedMsg.id,
      content: savedMsg.content,
      model: aiResult.model,
      createdAt: savedMsg.createdAt,
    };
  }

  /**
   * Streaming chat processing generator with Gemini AI.
   */
  async *processStreamMessage(
    userId: number | null,
    dto: SendMessageDto,
  ): AsyncIterable<StreamChunkResult & { conversationId: number }> {
    const rawMessage =
      dto.message?.trim() ||
      (dto.attachments?.length
        ? `[Đính kèm ${dto.attachments.length} tệp/ảnh: ${dto.attachments.map((a) => a.name).join(', ')}]`
        : 'Xin chào');

    this.validateAttachments(dto.attachments);

    const conv = await this.getOrCreateConversation(userId, dto.conversationId, rawMessage);

    const processedAttachments = await this.uploadAttachmentsToDrive(dto.attachments, userId);

    const userMsg = this.msgRepo.create({
      conversationId: conv.id,
      role: 'user',
      content: rawMessage,
      attachments: processedAttachments,
    });
    await this.msgRepo.save(userMsg);

    // Load recent history (last 8 messages)
    const history = await this.loadRecentHistory(conv.id, 8);

    const stream = this.geminiService.generateResponseStream(
      userId,
      rawMessage,
      history,
      dto.attachments,
    );

    let fullContent = '';
    let usedModel = 'gemini-2.5-flash';
    const startTime = Date.now();

    for await (const chunk of stream) {
      if (chunk.content) {
        fullContent += chunk.content;
      }
      if (chunk.model) {
        usedModel = chunk.model;
      }

      yield {
        ...chunk,
        conversationId: conv.id,
      };
    }

    const durationMs = Date.now() - startTime;

    // Save assistant message in DB once complete
    if (fullContent.trim()) {
      const assistantMsg = this.msgRepo.create({
        conversationId: conv.id,
        role: 'assistant',
        content: fullContent,
        model: usedModel,
        durationMs,
      });
      await this.msgRepo.save(assistantMsg);

      conv.updatedAt = new Date();
      await this.convRepo.save(conv);
    }
  }

  /**
   * Loads recent messages for conversational context
   */
  private async loadRecentHistory(
    conversationId: number,
    limit = 8,
  ): Promise<ChatHistoryMessage[]> {
    const history = await this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return history.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Uploads user chat attachments to Google Drive in folder `chat-ai-files`.
   */
  private async uploadAttachmentsToDrive(
    attachments: ChatAttachmentDto[] | undefined,
    userId: number | null,
  ): Promise<any[] | null> {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    const savedAttachments: any[] = [];

    for (const att of attachments) {
      try {
        if (att.data && (att.data.startsWith('data:') || !att.data.startsWith('http'))) {
          const rawBase64 = att.data.includes('base64,')
            ? att.data.split('base64,')[1]
            : att.data;
          const fileBuffer = Buffer.from(rawBase64, 'base64');

          const uploadResult = await this.googleDriveService.uploadChatFile(
            fileBuffer,
            att.name || `file_${Date.now()}`,
            att.mimeType || 'application/octet-stream',
            userId || undefined,
          );

          savedAttachments.push({
            name: att.name,
            mimeType: att.mimeType,
            url: uploadResult.directUrl,
            driveFileId: uploadResult.fileId,
            webViewLink: uploadResult.webViewLink,
            size: att.size || fileBuffer.length,
          });
        } else if (att.data && att.data.startsWith('http')) {
          // Already a URL
          savedAttachments.push({
            name: att.name,
            mimeType: att.mimeType,
            url: att.data,
            size: att.size,
          });
        }
      } catch (err: any) {
        this.logger.error(
          `Lỗi upload tệp đính kèm "${att.name}" lên Google Drive: ${err?.message || err}`,
        );
        savedAttachments.push({
          name: att.name,
          mimeType: att.mimeType,
          size: att.size,
          error: 'Upload to Google Drive failed',
        });
      }
    }

    return savedAttachments.length > 0 ? savedAttachments : null;
  }

  /**
   * Validates attachment count and sizes according to production standards.
   */
  private validateAttachments(attachments: ChatAttachmentDto[] | undefined) {
    if (!attachments || attachments.length === 0) return;

    const MAX_COUNT = 5;
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
    const MAX_DOC_BYTES = 10 * 1024 * 1024;
    const MAX_BATCH_BYTES = 30 * 1024 * 1024;

    if (attachments.length > MAX_COUNT) {
      throw new BadRequestException(
        `Chỉ được đính kèm tối đa ${MAX_COUNT} tệp trong một lần gửi (hiện có ${attachments.length} tệp).`,
      );
    }

    let totalBytes = 0;

    for (const att of attachments) {
      let fileSize = att.size;
      if (!fileSize && att.data) {
        const rawBase64 = att.data.includes('base64,') ? att.data.split('base64,')[1] : att.data;
        fileSize = Math.round((rawBase64.length * 3) / 4);
      }
      fileSize = fileSize || 0;
      totalBytes += fileSize;

      const isImage = att.mimeType?.startsWith('image/');
      const isVideo = att.mimeType?.startsWith('video/');

      if (isImage && fileSize > MAX_IMAGE_BYTES) {
        throw new BadRequestException(
          `Hình ảnh "${att.name || 'ảnh'}" vượt quá giới hạn 10MB (hiện tại ${(fileSize / (1024 * 1024)).toFixed(1)}MB). Vui lòng chọn ảnh nhỏ hơn.`,
        );
      }

      if (isVideo && fileSize > MAX_VIDEO_BYTES) {
        throw new BadRequestException(
          `Video "${att.name || 'video'}" vượt quá giới hạn 20MB (hiện tại ${(fileSize / (1024 * 1024)).toFixed(1)}MB). Vui lòng nén video hoặc gửi clip ngắn hơn.`,
        );
      }

      if (!isImage && !isVideo && fileSize > MAX_DOC_BYTES) {
        throw new BadRequestException(
          `Tệp tài liệu "${att.name || 'tệp'}" vượt quá giới hạn 10MB (hiện tại ${(fileSize / (1024 * 1024)).toFixed(1)}MB).`,
        );
      }
    }

    if (totalBytes > MAX_BATCH_BYTES) {
      throw new BadRequestException(
        `Tổng dung lượng các tệp đính kèm vượt quá 30MB (hiện tại ${(totalBytes / (1024 * 1024)).toFixed(1)}MB). Vui lòng giảm bớt tệp trước khi gửi.`,
      );
    }
  }
}
