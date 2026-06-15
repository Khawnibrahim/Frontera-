import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '../config/tokens';
import type { IHolidaysRepository } from '../repository/persistence/interface';
import type { HolidaysQueryDto } from './dto/holidays-response.dto';

@Injectable()
export class HolidaysService {
  constructor(
    @Inject(TOKENS.HolidaysRepository)
    private readonly repo: IHolidaysRepository,
  ) {}

  async list(query: HolidaysQueryDto) {
    const items = await this.repo.list(query.from, query.to);
    return { items };
  }
}
