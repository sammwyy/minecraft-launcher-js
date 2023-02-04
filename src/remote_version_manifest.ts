export interface RemoteVersion {
  id: string;
  type: 'release' | 'snapshot';
  url: string;
  time: string;
  releaseTime: string;
}

export interface RemoteVersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: RemoteVersion[];
}
