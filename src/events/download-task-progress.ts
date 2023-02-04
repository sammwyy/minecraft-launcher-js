export interface DownloadTaskProgress {
  lastFile?: string;
  progress: number;
  progressFiles: number;
  progressSize: number;
  totalFiles: number;
  totalSize: number;
  task?: string;
}
