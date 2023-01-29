import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// Fetching
const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve(null), ms));

export const retryFetch = (
  url: RequestInfo,
  fetchOptions?: RequestInit,
  retries = 5,
  retryDelay = 1000,
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const wrapper = (n: number) => {
      fetch(url, fetchOptions)
        .then((res) => resolve(res))
        .catch(async (err) => {
          if (n > 0) {
            await delay(retryDelay);
            wrapper(--n);
          } else {
            reject(err);
          }
        });
    };

    wrapper(retries);
  });
};

// Download
export function downloadFile(
  file: string,
  url: string,
  onStartDownload?: () => void | null,
): Promise<void> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const dir = path.join(file, '..');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, '');

    if (onStartDownload) onStartDownload();

    const res = await retryFetch(url);
    const fileStream = fsSync.createWriteStream(file);
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

export async function downloadFileIfNotExist(
  file: string,
  url: string | undefined,
): Promise<boolean> {
  if (url && !fsSync.existsSync(file)) {
    await downloadFile(file, url);
    return true;
  }

  return false;
}
