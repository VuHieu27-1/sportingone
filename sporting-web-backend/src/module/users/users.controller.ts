import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserSelfOrAdminGuard } from '../auth/guards/user-self-or-admin.guard';
import type { BufferedFile } from '../../common/google-drive/google-drive.service';

@UseGuards(JwtAuthGuard, UserSelfOrAdminGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@Request() req: any, @UploadedFile() file: BufferedFile) {
    return this.usersService.updateAvatar(req.user.id, file);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  @Post('status-time')
  updateStatusTime(@Request() req: any) {
    return this.usersService.updateStatusTime(req.user.id);
  }

  /**
   * Retrieves AllUsersStatus information.
   */
  @Get('status')
  getAllUsersStatus() {
    return this.usersService.getAllUsersStatus();
  }

  @Get('status/:id')
  getUserStatus(@Param('id') id: string) {
    return this.usersService.getUserStatus(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.usersService.restore(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
