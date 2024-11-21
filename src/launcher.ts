import * as child from 'child_process';
import fs from 'node:fs/promises';
import path from 'path';

import Emitter from './events/emitter';
import { LauncherError } from './launcher-error';
import LauncherOptions from './launcher-options';
import { Manifest } from './manifest';
import { RemoteVersionManifest } from './remote_version_manifest';
import { formatArgs, validateArg } from './utils/args-utils';
import { downloadFile, downloadFileIfNotExist } from './utils/http-utils';
import {
  findRemoteVersionInManifest,
  getManifestFromSettings,
} from './utils/manifest-utils';
import { withDefaultOpts } from './utils/options-utils';
import { artifactToPath } from './utils/path-utils';
import { validateAllRules } from './utils/rules-utils';

function isWhatPercentOf(x: number, y: number) {
  return (x / y) * 100;
}

export default interface DownloadEntry {
  hash: string;
  name: string;
  path: string;
  size: number;
  url: string;
}

export class MinecraftLauncher extends Emitter {
  private instance: child.ChildProcessWithoutNullStreams | null;
  private manifest: Manifest | null;
  private options: LauncherOptions;

  constructor(options: LauncherOptions) {
    super();
    this.instance = null;
    this.manifest = null;
    this.options = withDefaultOpts(options);
  }

  async prepare() {
    // Make directories if not exist.
    await fs.mkdir(this.options.assetsRoot as string, { recursive: true });
    await fs.mkdir(this.options.libraryRoot as string, { recursive: true });
    await fs.mkdir(this.options.nativesRoot as string, { recursive: true });
    if (this.options.versionRoot) {
      const { versionRoot } = this.options;
      await fs.mkdir(versionRoot as string, { recursive: true });
    }
  }

  getManifest(): Manifest | null {
    if (!this.manifest) {
      this.manifest = getManifestFromSettings(this.options);
    }

    return this.manifest;
  }

  createCommand() {
    const manifest = this.getManifest();
    if (!manifest) {
      throw new LauncherError(
        'errors.manifest-not-downloaded-yet',
        "Manifest file isn't downloaded yet.",
      );
    }

    const args = [];

    args.push('-XX:-UseAdaptiveSizePolicy');
    args.push('-XX:-OmitStackTraceInFastThrow');
    args.push('-Dfml.ignorePatchDiscrepancies=true');
    args.push('-Dfml.ignoreInvalidMinecraftCertificates=true');
    args.push(`-Xmx${this.options.memory.max}M`);
    args.push(`-Xms${this.options.memory.min}M`);

    if (this.options.fixLog4JExploit) {
      const rawVersionNum = this.options.version.number.split('.')[1];
      const versionNum = parseInt(rawVersionNum);
      if (versionNum <= 17) {
        args.push('-Dlog4j2.formatMsgNoLookups=true');
      }
    }

    for (const javaArg of manifest.arguments?.jvm || []) {
      args.push(...validateArg(this.options, javaArg));
    }

    args.push(manifest.mainClass);

    for (const gameArg of manifest.arguments?.game || []) {
      args.push(...validateArg(this.options, gameArg));
    }

    return formatArgs(this.options, manifest, args);
  }

  async startDownloadTask(taskName: string, pendingFiles: DownloadEntry[]) {
    let totalSize = 0;
    let downloadedSize = 0;
    let downloadedFiles = 0;

    const files = pendingFiles.filter(async (f) => {
      if (!fs.access(f.path)) {
        totalSize += f.size;
        return true;
      } else {
        const stat = await fs.stat(f.path);
        if (stat.size == 0) {
          totalSize += f.size;
          return true;
        }
        return false;
      }
    });

    this.emit('download_start', {
      files: files.length,
      name: taskName,
      totalSize: totalSize,
    });

    const tasks = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const launcher = this;

    for (const file of files) {
      tasks.push(
        // eslint-disable-next-line no-async-promise-executor
        new Promise(async (resolve) => {
          async function task() {
            await downloadFile(file.path, file.url);

            downloadedSize += file.size;
            downloadedFiles++;

            launcher.emit('download_progress', {
              lastFile: file.name,
              progress: isWhatPercentOf(downloadedSize, totalSize),
              progressFiles: downloadedFiles,
              progressSize: downloadedSize,
              totalFiles: files.length,
              totalSize: totalSize,
              task: taskName,
            });

            resolve(null);
          }

          task();
        }),
      );
    }

    await Promise.all(tasks);
    this.emit('download_end', { name: taskName });
  }

  isLibrariesDownloaded(manifest: Manifest) {
    const librariesRoot = this.options.libraryRoot as string;

    for (const lib of manifest.libraries || []) {
      const artifact = lib.downloads?.artifact;

      if (artifact) {
        const file = artifact.path || artifactToPath(artifact.id || lib.name);
        const filePath = path.join(librariesRoot, file);
        const rulesValid = validateAllRules(this.options, lib.rules);

        if (rulesValid && !fs.access(filePath)) {
          return false;
        }
      }
    }

    return true;
  }

