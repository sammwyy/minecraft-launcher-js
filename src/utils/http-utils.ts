import fs from 'node:fs/promises';
import path from 'path';
import { setTimeout as delay } from 'timers/promises';


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
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, '');
  const res = await retryFetch(url);
  const buffer = await res.arrayBuffer();
  await fs.writeFile(file, Buffer.from(buffer));
}

export async function downloadFileIfNotExist(
  file: string,
  url: string | undefined,
): Promise<boolean> {
  if (url && !fs.access(file)) {
    await downloadFile(file, url);
    return true;
  }

  return false;
}
