import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TournamentTeamsService } from './tournament-teams.service';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
import { UpdateTournamentTeamDto } from './dto/update-tournament-team.dto';

@Controller('tournament-teams')
export class TournamentTeamsController {
  constructor(private readonly service: TournamentTeamsService) {}

  @Post()
  create(@Body() createDto: CreateTournamentTeamDto) {
    return this.service.create(createDto);
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTournamentTeamDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