  async isAssetsDownloaded(manifest: Manifest) {
    const assetRoot = this.options.assetsRoot as string;
    const assetId = manifest.assetIndex?.id || manifest.assets;
    const indexes = path.join(assetRoot, 'indexes', `${assetId}.json`);

    if (!fs.access(indexes)) {
      return false;
    }

    const indexRaw = await fs.readFile(indexes, { encoding: 'utf-8' });
    const index = JSON.parse(indexRaw);

    for (const fileName in index.objects) {
      const file = index.objects[fileName];
      const hash = file.hash;
      const subHash = hash.substring(0, 2);
      const subAsset = path.join(assetRoot, 'objects', subHash, hash);

      if (!fs.access(subAsset)) {
        return false;
      }
    }

    return true;
  }

  isManifestDownloaded() {
    if (!this.options.jsonFile) {
      throw new LauncherError(
        'errors.no-json-specified',
        'No json file or versionRoot specified.',
      );
    }
    return fs.access(this.options.jsonFile);
  }

  async isDownloaded() {
    const manifest = this.getManifest();
    return (
      manifest &&
      await this.isAssetsDownloaded(manifest) &&
      this.isLibrariesDownloaded(manifest)
    );
  }

  async downloadAssets(manifest: Manifest) {
    const assetRoot = this.options.assetsRoot as string;
    const assetsUrl = manifest.assetIndex?.url;
    const assetId = manifest.assetIndex?.id || manifest.assets;
    const indexes = path.join(assetRoot, 'indexes', `${assetId}.json`);
    await downloadFileIfNotExist(indexes, assetsUrl);

    const indexRaw = await fs.readFile(indexes, { encoding: 'utf-8' });
    const index = JSON.parse(indexRaw);
    const download_queue: DownloadEntry[] = [];

    for (const fileName in index.objects) {
      const file = index.objects[fileName];
      const fileSize = file.size;
      const hash = file.hash;
      const subHash = hash.substring(0, 2);
      const subAsset = path.join(assetRoot, 'objects', subHash, hash);

      download_queue.push({
        hash: hash,
        name: fileName,
        path: subAsset,
        size: fileSize,
        url: `${this.options.urls?.resources}/${subHash}/${hash}`,
      });
    }

    await this.startDownloadTask('assets', download_queue);
  }

  async downloadJarFile(manifest: Manifest) {
    const jarFile = this.options.jarFile;
    const jarURL = manifest.downloads?.client?.url;

    if (jarFile && jarURL) {
      await downloadFileIfNotExist(jarFile, jarURL);
    }
  }

  async downloadLibraries(manifest: Manifest) {
    const librariesRoot = this.options.libraryRoot as string;
    const download_queue: DownloadEntry[] = [];

    for (const lib of manifest.libraries || []) {
      const artifact = lib.downloads?.artifact;

      if (artifact) {
        const file = artifact.path || artifactToPath(artifact.id || lib.name);
        const filePath = path.join(librariesRoot, file);

        download_queue.push({
          hash: artifact.sha1,
          name: lib.name,
          path: filePath,
          size: artifact.size,
          url: artifact.url,
        });
      }
    }

    await this.startDownloadTask('libraries', download_queue);
  }

  async getRemoteVersionManifest(): Promise<RemoteVersionManifest> {
    const root = this.options.urls?.meta || 'http://';
    const resource = path.join(root, 'mc/game/version_manifest.json');

    const req = await fetch(resource);
    const remote = (await req.json()) as RemoteVersionManifest;
    return remote;
  }

  async downloadManifest(id = this.options.version.number) {
    const remotes = await this.getRemoteVersionManifest();
    const version = findRemoteVersionInManifest(id, remotes);
    if (!this.options.jsonFile) {
      throw new LauncherError(
        'errors.no-json-specified',
        'No json file or versionRoot specified.',
      );
    } else if (!version) {
      throw new LauncherError(
        'errors.remote-version-not-found',
        'Version with id ' + id + " doesn't exist.",
      );
    } else {
      await downloadFile(this.options.jsonFile, version.url);
    }
  }

  async download() {
    if (!this.isManifestDownloaded()) {
      await this.downloadManifest();
    }

    const manifest = this.getManifest();
    if (manifest) {
      await this.downloadAssets(manifest);
      await this.downloadJarFile(manifest);
      await this.downloadLibraries(manifest);
    }
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      const args = this.createCommand();

      const instance = child.spawn(this.options.javaPath || 'java', args, {
        cwd: this.options.gameRoot,
        env: this.options.env || process.env,
      });

      instance.stdout.on('data', (data) => {
        this.emit('stdout', data.toString());
      });

      instance.stderr.on('data', (data) => {
        this.emit('stderr', data.toString());
      });

      instance.on('close', (code: number) => {
        this.emit('stop', code);
      });

      instance.on('error', (e) => {
        instance.kill();
        reject(e);
      });

      instance.on('spawn', () => {
        resolve(instance.pid as number);
      });

      this.instance = instance;
    });
  }

  getPID() {
    return this.instance?.pid;
  }

  isRunning() {
    return this.instance !== null && !this.instance.killed;
  }

  kill() {
    if (this.isRunning() && this.instance) {
      return this.instance.kill();
    }

    return false;
  }
}
