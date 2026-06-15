import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppErrors } from '../../common/errors/app-errors';
import { ConfigService } from '@nestjs/config';
import { DocumentDownloadService } from '../../documents/document-download.service';
import { TOKENS } from '../../config/tokens';
import type { IAwsSesGateway } from '../../repository/aws/ses.interface';
import type {
  IScheduleChangeApprovalsRepository,
  ScheduleChangeApprovalsFilters,
  ScheduleChangeRequestRow,
} from '../../repository/persistence/interface';
import {
  formatIsoDate,
  parseMonthYear,
} from '../../repository/persistence/utils/master-availability.util';
import {
  ALLOWED_SCHEDULE_CHANGE_COMPANIES,
  buildProviderMonthGroups,
  buildScheduleChangeCalendarWeeks,
  dedupeLatestPerProviderDate,
} from '../../repository/persistence/utils/schedule-change-approvals.util';
import {
  assertEndAfterStart,
  parseClockLabelToDbTime,
} from '../../provider/provider-time.util';
import type {
  ApproveScheduleChangeDto,
  BulkScheduleChangeDecisionDto,
  DenyScheduleChangeDto,
} from './dto/schedule-change-decision.dto';
import type {
  ScheduleChangeApprovalsListQueryDto,
  ScheduleChangeApprovalsQueryDto,
} from './dto/schedule-change-approvals-query.dto';

@Injectable()
export class ScheduleChangeApprovalsService {
  private readonly logger = new Logger(ScheduleChangeApprovalsService.name);

  constructor(
    @Inject(TOKENS.ScheduleChangeApprovalsRepository)
    private readonly repository: IScheduleChangeApprovalsRepository,
    @Inject(TOKENS.SesGateway)
    private readonly sesGateway: IAwsSesGateway,
    private readonly config: ConfigService,
    private readonly documentDownload: DocumentDownloadService,
  ) {}

  getFilterOptions(company: string) {
    this.assertCompany(company);
    return this.repository.getFilterOptions(company);
  }

  async getSummary(query: ScheduleChangeApprovalsQueryDto) {
    const filters = this.toFilters(query);
    const pendingCount = await this.repository.countPending(filters);
    return { pendingCount };
  }

  async getList(query: ScheduleChangeApprovalsListQueryDto) {
    const filters = this.toFilters(query);
    const dateRange = this.resolveDateRange(query.monthYear);
    const raw = await this.repository.listRequests(filters, dateRange);
    const rows = dedupeLatestPerProviderDate(raw);

    const weeklyScheduleByProvider = new Map<string, unknown>();
    for (const row of rows) {
      if (!weeklyScheduleByProvider.has(row.providerUserId)) {
        weeklyScheduleByProvider.set(row.providerUserId, row.weeklySchedule);
      }
    }

    let groups = buildProviderMonthGroups(rows, weeklyScheduleByProvider);

    if (query.pendingOnly) {
      groups = groups
        .map((g) => ({
          ...g,
          days: g.days.filter((d) => d.status === 'pending_review'),
        }))
        .filter((g) => g.pendingCount > 0 && g.days.length > 0);
    }

    const pendingCount = await this.repository.countPending(filters);

    return {
      company: filters.company,
      pendingCount,
      groups: groups.map((g) => ({
        ...g,
        days: g.days.map((d) => this.toPublicDay(d)),
      })),
    };
  }

  async getCalendar(query: ScheduleChangeApprovalsQueryDto) {
    const filters = this.toFilters(query);
    const monthYear = query.monthYear ?? this.defaultMonthYear();
    const { start, end } = parseMonthYear(monthYear);
    const raw = await this.repository.listRequests(filters, { start, end });
    const rows = dedupeLatestPerProviderDate(raw);
    return buildScheduleChangeCalendarWeeks(monthYear, rows);
  }

  async getRequest(id: string) {
    const row = await this.repository.findRequestById(id);
    if (!row) {
      throw AppErrors.scheduleChangeNotFound();
    }
    return this.toPublicDay(row);
  }

  async getPacrDocument(requestId: string) {
    const request = await this.repository.findRequestById(requestId);
    if (!request) {
      throw AppErrors.scheduleChangeNotFound();
    }
    if (!request.pacrDocumentId) {
      throw AppErrors.noPacrAttached();
    }
    const doc = await this.repository.findPacrDocument(requestId);
    if (!doc) {
      throw AppErrors.pacrRecordNotFound();
    }
    const { downloadUrl, expiresIn } =
      await this.documentDownload.createPresignedDownloadUrl(doc);
    return {
      documentId: doc.documentId,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      downloadUrl,
      expiresIn,
    };
  }

