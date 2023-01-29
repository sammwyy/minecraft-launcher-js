export interface DownloadTaskFile {
  file: string;
  path: string;
  sha1: string;
  size: number;
  task?: string;
}
