import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
import fs from 'graceful-fs';
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
export async function downloadFile(file: string, url: string): Promise<void> {
  const dir = path.join(file, '..');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, '');
  const res = await retryFetch(url);
  const buffer = await res.buffer();
  fs.writeFileSync(file, buffer);
}

export async function downloadFileIfNotExist(
  file: string,
  url: string | undefined,
): Promise<boolean> {
  if (url && !fs.existsSync(file)) {
    await downloadFile(file, url);
    return true;
  }

  return false;
}
