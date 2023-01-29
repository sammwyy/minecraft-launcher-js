export interface DownloadTaskProgress {
  progress: number;
  progressFiles: number;
  progressSize: number;
  totalFiles: number;
  totalSize: number;
  task?: string;
}
