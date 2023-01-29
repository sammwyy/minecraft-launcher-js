import path from 'path';

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
