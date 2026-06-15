import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HolidaysListResponseDto, HolidaysQueryDto } from './dto/holidays-response.dto';
import { HolidaysService } from './holidays.service';

@ApiTags('Holidays')
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly service: HolidaysService) {}

  @Get()
  @ApiOperation({ summary: 'Optum clinic closure dates' })
  @ApiOkResponse({ type: HolidaysListResponseDto })
  list(@Query() query: HolidaysQueryDto) {
    return this.service.list(query);
  }
}
