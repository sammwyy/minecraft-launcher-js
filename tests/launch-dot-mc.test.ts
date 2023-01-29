import { MinecraftLauncher } from '../src';

jest.setTimeout(5 * 60 * 1000);

test('Launch from .minecraft', async () => {
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

  /*
  launcher.on('download_start', (event) => {
    console.log(
      `Starting download assets: ${event.files}, ${event.totalSize / 1024} KB`,
    );
  });

  launcher.on('download_file', (event) => {
    console.log(`Downloading file: ${event.file} (${event.size / 1024} KB)`);
  });

  launcher.on('download_progress', (event) => {
    console.log(
      `Progress: ${event.progress}% | File ${event.progressFiles} of ${
        event.totalFiles
      } | Size ${(event.progressSize / 1024).toFixed(0)}KB / ${(
        event.totalSize / 1024
      ).toFixed(0)}KB`,
    );
  });

  launcher.on('download_end', (event) => {
    console.log(`Finished download: error=${event.error},task=${event.name}`);
  });
  */

  await launcher.prepare();
  await launcher.download();
  await launcher.start();

  expect(launcher.kill()).toBe(true);
});
