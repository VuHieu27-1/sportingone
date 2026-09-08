import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { NotificationUsersService } from './notification-users.service';
import { CreateNotificationUserDto } from './dto/create-notification-user.dto';
import { UpdateNotificationUserDto } from './dto/update-notification-user.dto';

@Controller('notification-users')
export class NotificationUsersController {
  constructor(private readonly service: NotificationUsersService) {}

  @Post()
  create(@Body() createDto: CreateNotificationUserDto) {
    return this.service.create(createDto);
  }

  /**
   * Retrieves All information, optionally filtered by receiverId.
   */
  @Get()
  findAll(@Query('receiverId') receiverId?: string) {
    return this.service.findAll(receiverId ? +receiverId : undefined);
  }

  /**
   * Marks all notifications of a specific receiver as read.
   */
  @Patch('read-all/:receiverId')
  markAllAsRead(@Param('receiverId') receiverId: string) {
    return this.service.markAllAsRead(+receiverId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNotificationUserDto,
  ) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
