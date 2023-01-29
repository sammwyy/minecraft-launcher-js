import checksum from 'checksum';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import {
  ManifestArgument,
  ManifestLibrary,
  VersionManifest,
} from './version-manifest';
import { DownloadTaskFile } from './events/download-task-files';

function mergeArrays(
  arr1: unknown[] | undefined,
  arr2: unknown[] | undefined,
): unknown[] {
  const first = arr1 || [];
  const second = arr2 || [];
  return [...first, ...second];
}

export function mergeManifests(
  parent: VersionManifest,
  child: VersionManifest,
) {
  const result = { ...parent };

  // Merge arguments.
  if (!result.arguments) {
    result.arguments = {};
  }

  result.arguments.game = mergeArrays(
    parent.arguments?.game,
    child.arguments?.game,
  ) as ManifestArgument[];

  result.arguments.jvm = mergeArrays(
    parent.arguments?.jvm,
    child.arguments?.jvm,
  ) as ManifestArgument[];

  // Merge libraries.
  if (!result.libraries) {
    result.libraries = [];
  }

  result.libraries = mergeArrays(
    parent.libraries,
    child.libraries,
  ) as ManifestLibrary[];

  // Merge downloads.
  if (result.downloads && child.downloads?.client) {
    result.downloads.client = child.downloads.client;
  }

  if (result.downloads && child.downloads?.server) {
    result.downloads.server = child.downloads.server;
  }

  // Merge other properties.
  if (child.id) result.id = child.id;
  if (child.javaVersion) result.javaVersion = child.javaVersion;
  if (child.logging) result.logging = child.logging;
  if (child.mainClass) result.mainClass = child.mainClass;
  if (child.minimumLauncherVersion)
    result.minimumLauncherVersion = child.minimumLauncherVersion;
  if (child.releaseTime) result.releaseTime = child.releaseTime;
  if (child.time) result.time = child.time;
  if (child.type) result.type = child.type;

  return result;
}

export function getOS() {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'osx';
    default:
      return 'linux';
  }
}

export function getArch() {
  const arch = process.arch;
  return arch === 'x64' ? 'x64' : 'x86';
}

export function artifactToPath(artifactName: string) {
  const parts = artifactName.split(':');

  const groupId = parts[0];
  const artifactId = parts[1];
  const version = parts[2];
  const fileName = `${artifactId}-${version}.jar`;

  const result = `${groupId.replace(
    /\./g,
    '/',
  )}/${artifactId}/${version}/${fileName}`;
  return result;
}

export function createClasspath(
  libraryRoot: string,
  libraries: ManifestLibrary[],
) {
  const result = [];

  for (const lib of libraries) {
    const libPath = lib.downloads?.artifact?.path || artifactToPath(lib.name);
    const fullPath = path.join(libraryRoot, libPath);
    result.push(fullPath);
  }

  return result.join(getOS() === 'windows' ? ';' : ':');
}

export function createClasspathWithJar(
  libraryRoot: string,
  libraries: ManifestLibrary[],
  jarFile: string,
) {
  const result = createClasspath(libraryRoot, libraries);
  return `${result};` + jarFile;
}

export function getAppdataDir() {
  return (
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? `${process.env.HOME}/Library/Preferences`
      : `${process.env.HOME}/.local/share`)
  );
}

export function getDefaultMcDir() {
  return path.join(getAppdataDir(), '.minecraft');
}

export function asyncChecksum(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    checksum.file(file, (err, hash) => {
      if (err) return reject(err);
      resolve(hash);
    });
  });
}

export function downloadFile(
  file: string,
  url: string,
): Promise<DownloadTaskFile> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const dir = path.join(file, '..');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, '');

    const res = await fetch(url);
    const fileStream = fsSync.createWriteStream(file);
    res.body.pipe(fileStream);
    res.body.on('error', reject);

    fileStream.on('finish', async () => {
      const stat = await fs.stat(file);
      const checksum = await asyncChecksum(file);

      resolve({
        file: path.basename(file),
        path: file,
        sha1: checksum,
        size: stat.size,
      });
    });
  });
}

export async function downloadFileWithRetries(
  file: string,
  url: string,
  retries = 3,
): Promise<DownloadTaskFile> {
  let attemps = 0;
  let lastException: Error | null = null;

  async function tryFetch(): Promise<DownloadTaskFile> {
    let data = await downloadFile(file, url).catch((e) => {
      lastException = e;
      return null;
    });

    if (data == null) {
      attemps++;

      if (attemps < retries) {
        data = await tryFetch();
      } else {
        throw lastException;
      }
    }

    return data;
  }

  return await tryFetch();
}

export async function downloadFileIfNotExist(
  file: string,
  url: string | undefined,
): Promise<DownloadTaskFile | null> {
  if (url && !fsSync.existsSync(file)) {
    return await downloadFile(file, url);
  }

  return null;
}

export async function downloadFileIfNotExistWithRetries(
  file: string,
  url: string | undefined,
  retries = 3,
): Promise<DownloadTaskFile | null> {
  if (url && !fsSync.existsSync(file)) {
    return await downloadFileIfNotExistWithRetries(file, url, retries);
  }

  return null;
}

export function generateNonce() {
  const CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  let counter = 0;
  while (counter < 10) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    counter += 1;
  }
  return result;
}

export function isWhatPercentOf(x: number, y: number) {
  return (x / y) * 100;
}

export function modernizeManifest(manifest: VersionManifest): VersionManifest {
  const result = { ...manifest };

  if (result.minecraftArguments) {
    if (!result.arguments) result.arguments = {};
    result.arguments.jvm = [
      '-cp',
      '${classpath}',
      '-Djava.library.path=${natives_directory}',
      '-Dminecraft.launcher.brand=${launcher_name}',
      '-Dminecraft.launcher.version=${launcher_version}',
    ];

    result.arguments.game = result.minecraftArguments.split(' ');
  }

  return result;
}
