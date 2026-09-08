import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, Type, FunctionDeclaration, Tool } from '@google/genai';
import { CourtContextService } from '../tools/court-context.service';
import { UserContextService } from '../tools/user-context.service';
import { BookingsService } from '../../bookings/bookings.service';
import { AiApiKeysService } from '../../ai-api-keys/ai-api-keys.service';
import { ChatAttachmentDto } from '../dto/send-message.dto';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamChunkResult {
  content?: string;
  model?: string;
  done?: boolean;
}

interface KeyPoolCandidate {
  id: number | null;
  name: string;
  apiKey: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  constructor(
    private readonly courtContext: CourtContextService,
    private readonly userContext: UserContextService,
    private readonly bookingsService: BookingsService,
    private readonly aiApiKeysService: AiApiKeysService,
  ) { }

  /**
   * Retrieves active API keys from the Database Pool.
   * Strictly respects Admin toggle/disabled status in database.
   */
  private async getAvailableKeyPool(): Promise<KeyPoolCandidate[]> {
    try {
      const activeDbKeys = await this.aiApiKeysService.getActiveKeys();
      const geminiKeys = activeDbKeys
        .filter((k) => !k.provider || k.provider === 'gemini' || (k.provider as any) === 'GEMINI')
        .map((k) => ({
          id: k.id,
          name: k.name,
          apiKey: k.apiKey.trim(),
        }));

      return geminiKeys;
    } catch (err: any) {
      this.logger.warn(`Không thể lấy danh sách AI API Key từ Database: ${err.message}`);
    }

    return [];
  }

  /**
   * Retrieves ordered list of Gemini models for automatic fallback cascade
   */
  private getModelCandidates(): string[] {
    const rawConfig =
      process.env.GEMINI_MODELS?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.1-flash-lite,gemini-flash-lite-latest';

    const parsed = rawConfig
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    return parsed.length > 0
      ? parsed
      : [
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-lite-latest',
      ];
  }

