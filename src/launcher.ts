import * as child from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

import LauncherOptions from './launcher-options';
import { LauncherError } from './launcher-error';
import {
  ManifestArgument,
  ManifestRule,
  VersionManifest,
} from './version-manifest';
import {
  artifactToPath,
  createClasspathWithJar,
  downloadFile,
  downloadFileIfNotExist,
  getArch,
  getDefaultMcDir,
  getOS,
  isWhatPercentOf,
  mergeManifests,
  modernizeManifest,
} from './utils';
import Emitter from './events/emitter';

const DEFAULT_OPTIONS: LauncherOptions = {
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
  maxSockets: 2,
  urls: {
    libraries: 'https://libraries.minecraft.net/',
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

export default interface DownloadEntry {
  hash: string;
  name: string;
  path: string;
  size: number;
  url: string;
}

export class MinecraftLauncher extends Emitter {
  private readonly options: LauncherOptions;
  private instance: child.ChildProcessWithoutNullStreams | null;

  constructor(options: LauncherOptions) {
    super();

    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    this.instance = null;
  }

  async prepare() {
    // Prepare options.
    if (!this.options.os) this.options.os = getOS();

    // Prepare directories.
    if (!this.options.gameRoot) {
      this.options.gameRoot = getDefaultMcDir();
    }

    if (!this.options.assetsRoot) {
      this.options.assetsRoot = path.join(this.options.gameRoot, 'assets');
    }

    if (!this.options.libraryRoot) {
      this.options.libraryRoot = path.join(this.options.gameRoot, 'libraries');
    }

    if (!this.options.nativesRoot) {
      this.options.nativesRoot = path.join(this.options.gameRoot, 'natives');
    }

    if (
      !this.options.versionRoot &&
      (!this.options.jsonFile || !this.options.jarFile)
    ) {
      this.options.versionRoot = path.join(this.options.gameRoot, 'versions');
    }

    // Prepare version files.
    const { version, versionRoot } = this.options;

    if (!this.options.jarFile && versionRoot) {
      this.options.jarFile = path.join(
        versionRoot,
        version.number,
        `${version.number}.jar`,
      );
    }

    if (!this.options.jsonFile && versionRoot) {
      this.options.jsonFile = path.join(
        versionRoot,
        version.number,
        `${version.number}.json`,
      );
    }

    // Make directories if not exist.
    await fs.mkdir(this.options.assetsRoot, { recursive: true });
    await fs.mkdir(this.options.libraryRoot, { recursive: true });
    await fs.mkdir(this.options.nativesRoot, { recursive: true });
    if (this.options.versionRoot) {
      await fs.mkdir(this.options.versionRoot, { recursive: true });
    }
  }

  getInheritsManifest(inherits: string) {
    const { jsonFile, versionRoot } = this.options;
    const versions = versionRoot || path.join(jsonFile || '', '../..');
    const parentFile = path.join(versions, inherits, `${inherits}.json`);

    if (!fsSync.existsSync(parentFile)) {
      throw new LauncherError(
        'errors.no-inherit-json-file',
        'No inherits version found.',
      );
    }

    const raw = fsSync.readFileSync(parentFile, { encoding: 'utf-8' });
    const parentManifest = JSON.parse(raw) as VersionManifest;
    return parentManifest;
  }

  getManifest(): VersionManifest {
    if (!this.options.jsonFile) {
      throw new LauncherError(
        'errors.no-json-specified',
        'No json file or versionRoot specified.',
      );
    }

    const raw = fsSync.readFileSync(this.options.jsonFile, {
      encoding: 'utf-8',
    });
    const manifest = modernizeManifest(JSON.parse(raw) as VersionManifest);

    if (manifest.inheritsFrom) {
      const parent = this.getInheritsManifest(manifest.inheritsFrom);
      return mergeManifests(parent, manifest);
    } else {
      return manifest;
    }
  }

  validateRule(rule: ManifestRule) {
    const allow = rule.action === 'allow';
    let valid = true;

    if (rule.os) {
      if (rule.os.name && rule.os.name !== this.options.os) {
        valid = false;
      }

      if (rule.os.arch && rule.os.arch !== getArch()) {
        valid = false;
      }
    }

    if (rule.features?.is_demo_user !== this.options.features?.is_demo_user) {
      valid = false;
    }

    if (
      rule.features?.has_custom_resolution !==
      this.options.features?.has_custom_resolution
    ) {
      valid = false;
    }

    if (allow && valid) return true;
    if (!allow && !valid) return true;
    if (!allow && valid) return false;
    if (allow && !valid) return false;
    return false;
  }

  validateAllRules(rules: ManifestRule[] | undefined) {
    for (const rule of rules || []) {
      if (!this.validateRule(rule)) {
        return false;
      }
    }

    return true;
  }

  validateArg(arg: ManifestArgument): string[] {
    if (typeof arg === 'string') {
      return [arg];
    } else {
      const value = arg.value;

      if (value) {
        const valid = this.validateAllRules(arg.rules);

        if (valid) {
          if (typeof value === 'string') {
            return [value];
          } else {
            return value;
          }
        }
      }
    }

    return [];
  }

  private formatArgs(manifest: VersionManifest, args: string[]) {
    const libs = manifest.libraries?.filter((lib) =>
      this.validateAllRules(lib.rules),
    );
    const classpath = createClasspathWithJar(
      this.options.libraryRoot as string,
      libs || [],
      this.options.jarFile as string,
    );

    const { options } = this;
    const { authentication } = options;

    return args.map((arg) =>
      arg
        .replace('${assets_root}', options.assetsRoot || 'null')
        .replace('${game_directory}', options.gameRoot || 'null')
        .replace('${natives_directory}', options.nativesRoot || 'null')

        .replace('${launcher_name}', options.brand?.name || 'null')
        .replace('${launcher_version}', options.brand?.version || 'null')

        .replace('${auth_access_token}', authentication.accessToken || 'null')
        .replace('${auth_player_name}', authentication.name)
        .replace(
          '${auth_uuid}',
          authentication.uuid || 'a01e3843-e521-3998-958a-f459800e4d11',
        )
        .replace('${auth_xuid}', authentication.meta?.xuid || 'null')
        .replace('${clientid}', authentication.meta?.clientId || 'null')
        .replace('${user_type}', authentication.meta?.type || 'null')

        .replace('${resolution_width}', options.window?.width + '')
        .replace('${resolution_height}', options.window?.height + '')

        .replace('${version_type}', options.version.type || 'null')
        .replace('${version_name}', options.version.number || 'null')

        .replace('${assets_index_name}', manifest.assetIndex?.id || 'null')
        .replace('${user_properties}', '{}')
        .replace('${classpath}', classpath),
    );
  }

  createCommand() {
    const manifest = this.getManifest();
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
      args.push(...this.validateArg(javaArg));
    }

    args.push(manifest.mainClass);

    for (const gameArg of manifest.arguments?.game || []) {
      args.push(...this.validateArg(gameArg));
    }

    return this.formatArgs(manifest, args);
  }

  async startDownloadTask(taskName: string, pendingFiles: DownloadEntry[]) {
    let totalSize = 0;
    let downloadedSize = 0;
    let downloadedFiles = 0;

    const files = pendingFiles.filter((f) => {
      if (!fsSync.existsSync(f.path)) {
        totalSize += f.size;
        return true;
      } else {
        const stat = fsSync.statSync(f.path);
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

    for (const file of files) {
      this.emit('download_file', {
        file: file.name,
        path: file.path,
        sha1: file.hash,
        size: file.size,
        task: taskName,
      });

      tasks.push(
        // eslint-disable-next-line no-async-promise-executor
        new Promise(async (resolve) => {
          const data = await downloadFile(file.path, file.url);
          downloadedSize += data.size;
          downloadedFiles++;

          this.emit('download_progress', {
            progress: isWhatPercentOf(downloadedSize, totalSize),
            progressFiles: downloadedFiles,
            progressSize: downloadedSize,
            totalFiles: files.length,
            totalSize: totalSize,
            task: taskName,
          });

          resolve(null);
        }),
      );
    }

    const res = await Promise.all(tasks).catch((e) => {
      this.emit('download_end', { name: taskName, error: e + '' });
      return null;
    });
    if (res) {
      this.emit('download_end', { name: taskName });
    }
  }

  isLibrariesDownloaded(manifest: VersionManifest) {
    const librariesRoot = this.options.libraryRoot as string;

    for (const lib of manifest.libraries || []) {
      const artifact = lib.downloads?.artifact;

      if (artifact) {
        const file = artifact.path || artifactToPath(artifact.id || lib.name);
        const filePath = path.join(librariesRoot, file);

        if (this.validateAllRules(lib.rules) && !fsSync.existsSync(filePath)) {
          return false;
        }
      }
    }

    return true;
  }

  isAssetsDownloaded(manifest: VersionManifest) {
    const assetRoot = this.options.assetsRoot as string;
    const assetId = manifest.assetIndex?.id || manifest.assets;
    const indexes = path.join(assetRoot, 'indexes', `${assetId}.json`);

    if (!fsSync.existsSync(indexes)) {
      return false;
    }

    const indexRaw = fsSync.readFileSync(indexes, { encoding: 'utf-8' });
    const index = JSON.parse(indexRaw);

    for (const fileName in index.objects) {
      const file = index.objects[fileName];
      const hash = file.hash;
      const subHash = hash.substring(0, 2);
      const subAsset = path.join(assetRoot, 'objects', subHash, hash);

      if (!fsSync.existsSync(subAsset)) {
        return false;
      }
    }

    return true;
  }

  isDownloaded() {
    const manifest = this.getManifest();
    return (
      this.isAssetsDownloaded(manifest) && this.isLibrariesDownloaded(manifest)
    );
  }

  async downloadAssets(manifest: VersionManifest) {
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

  async downloadJarFile(manifest: VersionManifest) {
    const jarFile = this.options.jarFile;
    const jarURL = manifest.downloads?.client?.url;

    if (jarFile && jarURL) {
      await downloadFileIfNotExist(jarFile, jarURL);
    }
  }

  async downloadLibraries(manifest: VersionManifest) {
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

  async download() {
    const manifest = this.getManifest();
    await this.downloadAssets(manifest);
    await this.downloadJarFile(manifest);
    await this.downloadLibraries(manifest);
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
