import { MinecraftLauncher } from '../src';

jest.setTimeout(5 * 60 * 1000);

test('API Query', async () => {
  const launcher = new MinecraftLauncher({
    authentication: {
      name: 'Player',
    },
    memory: {
      max: 2048,
      min: 1024,
    },
    version: {
      number: '1.19.3',
      type: 'release',
    },
  });

  launcher.on('download_task_start', (event) => {
    console.log(
      `Starting download assets: ${event.files}, ${event.totalSize / 1024} KB`,
    );
  });

  launcher.on('download_task_file', (event) => {
    console.log(`Downloading file: ${event.file} (${event.size / 1024} KB)`);
  });

  launcher.on('download_task_progress', (event) => {
    console.log(
      `Progress: ${event.progress}% | File ${event.progressFiles} of ${
        event.totalFiles
      } | Size ${(event.progressSize / 1024).toFixed(0)}KB / ${(
        event.totalSize / 1024
      ).toFixed(0)}KB`,
    );
  });

  launcher.on('download_task_end', (event) => {
    console.log(`Finished download: error=${event.error},task=${event.name}`);
  });

  await launcher.prepare();
  await launcher.download();
  await launcher.start();

  expect(true).toBe(true);
});
