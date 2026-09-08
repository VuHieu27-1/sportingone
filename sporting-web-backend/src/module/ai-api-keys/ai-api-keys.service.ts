import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { AiApiKey, AiKeyStatus, AiProvider } from './entities/ai-api-key.entity';
import { CreateAiApiKeyDto } from './dto/create-ai-api-key.dto';
import { UpdateAiApiKeyDto } from './dto/update-ai-api-key.dto';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiApiKeysService implements OnModuleInit {
  private readonly logger = new Logger(AiApiKeysService.name);

  constructor(
    @InjectRepository(AiApiKey)
    private readonly aiApiKeyRepository: Repository<AiApiKey>,
  ) { }

  async onModuleInit() {
    await this.syncEnvKeysToDatabase();
  }

  async syncEnvKeysToDatabase(): Promise<void> {
    try {
      const rawKeys = [
        process.env.GEMINI_API_KEY?.trim() || '',
        ...(process.env.GEMINI_API_KEYS?.split(',') || []),
      ]
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const uniqueEnvKeys = Array.from(new Set(rawKeys));
      if (uniqueEnvKeys.length === 0) return;

      for (let i = 0; i < uniqueEnvKeys.length; i++) {
        const key = uniqueEnvKeys[i];
        const existing = await this.aiApiKeyRepository.findOne({
          where: { apiKey: key },
        });

        if (!existing) {
          const name =
            uniqueEnvKeys.length === 1
              ? 'Primary API Key'
              : `API Key #${i + 1}`;

          const newKey = this.aiApiKeyRepository.create({
            name,
            apiKey: key,
            provider: AiProvider.GEMINI,
            status: AiKeyStatus.ACTIVE,
            priority: i + 1,
            note: 'Tự động đồng bộ từ biến môi trường',
          });

          await this.aiApiKeyRepository.save(newKey);
          this.logger.log(`[AI Key Pool] Đã tự động nạp API Key từ .env vào Database: [${name}]`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`[AI Key Pool] Lỗi khi đồng bộ API Key từ .env: ${err.message}`);
    }
  }

  /**
   * Retrieves all API Keys ordered by Priority and Creation date
   */
  async findAll(): Promise<AiApiKey[]> {
    await this.syncEnvKeysToDatabase();
    await this.autoRecoverCooldownKeys();
    return this.aiApiKeyRepository.find({
      order: {
        priority: 'ASC',
        id: 'ASC',
      },
    });
  }

  /**
   * Retrieves a single API Key by ID
   */
  async findOne(id: number): Promise<AiApiKey> {
    const key = await this.aiApiKeyRepository.findOne({ where: { id } });
    if (!key) {
      throw new NotFoundException(`Không tìm thấy AI API Key với ID ${id}`);
    }
    return key;
  }

  /**
   * Creates a new API Key in the pool
   */
  async create(createDto: CreateAiApiKeyDto): Promise<AiApiKey> {
    const trimmedKey = createDto.apiKey.trim();
    if (!trimmedKey) {
      throw new BadRequestException('Mã API Key không được để trống');
    }

    const newKey = this.aiApiKeyRepository.create({
      ...createDto,
      apiKey: trimmedKey,
      provider: createDto.provider || AiProvider.GEMINI,
      status: createDto.status || AiKeyStatus.ACTIVE,
      priority: createDto.priority || 1,
    });

    return this.aiApiKeyRepository.save(newKey);
  }

  /**
   * Updates an existing API Key
   */
  async update(id: number, updateDto: UpdateAiApiKeyDto): Promise<AiApiKey> {
    const existing = await this.findOne(id);

    if (updateDto.apiKey) {
      updateDto.apiKey = updateDto.apiKey.trim();
    }

    Object.assign(existing, updateDto);
    return this.aiApiKeyRepository.save(existing);
  }

  /**
   * Deletes an API Key from the database
   */
  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const existing = await this.findOne(id);
    await this.aiApiKeyRepository.remove(existing);
    return {
      success: true,
      message: `Đã xóa thành công API Key [${existing.name}]`,
    };
  }

  /**
   * Toggles active / disabled status for an API Key
   */
  async toggleStatus(id: number): Promise<AiApiKey> {
    const existing = await this.findOne(id);
    existing.status = existing.status === AiKeyStatus.ACTIVE ? AiKeyStatus.DISABLED : AiKeyStatus.ACTIVE;
    if (existing.status === AiKeyStatus.ACTIVE) {
      existing.cooldownUntil = null;
      existing.lastErrorMessage = null;
    }
    return this.aiApiKeyRepository.save(existing);
  }

  /**
   * Automatically recovers keys whose cooldown period has expired
   */
  async autoRecoverCooldownKeys(): Promise<void> {
    try {
      const now = new Date();
      const expiredCooldownKeys = await this.aiApiKeyRepository.find({
        where: {
          status: AiKeyStatus.COOLDOWN,
          cooldownUntil: LessThanOrEqual(now),
        },
      });

      if (expiredCooldownKeys.length > 0) {
        for (const key of expiredCooldownKeys) {
          key.status = AiKeyStatus.ACTIVE;
          key.cooldownUntil = null;
          key.lastErrorMessage = null;
          await this.aiApiKeyRepository.save(key);
          this.logger.log(`Tự động khôi phục trạng thái active cho API Key ID [${key.id} - ${key.name}] sau cooldown`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi khi tự động khôi phục cooldown keys: ${err.message}`);
    }
  }

  /**
   * Returns active API Keys ordered by Priority for AI Engine rotation
   */
  async getActiveKeys(): Promise<AiApiKey[]> {
    await this.autoRecoverCooldownKeys();
    return this.aiApiKeyRepository.find({
      where: { status: AiKeyStatus.ACTIVE },
      order: {
        priority: 'ASC',
        usageCount: 'ASC',
        id: 'ASC',
      },
    });
  }

  /**
   * Marks an API key as exhausted
   */
  async markKeyExhausted(id: number, errorMessage: string, cooldownMinutes = 15): Promise<void> {
    try {
      const key = await this.aiApiKeyRepository.findOne({ where: { id } });
      if (key) {
        const now = new Date();
        key.status = AiKeyStatus.COOLDOWN;
        key.lastExhaustedAt = now;
        key.cooldownUntil = new Date(now.getTime() + cooldownMinutes * 60 * 1000);
        key.errorCount = (key.errorCount || 0) + 1;
        key.lastErrorMessage = errorMessage.substring(0, 1000);
        await this.aiApiKeyRepository.save(key);
        this.logger.warn(`Đã chuyển API Key ID [${key.id} - ${key.name}] sang cooldown ${cooldownMinutes} phút do lỗi: ${errorMessage}`);
      }
    } catch (err: any) {
      this.logger.error(`Lỗi khi đánh dấu key exhausted ID ${id}: ${err.message}`);
    }
  }

  /**
   * Increments usage counter and updates lastUsedAt for a successful AI call
   */
  async markKeySuccess(id: number): Promise<void> {
    try {
      await this.aiApiKeyRepository.increment({ id }, 'usageCount', 1);
      await this.aiApiKeyRepository.update({ id }, { lastUsedAt: new Date() });
    } catch (err: any) {
      this.logger.error(`Lỗi khi cập nhật usage count ID ${id}: ${err.message}`);
    }
  }

  /**
   * Live test an API Key with Google Gemini API to verify validity and latency
   */
  async testApiKey(
    apiKey: string,
    provider = 'gemini',
  ): Promise<{
    valid: boolean;
    latencyMs?: number;
    model?: string;
    message: string;
    details?: any;
  }> {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      return {
        valid: false,
        message: 'Mã API Key không được để trống',
      };
    }

    // 1. Google Gemini Live Test
    if (provider.toLowerCase() === 'gemini') {
      const startTime = Date.now();
      try {
        const aiClient = new GoogleGenAI({ apiKey: trimmedKey });
        const testModels = [
          'gemini-3.5-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.6-flash',
          'gemini-3.1-flash-lite',
          'gemini-flash-lite-latest',
        ];

        let successModel = '';
        let lastErr: any = null;

        for (const model of testModels) {
          try {
            const resp = await aiClient.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: 'Ping test. Trả lời "OK".' }] }],
            });

            if (resp && (resp.text || resp.candidates?.length)) {
              successModel = model;
              break;
            }
          } catch (mErr: any) {
            lastErr = mErr;
          }
        }

        const latencyMs = Date.now() - startTime;

        if (successModel) {
          return {
            valid: true,
            latencyMs,
            model: successModel,
            message: `API Key hợp lệ! Độ trễ: ${latencyMs}ms trên model [${successModel}]`,
          };
        }

        return {
          valid: false,
          latencyMs,
          message: `Kiểm tra thất bại: ${lastErr?.message || 'Không thể kết nối đến Google API'}`,
          details: lastErr?.message,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return {
          valid: false,
          latencyMs,
          message: `Lỗi xác thực Key: ${err?.message || 'Khóa không hợp lệ'}`,
          details: err?.message,
        };
      }
    }

    // 2. Groq LPU Live Test (Free & Ultra Fast)
    if (provider.toLowerCase() === 'groq') {
      const startTime = Date.now();
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${trimmedKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Ping test. Reply OK.' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - startTime;
        const data = await res.json().catch(() => ({}));

        if (res.ok && data?.choices?.[0]?.message?.content) {
          return {
            valid: true,
            latencyMs,
            model: 'llama-3.3-70b-versatile',
            message: `Groq API Key hợp lệ và siêu nhanh! Độ trễ: ${latencyMs}ms trên [llama-3.3-70b]`,
          };
        }

        return {
          valid: false,
          latencyMs,
          message: `Lỗi Groq API (${res.status}): ${data?.error?.message || 'Key không hợp lệ hoặc hết hạn'}`,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return {
          valid: false,
          latencyMs,
          message: `Không thể kết nối đến Groq API: ${err?.message || 'Lỗi mạng'}`,
        };
      }
    }

    // 3. OpenAI Live Test
    if (provider.toLowerCase() === 'openai') {
      const startTime = Date.now();
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${trimmedKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Ping test' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - startTime;
        const data = await res.json().catch(() => ({}));

        if (res.ok && data?.choices?.[0]?.message?.content) {
          return {
            valid: true,
            latencyMs,
            model: 'gpt-4o-mini',
            message: `OpenAI API Key hợp lệ! Độ trễ: ${latencyMs}ms trên [gpt-4o-mini]`,
          };
        }

        return {
          valid: false,
          latencyMs,
          message: `Lỗi OpenAI API (${res.status}): ${data?.error?.message || 'Key không hợp lệ hoặc hết hạn mức'}`,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return {
          valid: false,
          latencyMs,
          message: `Không thể kết nối đến OpenAI: ${err?.message}`,
        };
      }
    }

    // 4. DeepSeek AI Live Test
    if (provider.toLowerCase() === 'deepseek') {
      const startTime = Date.now();
      try {
        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${trimmedKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: 'Ping test' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - startTime;
        const data = await res.json().catch(() => ({}));

        if (res.ok && data?.choices?.[0]?.message?.content) {
          return {
            valid: true,
            latencyMs,
            model: 'deepseek-chat',
            message: `DeepSeek API Key hợp lệ! Độ trễ: ${latencyMs}ms trên [deepseek-chat]`,
          };
        }

        return {
          valid: false,
          latencyMs,
          message: `Lỗi DeepSeek API (${res.status}): ${data?.error?.message || 'Key không hợp lệ'}`,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return {
          valid: false,
          latencyMs,
          message: `Không thể kết nối đến DeepSeek: ${err?.message}`,
        };
      }
    }

    // 5. Anthropic Claude Live Test
    if (provider.toLowerCase() === 'anthropic') {
      const startTime = Date.now();
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': trimmedKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            messages: [{ role: 'user', content: 'Ping test' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - startTime;
        const data = await res.json().catch(() => ({}));

        if (res.ok && data?.content?.[0]?.text) {
          return {
            valid: true,
            latencyMs,
            model: 'claude-3-5-haiku',
            message: `Claude API Key hợp lệ! Độ trễ: ${latencyMs}ms trên [claude-3-5-haiku]`,
          };
        }

        return {
          valid: false,
          latencyMs,
          message: `Lỗi Anthropic API (${res.status}): ${data?.error?.message || 'Key không hợp lệ'}`,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return {
          valid: false,
          latencyMs,
          message: `Không thể kết nối đến Anthropic: ${err?.message}`,
        };
      }
    }

    return {
      valid: true,
      message: `Đã lưu API Key cho nhà cung cấp [${provider}]`,
    };
  }

  /**
   * Returns overview metrics for the AI API Key Pool
   */
  async getMetrics(): Promise<{
    totalKeys: number;
    activeKeys: number;
    cooldownKeys: number;
    disabledKeys: number;
    totalUsage: number;
    totalErrors: number;
  }> {
    await this.autoRecoverCooldownKeys();
    const all = await this.aiApiKeyRepository.find();

    const totalKeys = all.length;
    const activeKeys = all.filter((k) => k.status === 'active').length;
    const cooldownKeys = all.filter((k) => k.status === 'cooldown').length;
    const disabledKeys = all.filter((k) => k.status === 'disabled' || k.status === 'error').length;
    const totalUsage = all.reduce((sum, k) => sum + (k.usageCount || 0), 0);
    const totalErrors = all.reduce((sum, k) => sum + (k.errorCount || 0), 0);

    return {
      totalKeys,
      activeKeys,
      cooldownKeys,
      disabledKeys,
      totalUsage,
      totalErrors,
    };
  }
}
