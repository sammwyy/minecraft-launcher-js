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
