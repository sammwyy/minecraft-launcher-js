import path from 'path';
import { ManifestLibrary } from '../manifest';
import { artifactToPath } from './path-utils';
import { getOS } from './system-utils';

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
