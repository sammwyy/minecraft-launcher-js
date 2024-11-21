import { MinecraftLauncher } from '../src';

test('Installation check', async () => {
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

  await launcher.prepare();
  expect(await launcher.isDownloaded()).toBeDefined();
});
