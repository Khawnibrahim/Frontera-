import { Injectable } from '@nestjs/common';
import type { UploadDocumentDto } from '../scheduling/dto/upload-document.dto';

@Injectable()
export class DocumentsService {
  /**
   * Phase 2 — Register documents row; link time_off_requests.pacr_document_id.
   */
  async registerUpload(_dto: UploadDocumentDto): Promise<void> {
    // Not implemented.
  }

  /**
   * Phase 2 / 3 — Presigned GET for corporate PACR download.
   */
  async getDownloadUrl(_id: string): Promise<void> {
    // Not implemented.
  }
}
