import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../../../environments/environment';
import { AttachmentModelDTO } from '../api/generated/model/attachment-model-dto';

interface S3UploadResult {
  Key: string;
  Location: string;
  Bucket: string;
  ETag: string;
  contentType: string;
  orignalFileName: string;
}

export interface FileWrapper {
  file?: { rawFile: File };
  fileURL?: string;
}

@Injectable({ providedIn: 'root' })
export class AwsService {
  private readonly http = inject(HttpClient);
  private readonly bucket: AWS.S3;

  uploadResults: S3UploadResult[] = [];
  isUploading = false;
  error: unknown = null;

  constructor() {
    AWS.config.update({
      accessKeyId: environment.r2.accessKeyId,
      secretAccessKey: environment.r2.secretAccessKey,
      region: 'auto',
    });
    this.bucket = new AWS.S3({
      accessKeyId: environment.r2.accessKeyId,
      secretAccessKey: environment.r2.secretAccessKey,
      region: 'auto',
      endpoint: environment.r2.endpoint,
      s3ForcePathStyle: true,
    });
  }

  replaceFileNameWithGUID(file: File): File {
    const extension = file.name.split('.').pop();
    const newName = extension ? `${uuidv4()}.${extension}` : uuidv4();
    return new File([file], newName, { type: file.type });
  }

  async prepareUploadFile(files: File[]): Promise<S3UploadResult[]> {
    return Promise.all(
      files.map((originalFile) => {
        const newFile = this.replaceFileNameWithGUID(originalFile);
        const contentType = originalFile.type;

        return new Promise<S3UploadResult>((resolve, reject) => {
          this.bucket.upload(
            {
              Bucket: environment.r2.bucket,
              Key: newFile.name,
              Body: newFile,
              ACL: 'public-read',
              ContentType: contentType,
            },
            (err, data) => {
              if (err) {
                reject(err);
                return;
              }
              resolve({
                ...data,
                contentType,
                orignalFileName: originalFile.name,
              } as S3UploadResult);
            },
          );
        });
      }),
    );
  }

  async uploadFilesCloudFlare(files: File[]): Promise<void> {
    this.isUploading = true;
    this.error = null;
    try {
      const results = await Promise.all(
        files.map((file) => this.prepareUploadFile([file])),
      );
      this.uploadResults = results.flat();
    } catch (err) {
      this.error = err;
      throw err;
    } finally {
      this.isUploading = false;
    }
  }

  async uploadAsync(formData: {
    fileName: string;
    fileUploadName: string;
    ContentType: string;
  }): Promise<AttachmentModelDTO> {
    const response = await firstValueFrom(
      this.http.post<AttachmentModelDTO>(
        `${environment.apiBaseUrl}/api/Upload/PrepareUploadedFile`,
        formData,
      ),
    );
    console.log('[AwsService] AttachmentModelDTO received:', response);
    return response;
  }

  async uploadFileToB12(files: FileWrapper[]): Promise<AttachmentModelDTO[]> {
    const alreadyUploaded = files.filter((f) => f.fileURL) as AttachmentModelDTO[];
    const newFiles = files
      .filter((f) => f.file?.rawFile)
      .map((f) => f.file!.rawFile);

    if (newFiles.length) {
      await this.uploadFilesCloudFlare(newFiles);
    }

    const newAttachments = await Promise.all(
      this.uploadResults.map((result) =>
        this.uploadAsync({
          fileName: result.orignalFileName,
          fileUploadName: result.Key,
          ContentType: result.contentType,
        }),
      ),
    );

    return [...alreadyUploaded, ...newAttachments];
  }
}