  async approve(id: string, body: ApproveScheduleChangeDto) {
    if (body.adjustHours && (!body.startTime || !body.endTime)) {
      throw AppErrors.adjustHoursTimesRequired();
    }

    let startTime = body.startTime;
    let endTime = body.endTime;
    if (body.adjustHours) {
      assertEndAfterStart(body.startTime!, body.endTime!);
      startTime = parseClockLabelToDbTime(body.startTime!);
      endTime = parseClockLabelToDbTime(body.endTime!);
    }

    const updated = await this.repository.approveRequest(id, {
      reviewedBy: body.reviewedBy,
      reviewNotes: body.reviewNotes,
      adjustHours: body.adjustHours,
      startTime,
      endTime,
    });
    if (!updated) {
      throw AppErrors.pendingScheduleChangeNotFound();
    }

    const notification = await this.notifyProvider(updated, 'approved', body.reviewNotes);
    return {
      request: this.toPublicDay(updated),
      notification,
    };
  }

  async deny(id: string, body: DenyScheduleChangeDto) {
    const updated = await this.repository.denyRequest(id, {
      reviewedBy: body.reviewedBy,
      reviewNotes: body.reviewNotes,
    });
    if (!updated) {
      throw AppErrors.pendingScheduleChangeNotFound();
    }

    const notification = await this.notifyProvider(updated, 'denied', body.reviewNotes);
    return {
      request: this.toPublicDay(updated),
      notification,
    };
  }

  async bulkDecide(body: BulkScheduleChangeDecisionDto) {
    if (body.decision === 'denied' && !body.reviewNotes?.trim()) {
      throw AppErrors.bulkDenyNotesRequired();
    }

    const result = await this.repository.bulkDecide(body.requestIds, body.decision, {
      reviewedBy: body.reviewedBy,
      reviewNotes: body.reviewNotes,
    });

    const notificationErrors: string[] = [];
    let notificationsSent = 0;

    for (const requestId of result.updatedIds) {
      const row = await this.repository.findRequestById(requestId);
      if (!row?.providerEmail) continue;
      try {
        const sent = await this.notifyProvider(
          row,
          body.decision === 'approved' ? 'approved' : 'denied',
          body.reviewNotes,
        );
        if (sent.sent) notificationsSent++;
        if (sent.error) notificationErrors.push(`${requestId}: ${sent.error}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Notification failed';
        notificationErrors.push(`${requestId}: ${msg}`);
      }
    }

    return {
      ...result,
      notificationsSent,
      notificationErrors,
    };
  }

  private toFilters(
    query: ScheduleChangeApprovalsQueryDto,
  ): ScheduleChangeApprovalsFilters {
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
      !ALLOWED_SCHEDULE_CHANGE_COMPANIES.includes(
        company as (typeof ALLOWED_SCHEDULE_CHANGE_COMPANIES)[number],
      )
    ) {
      throw AppErrors.invalidCompany(ALLOWED_SCHEDULE_CHANGE_COMPANIES);
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
    const now = new Date();
    const start = formatIsoDate(new Date(now.getFullYear(), now.getMonth() - 6, 1));
    const end = formatIsoDate(new Date(now.getFullYear(), now.getMonth() + 13, 0));
    return { start, end };
  }

  private toPublicDay(row: ScheduleChangeRequestRow) {
    const { weeklySchedule: _ws, createdAt, ...rest } = row;
    return {
      ...rest,
      submittedAt: createdAt.toISOString(),
    };
  }

  private async notifyProvider(
    row: ScheduleChangeRequestRow,
    decision: 'approved' | 'denied',
    reviewNotes?: string,
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    const email = row.providerEmail?.trim();
    if (!email) {
      return { sent: false, error: 'Provider has no email on file' };
    }

    try {
      const appUrl = this.config.get<string>('FRONTERA_APP_URL')?.replace(/\/$/, '');
      const availabilityUrl = appUrl ? `${appUrl}/availability` : undefined;
      const verb = decision === 'approved' ? 'approved' : 'denied';
      const dateLabel = row.requestDate;
      const timePart = row.timeLabel ? ` (${row.timeLabel})` : '';
      const notesPart = reviewNotes?.trim() ? `\n\nReviewer note: ${reviewNotes.trim()}` : '';
      const linkPart = availabilityUrl
        ? `\n\nView your availability: ${availabilityUrl}`
        : '';

      const subject = `Schedule change ${verb} — ${dateLabel}`;
      const textBody =
        `Your schedule change request for ${dateLabel}${timePart} was ${verb}.` +
        notesPart +
        linkPart;
      const htmlBody = `<p>Your schedule change request for <strong>${dateLabel}</strong>${timePart} was <strong>${verb}</strong>.</p>` +
        (reviewNotes?.trim() ? `<p>Reviewer note: ${reviewNotes.trim()}</p>` : '') +
        (availabilityUrl
          ? `<p><a href="${availabilityUrl}">View your availability</a></p>`
          : '');

      const result = await this.sesGateway.sendEmail({
        to: [email],
        subject,
        textBody,
        htmlBody,
      });
      return { sent: true, messageId: result.messageId };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to send email';
      this.logger.warn(`Provider notification failed for ${row.requestId}: ${error}`);
      return { sent: false, error };
    }
  }
}
