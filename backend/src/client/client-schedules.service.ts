import { Inject, Injectable } from '@nestjs/common';
import { rethrowAsHttp } from '../common/errors/to-http.exception';
import { TOKENS } from '../config/tokens';
import type { IClientSchedulesRepository } from '../repository/persistence/interface';
import { assertFirstOfMonth } from '../provider/provider-time.util';

@Injectable()
export class ClientSchedulesService {
  constructor(
    @Inject(TOKENS.ClientSchedulesRepository)
    private readonly repo: IClientSchedulesRepository,
  ) {}

  async list(monthYear: string) {
    try {
      assertFirstOfMonth(monthYear);
      const rows = await this.repo.listOptumSchedules(monthYear);
      rows.sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
      return { monthYear, rows };
    } catch (err) {
      rethrowAsHttp(err);
    }
  }
}
