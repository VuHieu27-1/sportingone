import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Res,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BackupRestoreService } from './backup-restore.service';
import { CreateBackupRestoreDto, RestoreBackupDto } from './dto/create-backup-restore.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import type { BufferedFile } from '../../common/google-drive/google-drive.service';

@Controller('backup-restore')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class BackupRestoreController {
  constructor(private readonly backupRestoreService: BackupRestoreService) {}

  @Get('status')
  getStatus() {
    return this.backupRestoreService.getStatus();
  }

  @Post('backup')
  createBackup(@Body() createDto: CreateBackupRestoreDto, @Req() req: any) {
    const adminUser = req.user?.username || req.user?.email || 'Admin';
    return this.backupRestoreService.createBackup({
      ...createDto,
      createdBy: adminUser,
    });
  }

  @Post('restore/:id')
  restore(
    @Param('id', ParseIntPipe) id: number,
    @Body() restoreDto: RestoreBackupDto,
    @Req() req: any,
  ) {
    const adminUser = req.user?.username || req.user?.email || 'Admin';
    return this.backupRestoreService.restoreBackup(id, {
      ...restoreDto,
      executedBy: adminUser,
    });
  }

  @Post('restore-upload')
  @UseInterceptors(FileInterceptor('file'))
  restoreFromUpload(
    @UploadedFile() file: BufferedFile,
    @Body('notes') notes: string,
    @Req() req: any,
  ) {
    const adminUser = req.user?.username || req.user?.email || 'Admin';
    return this.backupRestoreService.restoreFromUploadedZip(file, adminUser, notes);
  }

  @Get('download/:id')
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { filename, buffer } = await this.backupRestoreService.getBackupFileBuffer(id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get()
  findAll() {
    return this.backupRestoreService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.backupRestoreService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.backupRestoreService.remove(id);
  }
}
