import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../common/errors/error-codes';
import {
  DocumentDownloadService,
  PACR_DOWNLOAD_URL_TTL_SECONDS,
} from './document-download.service';

describe('DocumentDownloadService', () => {
  const s3 = {
    getSignedDownloadUrl: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'DOCUMENTS_BUCKET' ? 'frontera-dev-secure-documents' : undefined,
    ),
  };

  let service: DocumentDownloadService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentDownloadService(s3 as never, config as unknown as ConfigService);
  });

  it('returns a presigned URL for S3-backed documents', async () => {
    s3.getSignedDownloadUrl.mockResolvedValue('https://s3.example/pacr.pdf');

    const result = await service.createPresignedDownloadUrl({
      documentId: 'doc-1',
      fileName: 'completed-PACR.pdf',
      mimeType: 'application/pdf',
      storagePath: 'pacr/user-1/file.pdf',
      bucket: 'frontera-dev-secure-documents',
    });

    expect(result).toEqual({
      downloadUrl: 'https://s3.example/pacr.pdf',
      expiresIn: PACR_DOWNLOAD_URL_TTL_SECONDS,
    });
    expect(s3.getSignedDownloadUrl).toHaveBeenCalledWith({
      bucket: 'frontera-dev-secure-documents',
      key: 'pacr/user-1/file.pdf',
      expiresInSeconds: 300,
      responseContentDisposition: 'inline; filename="completed-PACR.pdf"',
    });
  });

  it('rejects legacy Supabase Storage bucket names', async () => {
    await expect(
      service.createPresignedDownloadUrl({
        documentId: 'doc-1',
        fileName: 'PACR.pdf',
        mimeType: 'application/pdf',
        storagePath: 'org/user/file.pdf',
        bucket: 'secure-documents',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.DOCUMENT_LEGACY_STORAGE });

    expect(s3.getSignedDownloadUrl).not.toHaveBeenCalled();
  });
});
