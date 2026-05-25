import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Main')
@Controller()
export class MainController {
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'frontera-scheduling-api' },
      },
    },
  })
  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'frontera-scheduling-api' };
  }
}
