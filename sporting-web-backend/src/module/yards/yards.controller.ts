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
  Req,
} from '@nestjs/common';
import { YardsService } from './yards.service';
import { CreateYardDto } from './dto/create-yard.dto';
import { UpdateYardDto } from './dto/update-yard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { YardSelfOrAdminGuard } from '../auth/guards/yard-self-or-admin.guard';

@Controller('yards')
export class YardsController {
  constructor(private readonly service: YardsService) { }

  @UseGuards(JwtAuthGuard, YardSelfOrAdminGuard)
  @Post()
  create(@Body() createDto: CreateYardDto) {
    return this.service.create(createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMyYards(@Req() req: any) {
    return this.service.findMyYards(req.user.id);
  }

  @Get('vendor/:id')
  findYardByVendor(@Param('id') id: string) {
    return this.service.findYardByVendor(+id);
  }

  /**
   * Retrieves courts (yards) sorted by vendor distance (ASC) -> court ID (ASC).
   * Optional query params: lat, lng (or latitude, longitude).
   */
  @Get('by-distance')
  findYardsSortedByVendorDistance(
    @Req() req: any,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    let userId: number | undefined = req.user?.id;
    if (!userId) {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
          if (payload && (payload.sub || payload.id)) {
            userId = Number(payload.sub || payload.id);
          }
        } catch {
          // Ignore token parse errors
        }
      }
    }

    return this.service.findYardsSortedByVendorDistance({
      lat,
      lng,
      latitude,
      longitude,
      userId,
    });
  }

  /**
   * Dedicated API for Admin & Vendor to paginate Yards with SQL LIMIT & OFFSET
   */
  @Get('query')
  findAdminVendorPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('vendorId') vendorId?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAdminVendorPaginated({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 8,
      vendorId: vendorId ? parseInt(vendorId, 10) : undefined,
      userId: userId ? parseInt(userId, 10) : undefined,
      search,
    });
  }

  /**
   * Retrieves All information.
   */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, YardSelfOrAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateYardDto) {
    return this.service.update(+id, updateDto);
  }

  @UseGuards(JwtAuthGuard, YardSelfOrAdminGuard)
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @UseGuards(JwtAuthGuard, YardSelfOrAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