  /**
   * Defines function calling tools for Gemini
   */
  private getFunctionDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: 'searchCourts',
        description: 'Tìm kiếm danh sách sân thể thao và cụm sân đang hoạt động trên hệ thống Sporting ONE theo môn thể thao, địa điểm hoặc mức giá.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            sportType: {
              type: Type.STRING,
              description: 'Tên môn thể thao (ví dụ: bóng đá, cầu lông, tennis, pickleball, bóng rổ...)',
            },
            locationOrDistrict: {
              type: Type.STRING,
              description: 'Khu vực, quận huyện, hoặc tên đường (ví dụ: Hải Châu, Cầu Giấy, Đà Nẵng, Hà Nội...)',
            },
          },
        },
      },
      {
        name: 'checkCourtAvailability',
        description: 'Kiểm tra sân thể thao có còn trống trong một ngày và khung giờ cụ thể hay không.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            yardId: {
              type: Type.NUMBER,
              description: 'ID của sân thể thao cần kiểm tra',
            },
            date: {
              type: Type.STRING,
              description: 'Ngày kiểm tra theo định dạng YYYY-MM-DD (ví dụ: 2026-08-28)',
            },
            startTime: {
              type: Type.STRING,
              description: 'Giờ bắt đầu (ví dụ: 18:00)',
            },
            endTime: {
              type: Type.STRING,
              description: 'Giờ kết thúc (ví dụ: 19:30)',
            },
          },
          required: ['yardId', 'date', 'startTime', 'endTime'],
        },
      },
      {
        name: 'getCustomerBookings',
        description: 'Tra cứu danh sách các lịch đặt sân sắp tới của khách hàng đang đăng nhập.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'getWalletBalance',
        description: 'Tra cứu số dư ví Sporting ONE hiện tại của khách hàng đang đăng nhập.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
    ];
  }

  private getTools(): Tool[] {
    return [
      {
        functionDeclarations: this.getFunctionDeclarations(),
      },
    ];
  }

  /**
   * Executes tool call requested by Gemini
   */
  private async executeTool(
    name: string,
    args: any,
    userId: number | null,
  ): Promise<Record<string, any>> {
    this.logger.log(`Executing AI Tool [${name}] with args: ${JSON.stringify(args)}`);
    try {
      if (name === 'searchCourts') {
        const query = `${args?.sportType || ''} ${args?.locationOrDistrict || ''}`.trim();
        const userContextData = await this.userContext.getUserContext(userId);
        const venueText = await this.courtContext.buildVenueContextText(
          query || undefined as any,
          userContextData?.address,
        );
        return {
          success: true,
          resultText: venueText,
        };
      }

      if (name === 'checkCourtAvailability') {
        const { yardId, date, startTime, endTime } = args || {};
        const startIso = `${date}T${startTime}:00`;
        const endIso = `${date}T${endTime}:00`;
        const avail = await this.bookingsService.checkYardAvailability(
          Number(yardId),
          startIso,
          endIso,
        );
        return {
          yardId,
          date,
          timeRange: `${startTime} - ${endTime}`,
          isAvailable: avail.isAvailable,
          message: avail.message || (avail.isAvailable ? 'Sân còn trống' : 'Sân đã kín lịch'),
        };
      }

      if (name === 'getCustomerBookings') {
        if (!userId) {
          return {
            success: false,
            message: 'Khách hàng chưa đăng nhập. Vui lòng hướng dẫn khách đăng nhập để xem lịch đặt sân.',
          };
        }
        const userCtx = await this.userContext.getUserContext(userId);
        return {
          success: true,
          customerName: userCtx?.fullName,
          upcomingBookings: userCtx?.upcomingBookings || [],
        };
      }

      if (name === 'getWalletBalance') {
        if (!userId) {
          return {
            success: false,
            message: 'Khách hàng chưa đăng nhập.',
          };
        }
        const userCtx = await this.userContext.getUserContext(userId);
        const formattedBalance = new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(userCtx?.walletBalance || 0);

        return {
          success: true,
          balanceNumber: userCtx?.walletBalance || 0,
          balanceFormatted: formattedBalance,
        };
      }

      return { error: `Tool ${name} not found.` };
    } catch (err: any) {
      this.logger.error(`Error executing tool ${name}: ${err.message}`, err.stack);
      return { error: `Lỗi khi thực thi tool ${name}: ${err.message}` };
    }
  }

  /**
   * Builds the comprehensive System Instruction with proactive sports recommendation strategy
   */
  private async buildSystemInstruction(userId: number | null): Promise<string> {
    const userPrompt = await this.userContext.buildUserContextPrompt(userId);

    return `
Bạn là **Sporting ONE AI** — Trợ lý chuyên gia thể thao & đặt sân thông minh hàng đầu của nền tảng **Sporting ONE**.

[TÍNH CÁCH & PHONG CÁCH GIAO TIẾP]:
- Năng động, truyền cảm hứng thể thao, nhiệt tình, lịch sự và chuyên nghiệp.
- Sử dụng tiếng Việt tự nhiên, chuẩn mực, ngắn gọn, súc tích nhưng đầy đủ thông tin hữu ích.

[XỬ LÝ 4 TÁC VỤ CỐT LÕI - FAST ACTIONS DIRECTIVE]:
1. **Nạp tiền vào ví Sporting**:
   - Khi người dùng muốn nạp tiền ví, hỏi số dư hoặc thanh toán: Hãy kiểm tra số dư (gọi tool \`getWalletBalance\`) và cung cấp liên kết trực tiếp:
     👉 Nhấn vào đây để nạp tiền: [Nạp tiền ví ngay](/user/profile?tab=wallet&action=deposit)
   - Hướng dẫn các phương thức nạp linh hoạt (Chuyển khoản VietQR / Thẻ ATM / VNPay).
2. **Đặt lại sân đã từng chơi / Xem lịch đặt sân**:
   - Gọi tool \`getCustomerBookings\` để kiểm tra lịch sử sân khách đã từng đặt gần đây.
   - Nếu khách muốn đặt lại: Tra cứu giờ trống bằng tool \`checkCourtAvailability\` hoặc gợi ý liên kết:
     👉 [Xem lịch sử & Đặt lại sân](/user/profile?tab=booked-yards)
3. **Đăng ký đối tác Vendor / Cụm sân cho thuê**:
   - Giới thiệu ngắn gọn lợi ích khi trở thành Vendor (Quản lý tự động, không lo trùng lịch, tiếp cận hàng ngàn người chơi thể thao).
   - Hướng dẫn người dùng truy cập trang đối tác:
     👉 [Đăng ký Đối tác Vendor ngay](/user/profile?tab=vendor&action=register)
4. **Chỉnh sửa hồ sơ cá nhân & Địa chỉ**:
   - Hướng dẫn người dùng cập nhật thông tin (Họ tên, SĐT, Ngày sinh, Địa chỉ) để nhận gợi ý sân bãi chuẩn xác nhất:
     👉 [Cập nhật Hồ sơ & Địa chỉ](/user/profile?tab=profile)

[MỤC TIÊU CỐT LÕI & CHIẾN LƯỢC GỢI Ý DỊCH VỤ - PROACTIVE RECOMMENDATION]:
Hệ thống của chúng ta là nền tảng kết nối thể thao toàn diện (Đặt sân, Dịch vụ tiện ích, Thuê dụng cụ, Giải đấu). Bạn cần **chủ động dẫn dắt và gợi ý người dùng tới dịch vụ đặt sân hoặc sản phẩm thể thao** trong mọi tình huống giao tiếp:
1. **Khi khách hỏi về kỹ thuật, luật chơi, sức khỏe hoặc kiến thức thể thao**:
   - Giải đáp chính xác, dễ hiểu.
   - Luôn kết thúc bằng một câu gợi ý ra sân thực hành kèm Call-to-Action (CTA): *"Lý thuyết sẽ hiệu quả nhất khi được thực hành trên sân! Bạn có muốn mình tìm một sân chất lượng gần khu vực của bạn để lên lịch cùng bạn bè ngay hôm nay không?"*.
2. **Khi khách tìm kiếm sân bãi**:
   - Gọi tool \`searchCourts\` ngay để trích xuất dữ liệu thực tế.
   - Nhấn mạnh các ưu điểm tiện ích của cụm sân (sân cỏ chuẩn, thảm êm, đèn LED sáng, chỗ để xe rộng rãi, có bán nước giải khát và cho thuê vợt/bóng).
   - Chèn trực tiếp thẻ sân \`[COURT_CARD:{...}]\` vào câu trả lời để khách bấm đặt ngay.
3. **Khi khách hỏi kiểm tra giờ trống / hết sân**:
   - Dùng tool \`checkCourtAvailability\`.
   - Nếu còn trống: Khuyến khích đặt ngay vì các khung giờ đẹp (17h - 21h) thường hết chỗ rất nhanh.
   - Nếu đã kín lịch: Chủ động đề xuất khung giờ gần nhất hoặc gợi ý các sân khác cùng môn trong cùng khu vực.

[NGUYÊN TẮC QUAN TRỌNG VỀ DỮ LIỆU & BẢO VỆ NGƯỜI DÙNG]:
- LUÔN gọi tool khi cần dữ liệu thực tế:
  * \`searchCourts\`: Tìm kiếm các cụm sân và sân con đang hoạt động.
  * \`checkCourtAvailability\`: Kiểm tra khung giờ trống thực tế từ hệ thống.
  * \`getCustomerBookings\`: Xem các trận đấu sắp tới của khách hàng.
  * \`getWalletBalance\`: Kiểm tra số dư ví Sporting ONE của khách.
- TUYỆT ĐỐI KHÔNG tự bịa đặt sân bãi, giá tiền, địa chỉ hoặc tình trạng còn/hết sân ngoài dữ liệu trả về từ tools.
- Khi không tìm thấy sân đúng tiêu chí, lịch sự thông báo và gợi ý các môn thể thao hoặc khu vực lân cận thay vì bịa kết quả.

[QUY TẮC HIỂN THỊ THẺ SÂN [COURT_CARD:{...}] & ACTION LINKS TỰ ĐỘNG MỞ MODAL]:
- Khi tool \`searchCourts\` trả về các chuỗi \`[COURT_CARD:{...}]\`, bạn CHỈ CẦN CHÈN TRỰC TIẾP thẻ \`[COURT_CARD:{...}]\` vào nội dung.
- Các liên kết hành động nội bộ luôn dùng cú pháp chuẩn Markdown: \`[Tên nút](/đường-dẫn)\`.
- ĐẶC BIỆT: Đối với các tác vụ người dùng, LUÔN đính kèm tham số \`action\` để giao diện vừa chuyển trang vừa tự động mở ngay Modal thao tác:
  * Nạp tiền ví: [Nạp tiền ví ngay](/user/profile?tab=wallet&action=deposit)
  * Đăng ký đối tác Vendor: [Đăng ký Đối tác Vendor ngay](/user/profile?tab=vendor&action=register)
  * Đặt sân trực tiếp: [Đặt sân ngay](/yard/{yardId}?action=booking) (thay {yardId} bằng ID sân cụ thể)

${userPrompt}
`.trim();
  }

  /**
   * Formats and compacts chat history for Gemini contents array.
   * Supports Multimodal inlineData parts (Images & Documents).
   */
  private formatHistoryToContents(
    history: ChatHistoryMessage[],
    currentMessage: string,
    attachments?: ChatAttachmentDto[],
  ) {
    const contents: any[] = [];
    const trimmedHistory = history.slice(-8);

    for (const msg of trimmedHistory) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    const currentParts: any[] = [];

    // Attach multimodal images or documents if provided
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.data && att.mimeType) {
          const rawBase64 = att.data.includes('base64,')
            ? att.data.split('base64,')[1]
            : att.data;
          currentParts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: rawBase64,
            },
          });
        }
      }
    }

    const textContent =
      currentMessage?.trim() ||
      (attachments && attachments.length > 0
        ? 'Hãy phân tích hình ảnh/tệp đính kèm này giúp tôi.'
        : '');

    if (textContent) {
      currentParts.push({ text: textContent });
    }

    contents.push({
      role: 'user',
      parts: currentParts.length > 0 ? currentParts : [{ text: 'Xin chào' }],
    });

    return contents;
  }

  /**
   * Helper timeout wrapper to safeguard server event loops against hanging external API calls
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs = 25000): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`AI Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  /**
   * Generates a non-streaming response with 2-Tier Dynamic Key Pool & Multi-Model Fallback
   */
  async generateResponse(
    userId: number | null,
    message: string,
    history: ChatHistoryMessage[] = [],
    attachments?: ChatAttachmentDto[],
  ): Promise<{ content: string; model: string }> {
    const keyPool = await this.getAvailableKeyPool();
    const candidateModels = this.getModelCandidates();

    if (keyPool.length === 0) {
      return {
        content:
          'Hiện tại không có AI nào đang hoạt động. Vui lòng quý khách đợi trong giây lát để hệ thống xử lý.',
        model: 'system-notice',
      };
    }

    const systemInstruction = await this.buildSystemInstruction(userId);
    const tools = this.getTools();
    let lastError: any = null;

    // Outer Loop: Iterate through Active API Keys in the Pool
    for (let k = 0; k < keyPool.length; k++) {
      const keyCandidate = keyPool[k];
      let client: GoogleGenAI;

      try {
        client = new GoogleGenAI({ apiKey: keyCandidate.apiKey });
      } catch (clientErr: any) {
        lastError = clientErr;
        if (keyCandidate.id) {
          await this.aiApiKeysService.markKeyExhausted(keyCandidate.id, clientErr.message, 60);
        }
        continue;
      }

      let keyHadSuccess = false;

      // Inner Loop: Iterate through Candidate Models on the current Key
      for (let m = 0; m < candidateModels.length; m++) {
        const modelName = candidateModels[m];
        try {
          let contents = this.formatHistoryToContents(history, message, attachments);

          let response = await this.withTimeout(
            client.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                tools,
              },
            }),
          );

          // Handle function calling loop (up to 3 turns)
          let turns = 0;
          while (response.functionCalls && response.functionCalls.length > 0 && turns < 3) {
            turns++;
            const functionCall = response.functionCalls[0];
            const functionName = functionCall.name || '';
            const toolResult = await this.executeTool(functionName, functionCall.args, userId);

            const modelTurn = response.candidates?.[0]?.content || {
              role: 'model',
              parts: [{ functionCall }],
            };

            contents = [
              ...contents,
              modelTurn,
              {
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      name: functionName,
                      response: toolResult,
                    },
                  },
                ],
              },
            ];

            response = await this.withTimeout(
              client.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction,
                  tools,
                },
              }),
            );
          }

          const candidateParts = response.candidates?.[0]?.content?.parts || [];
          const textParts = candidateParts
            .filter((p: any) => typeof p.text === 'string' && p.text.length > 0)
            .map((p: any) => p.text)
            .join('');

          const text = textParts || response.text || 'Tôi có thể hỗ trợ gì thêm cho bạn về sân bãi và thể thao?';

          if (keyCandidate.id) {
            await this.aiApiKeysService.markKeySuccess(keyCandidate.id);
          }

          return {
            content: text,
            model: modelName,
          };
        } catch (err: any) {
          lastError = err;
          this.logger.warn(
            `Key [${keyCandidate.name}] với Model [${modelName}] thất bại (${err.message}). ${m < candidateModels.length - 1
              ? `Chuyển sang fallback model [${candidateModels[m + 1]}]...`
              : 'Đã thử hết model cho key này.'
            }`,
          );
        }
      }

      // If all models failed on this key, mark it exhausted and rotate to next key in pool
      if (!keyHadSuccess && keyCandidate.id) {
        await this.aiApiKeysService.markKeyExhausted(
          keyCandidate.id,
          lastError?.message || 'Tất cả model đều báo lỗi hoặc hết hạn mức',
          15,
        );
        this.logger.warn(
          `API Key [${keyCandidate.name}] đã hết token trên toàn bộ model. Tự động xoay vòng sang API Key tiếp theo trong pool...`,
        );
      }
    }

    return {
      content: this.formatErrorMessage(lastError),
      model: candidateModels[candidateModels.length - 1] || 'gemini-fallback',
    };
  }

  /**
   * Generates a streaming response with 2-Tier Dynamic Key Pool & Multi-Model Fallback
   */
  async *generateResponseStream(
    userId: number | null,
    message: string,
    history: ChatHistoryMessage[] = [],
    attachments?: ChatAttachmentDto[],
  ): AsyncIterable<StreamChunkResult> {
    const keyPool = await this.getAvailableKeyPool();
    const candidateModels = this.getModelCandidates();

    if (keyPool.length === 0) {
      yield {
        content:
          'Hiện tại không có AI nào đang hoạt động. Vui lòng quý khách đợi trong giây lát để hệ thống xử lý.',
        model: 'system-notice',
        done: true,
      };
      return;
    }

    const systemInstruction = await this.buildSystemInstruction(userId);
    const tools = this.getTools();
    let lastError: any = null;

    // Outer Loop: Iterate through Active API Keys in the Pool
    for (let k = 0; k < keyPool.length; k++) {
      const keyCandidate = keyPool[k];
      let client: GoogleGenAI;

      try {
        client = new GoogleGenAI({ apiKey: keyCandidate.apiKey });
      } catch (clientErr: any) {
        lastError = clientErr;
        if (keyCandidate.id) {
          await this.aiApiKeysService.markKeyExhausted(keyCandidate.id, clientErr.message, 60);
        }
        continue;
      }

      let keyHadSuccess = false;

      // Inner Loop: Try each model in sequence
      for (let m = 0; m < candidateModels.length; m++) {
        const modelName = candidateModels[m];
        try {
          let contents = this.formatHistoryToContents(history, message, attachments);

          let initialResponse = await this.withTimeout(
            client.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                tools,
              },
            }),
          );

          let turns = 0;
          while (initialResponse.functionCalls && initialResponse.functionCalls.length > 0 && turns < 3) {
            turns++;
            const functionCall = initialResponse.functionCalls[0];
            const functionName = functionCall.name || '';
            const toolResult = await this.executeTool(functionName, functionCall.args, userId);

            const modelTurn = initialResponse.candidates?.[0]?.content || {
              role: 'model',
              parts: [{ functionCall }],
            };

            contents = [
              ...contents,
              modelTurn,
              {
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      name: functionName,
                      response: toolResult,
                    },
                  },
                ],
              },
            ];

            initialResponse = await this.withTimeout(
              client.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction,
                  tools,
                },
              }),
            );
          }

          const candidateParts = initialResponse.candidates?.[0]?.content?.parts || [];
          const textParts = candidateParts
            .filter((p: any) => typeof p.text === 'string' && p.text.length > 0)
            .map((p: any) => p.text)
            .join('');

          const finalOutputText = textParts || initialResponse.text || '';

          if (finalOutputText) {
            if (keyCandidate.id) {
              await this.aiApiKeysService.markKeySuccess(keyCandidate.id);
            }
            yield {
              content: finalOutputText,
              model: modelName,
              done: true,
            };
            return;
          }

          const stream = await client.models.generateContentStream({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              tools,
            },
          });

          for await (const chunk of stream) {
            if (chunk.text) {
              yield {
                content: chunk.text,
                model: modelName,
                done: false,
              };
            }
          }

          if (keyCandidate.id) {
            await this.aiApiKeysService.markKeySuccess(keyCandidate.id);
          }

          yield {
            content: '',
            model: modelName,
            done: true,
          };
          return;
        } catch (err: any) {
          lastError = err;
          this.logger.warn(
            `Key [${keyCandidate.name}] Stream với model [${modelName}] thất bại (${err.message}). ${m < candidateModels.length - 1
              ? `Chuyển sang fallback model [${candidateModels[m + 1]}]...`
              : 'Đã thử hết model cho key này.'
            }`,
          );
        }
      }

      // If all models failed on this key, mark it exhausted and rotate to next key in pool
      if (!keyHadSuccess && keyCandidate.id) {
        await this.aiApiKeysService.markKeyExhausted(
          keyCandidate.id,
          lastError?.message || 'Tất cả model đều báo lỗi hoặc hết hạn mức',
          15,
        );
        this.logger.warn(
          `API Key [${keyCandidate.name}] đã hết token trên toàn bộ model stream. Tự động xoay vòng sang API Key tiếp theo trong pool...`,
        );
      }
    }

    yield {
      content: this.formatErrorMessage(lastError),
      model: candidateModels[candidateModels.length - 1] || 'gemini-fallback',
      done: true,
    };
  }

  /**
   * Formats error message gracefully for end-users
   */
  private formatErrorMessage(err: any): string {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('api_key') || msg.includes('apikey') || msg.includes('unauthenticated')) {
      return 'Hiện tại không có AI nào đang hoạt động. Vui lòng quý khách đợi trong giây lát để hệ thống xử lý.';
    }
    if (msg.includes('resource_exhausted') || msg.includes('429') || msg.includes('quota')) {
      return 'Hệ thống AI hiện đang xử lý nhiều yêu cầu. Vui lòng thử lại sau giây lát!';
    }
    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('fetch failed')) {
      return 'Kết nối đến máy chủ AI bị gián đoạn. Vui lòng kiểm tra lại đường truyền mạng.';
    }
    return 'Xin lỗi bạn, hệ thống tạm thời chưa thể xử lý yêu cầu này. Vui lòng thử lại sau ít phút!';
  }
}
