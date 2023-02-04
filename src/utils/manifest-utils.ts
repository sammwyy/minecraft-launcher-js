import fs from 'graceful-fs';
import path from 'path';
import { LauncherError } from '../launcher-error';
import LauncherOptions from '../launcher-options';
import { ManifestArgument, ManifestLibrary, Manifest } from '../manifest';

function mergeArrays(
  arr1: unknown[] | undefined,
  arr2: unknown[] | undefined,
): unknown[] {
  const first = arr1 || [];
  const second = arr2 || [];
  return [...first, ...second];
}

export function mergeManifests(parent: Manifest, child: Manifest) {
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

export function modernizeManifest(manifest: Manifest): Manifest {
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

export function getInheritsManifest(
  options: LauncherOptions,
  inherits: string,
) {
  const { jsonFile, versionRoot } = options;
  const versions = versionRoot || path.join(jsonFile || '', '../..');
  const parentFile = path.join(versions, inherits, `${inherits}.json`);

  if (!fs.existsSync(parentFile)) {
    throw new LauncherError(
      'errors.no-inherit-json-file',
      'No inherits version found.',
    );
  }

  const raw = fs.readFileSync(parentFile, { encoding: 'utf-8' });
  const parentManifest = JSON.parse(raw) as Manifest;
  return parentManifest;
}

export function getManifestFromSettings(options: LauncherOptions): Manifest {
  const { jsonFile } = options;

  if (!jsonFile) {
    throw new LauncherError(
      'errors.no-json-specified',
      'No json file or versionRoot specified.',
    );
  }

  const raw = fs.readFileSync(jsonFile, { encoding: 'utf-8' });
  let manifest = modernizeManifest(JSON.parse(raw) as Manifest);

  if (manifest.inheritsFrom) {
    const parent = getInheritsManifest(options, manifest.inheritsFrom);
    manifest = mergeManifests(parent, manifest);
  }

  return manifest;
}
