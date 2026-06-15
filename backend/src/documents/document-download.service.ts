import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppErrors } from '../common/errors/app-errors';
import { TOKENS } from '../config/tokens';
import type { IAwsS3Gateway } from '../repository/aws/s3.interface';
import type { PacrDocumentMeta } from '../repository/persistence/interface';

/** Matches Supabase `file-download` edge function TTL. */
export const PACR_DOWNLOAD_URL_TTL_SECONDS = 300;

@Injectable()
export class DocumentDownloadService {
  constructor(
    @Inject(TOKENS.S3Gateway) private readonly s3: IAwsS3Gateway,
    private readonly config: ConfigService,
  ) {}

  documentsBucket(): string {
    return this.config.get<string>('DOCUMENTS_BUCKET') ?? 'frontera-dev-secure-documents';
  }

  async createPresignedDownloadUrl(
    meta: PacrDocumentMeta,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    this.assertS3Backed(meta);
    const expiresIn = PACR_DOWNLOAD_URL_TTL_SECONDS;
    const downloadUrl = await this.s3.getSignedDownloadUrl({
      bucket: meta.bucket,
      key: meta.storagePath,
      expiresInSeconds: expiresIn,
      responseContentDisposition: `inline; filename="${sanitizeFilename(meta.fileName)}"`,
    });
    return { downloadUrl, expiresIn };
  }

  private assertS3Backed(meta: PacrDocumentMeta): void {
    if (meta.bucket !== this.documentsBucket()) {
      throw AppErrors.documentLegacyStorage();
    }
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/["\r\n]/g, '_').trim() || 'PACR.pdf';
}
