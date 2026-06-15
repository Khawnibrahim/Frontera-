import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { AppErrors } from '../common/errors/app-errors';
import { rethrowAsHttp } from '../common/errors/to-http.exception';
import { TOKENS } from '../config/tokens';
import { DocumentDownloadService } from '../documents/document-download.service';
import type { IAwsS3Gateway } from '../repository/aws/s3.interface';
import type { IProviderSchedulingRepository } from '../repository/persistence/interface';

const MAX_PACR_BYTES = 10 * 1024 * 1024;
const ALLOWED_PACR_MIME = new Set(['application/pdf']);

@Injectable()
export class ProviderDocumentsService {
  constructor(
    @Inject(TOKENS.ProviderSchedulingRepository)
    private readonly repo: IProviderSchedulingRepository,
    @Inject(TOKENS.S3Gateway)
    private readonly s3: IAwsS3Gateway,
    private readonly config: ConfigService,
    private readonly documentDownload: DocumentDownloadService,
  ) {}

  async uploadPacr(
    providerUserId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    try {
      await this.repo.getSchedulingContext(providerUserId);
    } catch (err) {
      rethrowAsHttp(err);
    }

    if (!file?.buffer?.length) {
      throw AppErrors.fileRequired();
    }
    if (file.size > MAX_PACR_BYTES) {
      throw AppErrors.pacrFileTooLarge();
    }
    const mime = file.mimetype?.toLowerCase() ?? '';
    if (!ALLOWED_PACR_MIME.has(mime)) {
      throw AppErrors.pacrMustBePdf();
    }

    const bucket = this.documentDownload.documentsBucket();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_') || 'pacr.pdf';
    const storagePath = `pacr/${providerUserId}/${randomUUID()}-${safeName}`;

    await this.s3.putObject({
      bucket,
      key: storagePath,
      body: file.buffer,
      contentType: mime,
    });

    const { id } = await this.repo.insertPacrDocument({
      providerUserId,
      originalFilename: file.originalname,
      mimeType: mime,
      fileSize: file.size,
      storagePath,
      bucket,
    });

    return { documentId: id };
  }

  async getPacrDownload(providerUserId: string, documentId: string) {
    const meta = await this.repo.findPacrDocumentForProvider(documentId, providerUserId);
    if (!meta) {
      throw AppErrors.pacrDocumentNotFound();
    }
    const { downloadUrl, expiresIn } =
      await this.documentDownload.createPresignedDownloadUrl(meta);
    return {
      documentId: meta.documentId,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      downloadUrl,
      expiresIn,
    };
  }
}
