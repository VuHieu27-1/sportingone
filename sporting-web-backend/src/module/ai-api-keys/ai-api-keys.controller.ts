import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AiApiKeysService } from './ai-api-keys.service';
import { CreateAiApiKeyDto } from './dto/create-ai-api-key.dto';
import { UpdateAiApiKeyDto } from './dto/update-ai-api-key.dto';
import { TestAiApiKeyDto } from './dto/test-ai-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';

@Controller('ai-api-keys')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class AiApiKeysController {
  constructor(private readonly aiApiKeysService: AiApiKeysService) {}

  @Get('metrics')
  getMetrics() {
    return this.aiApiKeysService.getMetrics();
  }

  @Post('test')
  testKey(@Body() dto: TestAiApiKeyDto) {
    return this.aiApiKeysService.testApiKey(dto.apiKey, dto.provider);
  }

  @Post()
  create(@Body() createDto: CreateAiApiKeyDto) {
    return this.aiApiKeysService.create(createDto);
  }

  @Get()
  findAll() {
    return this.aiApiKeysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.aiApiKeysService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAiApiKeyDto,
  ) {
    return this.aiApiKeysService.update(id, updateDto);
  }

  @Patch(':id/toggle')
  toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.aiApiKeysService.toggleStatus(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.aiApiKeysService.remove(id);
  }
}
