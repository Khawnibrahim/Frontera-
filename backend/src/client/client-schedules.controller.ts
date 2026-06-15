import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClientSchedulesService } from './client-schedules.service';
import {
  ClientSchedulesQueryDto,
  ClientSchedulesResponseDto,
} from './dto/client-schedules-response.dto';

@ApiTags('Client')
@Roles('client_user', 'admin', 'internal_staff')
@Controller('client/schedules')
export class ClientSchedulesController {
  constructor(private readonly service: ClientSchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Optum provider schedules for a month (client portal)' })
  @ApiOkResponse({ type: ClientSchedulesResponseDto })
  list(@Query() query: ClientSchedulesQueryDto) {
    return this.service.list(query.monthYear);
  }
}
