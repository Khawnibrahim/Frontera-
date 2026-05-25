import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProviderDto } from './dto/create-provider.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Admin — Onboarding')
@Controller('admin/onboarding')
export class AdminOnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @ApiOperation({
    summary: 'Onboard a new provider',
    description: 'Phase 1 — CorporateOnboardProvider; not implemented.',
  })
  create(@Body() dto: CreateProviderDto) {
    return this.onboardingService.create(dto);
  }

  @Post(':userId/invite')
  @ApiOperation({
    summary: 'Send provider portal invite',
    description: 'Phase 1 — invite email + accept-invite flow; not implemented.',
  })
  sendInvite(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.onboardingService.sendInvite(userId);
  }
}
