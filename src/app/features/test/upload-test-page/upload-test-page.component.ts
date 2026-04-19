import { Component, inject, signal } from '@angular/core';
import { AwsService, FileWrapper } from '../../../core/services/aws.service';
import { AttachmentModelDTO } from '../../../core/api/generated/model/attachment-model-dto';

type LogEntry = {
  timestamp: string;
  level: 'info' | 'success' | 'error';
  message: string;
  data?: unknown;
};

@Component({
  selector: 'app-upload-test-page',
  standalone: true,
  templateUrl: './upload-test-page.component.html',
  styleUrl: './upload-test-page.component.css',
})
export class UploadTestPageComponent {
  private readonly aws = inject(AwsService);

  readonly selectedFiles = signal<File[]>([]);
  readonly isUploading = signal(false);
  readonly s3Results = signal<unknown[]>([]);
  readonly attachments = signal<AttachmentModelDTO[]>([]);
  readonly logs = signal<LogEntry[]>([]);

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.selectedFiles.set(files);
    this.log('info', `Selected ${files.length} file(s)`, files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
    })));
  }

  async upload(): Promise<void> {
    const files = this.selectedFiles();
    if (!files.length) {
      this.log('error', 'No files selected');
      return;
    }

    this.isUploading.set(true);
    this.log('info', 'Starting upload flow (S3 -> PrepareUploadedFile)');

    try {
      const wrappers: FileWrapper[] = files.map((rawFile) => ({
        file: { rawFile },
      }));

      const attachments = await this.aws.uploadFileToB12(wrappers);

      this.s3Results.set([...this.aws.uploadResults]);
      this.attachments.set(attachments);

      console.log('[UploadTest] S3 upload results:', this.aws.uploadResults);
      console.log('[UploadTest] AttachmentModelDTO list:', attachments);

      this.log('success', 'S3 upload results', this.aws.uploadResults);
      this.log('success', 'AttachmentModelDTO from backend', attachments);
    } catch (err) {
      console.error('[UploadTest] Upload failed:', err);
      this.log('error', 'Upload failed', err instanceof Error ? { message: err.message, stack: err.stack } : err);
    } finally {
      this.isUploading.set(false);
    }
  }

  clear(): void {
    this.selectedFiles.set([]);
    this.s3Results.set([]);
    this.attachments.set([]);
    this.logs.set([]);
  }

  private log(level: LogEntry['level'], message: string, data?: unknown): void {
    this.logs.update((entries) => [
      ...entries,
      { timestamp: new Date().toISOString(), level, message, data },
    ]);
  }

  stringify(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
