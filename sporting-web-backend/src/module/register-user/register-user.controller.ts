import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserService } from './register-user.service';
import { CreateRegisterUserDto } from './dto/create-register-user.dto';
import { UpdateRegisterUserDto } from './dto/update-register-user.dto';
import { VerifyRegisterUserDto } from './dto/verify-register-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';

@Controller('register-user')
export class RegisterUserController {
  constructor(private readonly registerUserService: RegisterUserService) {}

  @Post()
  create(@Body() createRegisterUserDto: CreateRegisterUserDto) {
    return this.registerUserService.create(createRegisterUserDto);
  }

  @Post('verify')
  verifyEmail(@Body() verifyRegisterUserDto: VerifyRegisterUserDto) {
    return this.registerUserService.verifyEmail(verifyRegisterUserDto);
  }

  @Get('verify-link')
  verifyEmailLink(
    @Query('email') email: string,
    @Query('token') token: string,
  ) {
    return this.registerUserService.verifyEmail({ email, token });
  }

  /**
   * Retrieves All information (Admin only).
   */
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Get()
  findAll() {
    return this.registerUserService.findAll();
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.registerUserService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRegisterUserDto: UpdateRegisterUserDto,
  ) {
    return this.registerUserService.update(id, updateRegisterUserDto);
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.registerUserService.remove(id);
  }
}
