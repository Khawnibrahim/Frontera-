import { ApiProperty } from '@nestjs/swagger';

export class PacrDocumentDownloadDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ description: 'S3 presigned GET URL' })
  downloadUrl!: string;

  @ApiProperty({ description: 'Seconds until the presigned URL expires', example: 300 })
  expiresIn!: number;
}
