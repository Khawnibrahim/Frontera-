import { Inject, Injectable } from '@nestjs/common';
import { AppErrors } from '../../common/errors/app-errors';
import { TOKENS } from '../../config/tokens';
import type {
  IPrnAvailabilityRepository,
  PrnAvailabilityFilters,
} from '../../repository/persistence/interface';
import {
  formatIsoDate,
  parseMonthYear,
} from '../../repository/persistence/utils/master-availability.util';
import {
  ALLOWED_PRN_AVAILABILITY_COMPANIES,
  buildPrnAvailabilityCalendar,
  buildPrnQueueGroups,
  dedupeLatestPrnDays,
} from '../../repository/persistence/utils/prn-availability.util';
import type {
  PrnAvailabilityQueueQueryDto,
  PrnAvailabilityQueryDto,
} from './dto/prn-availability-query.dto';

@Injectable()
export class PrnAvailabilityService {
  constructor(
    @Inject(TOKENS.PrnAvailabilityRepository)
    private readonly repository: IPrnAvailabilityRepository,
  ) {}

  getFilterOptions(company: string) {
    this.assertCompany(company);
    return this.repository.getFilterOptions(company);
  }

  async getSummary(query: PrnAvailabilityQueryDto) {
    const filters = this.toFilters(query);
    const pendingCount = await this.repository.countPendingSubmissions(filters);
    return { pendingCount };
  }

  async getQueue(query: PrnAvailabilityQueueQueryDto) {
    const filters = this.toFilters(query);
    const dateRange = this.resolveDateRange(query.monthYear);

    const [monthlyRows, rawDays] = await Promise.all([
      this.repository.listMonthlySubmissions(filters, dateRange),
      this.loadDaysForRange(filters, dateRange),
    ]);

    const days = dedupeLatestPrnDays(rawDays);
    let groups = buildPrnQueueGroups(monthlyRows, days);

    if (query.pendingOnly) {
      groups = groups.filter(
        (g) =>
          g.monthlyStatus === 'submitted' ||
          g.pendingDayCount > 0,
      );
    }

    const pendingCount = await this.repository.countPendingSubmissions(filters);

    return {
      company: filters.company,
      pendingCount,
      groups,
    };
  }

  async getCalendar(query: PrnAvailabilityQueryDto) {
    const filters = this.toFilters(query);
    const monthYear = query.monthYear ?? this.defaultMonthYear();
    const { start, end } = parseMonthYear(monthYear);
    const rawDays = await this.repository.listDaysInRange(filters, start, end);
    const days = dedupeLatestPrnDays(rawDays);
    return buildPrnAvailabilityCalendar(monthYear, days);
  }

  private async loadDaysForRange(
    filters: PrnAvailabilityFilters,
    dateRange?: { start: string; end: string },
  ) {
    if (dateRange) {
      return this.repository.listDaysInRange(filters, dateRange.start, dateRange.end);
    }
    const now = new Date();
    const start = formatIsoDate(new Date(now.getFullYear(), now.getMonth() - 6, 1));
    const end = formatIsoDate(new Date(now.getFullYear(), now.getMonth() + 13, 0));
    return this.repository.listDaysInRange(filters, start, end);
  }

  private toFilters(query: PrnAvailabilityQueryDto): PrnAvailabilityFilters {
    this.assertCompany(query.company);
    return {
      company: query.company,
      monthYear: query.monthYear,
      liaisonIds: query.liaisonIds,
      regions: query.regions,
      q: query.q,
    };
  }

  private assertCompany(company: string): void {
    if (
      !ALLOWED_PRN_AVAILABILITY_COMPANIES.includes(
        company as (typeof ALLOWED_PRN_AVAILABILITY_COMPANIES)[number],
      )
    ) {
      throw AppErrors.invalidCompany(ALLOWED_PRN_AVAILABILITY_COMPANIES);
    }
  }

  private defaultMonthYear(): string {
    const now = new Date();
    return formatIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  private resolveDateRange(monthYear?: string): { start: string; end: string } | undefined {
    if (monthYear) {
      return parseMonthYear(monthYear);
    }
    return undefined;
  }
}
