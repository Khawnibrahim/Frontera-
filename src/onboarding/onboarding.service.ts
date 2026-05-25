import { Injectable } from '@nestjs/common';
import type { CreateProviderDto } from './dto/create-provider.dto';

@Injectable()
export class OnboardingService {
  /**
   * Phase 1 — CorporateOnboardProvider.
   * Create profiles + provider_work_sites + user_roles; issue provider_invites; send invite email.
   */
  async create(_dto: CreateProviderDto): Promise<void> {
    // Not implemented.
  }

  /**
   * Phase 1 — Resend or create invite token for an existing onboarded profile.
   */
  async sendInvite(_providerUserId: string): Promise<void> {
    // Not implemented.
  }
}
