import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GroupTeamsService } from './group-teams.service';
import { CreateGroupTeamDto } from './dto/create-group-team.dto';
import { UpdateGroupTeamDto } from './dto/update-group-team.dto';

@Controller('group-teams')
export class GroupTeamsController {
  constructor(private readonly service: GroupTeamsService) {}

  @Post()
  create(@Body() createDto: CreateGroupTeamDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGroupTeamDto,
  ) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
