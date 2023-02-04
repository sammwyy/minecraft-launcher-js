import path from 'path';
import LauncherOptions from '../launcher-options';
import { getDefaultMcDir } from './path-utils';
import { getOS } from './system-utils';

const DEF_OPTS: LauncherOptions = {
  authentication: {
    name: 'Player',
  },
  brand: {
    name: 'minecraft-launcher-js',
    version: '0.0.1',
  },
  fixLog4JExploit: true,
  javaPath: 'java',
  memory: { max: 0, min: 0 },
  urls: {
    libraries: 'https://libraries.minecraft.net',
    meta: 'https://launchermeta.mojang.com',
    resources: 'https://resources.download.minecraft.net',
  },
  version: {
    number: '1.19.3',
    type: 'release',
  },
  window: {
    fullscreen: false,
    height: 480,
    width: 720,
  },
};

export function withDefaultOpts(userOptions: LauncherOptions) {
  const options = { ...DEF_OPTS, ...userOptions };

  // Prepare options.
  if (!options.os) options.os = getOS();

  // Prepare directories.
  if (!options.gameRoot) options.gameRoot = getDefaultMcDir();
  const root = options.gameRoot;

  if (!options.assetsRoot) options.assetsRoot = path.join(root, 'assets');

  if (!options.libraryRoot) options.libraryRoot = path.join(root, 'libraries');

  if (!options.nativesRoot) options.nativesRoot = path.join(root, 'natives');

  if (!options.versionRoot && !options.jsonFile) {
    options.versionRoot = path.join(root, 'versions');
  }

  // Prepare version files.
  const { version, versionRoot } = options;
  const versionId = version.number;

  if (versionRoot) {
    if (!options.jarFile) {
      const file = path.join(versionRoot, versionId, `${versionId}.jar`);
      options.jarFile = file;
    }

    if (!options.jsonFile && versionRoot) {
      const file = path.join(versionRoot, versionId, `${versionId}.json`);
      options.jsonFile = file;
    }
  }

  return options;
}
