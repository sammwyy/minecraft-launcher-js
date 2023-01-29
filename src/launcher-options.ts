export interface AuthenticationSettings {
  accessToken?: string;
  clientToken?: string;
  uuid?: string;
  name: string;
  meta?: {
    type: 'mojang' | 'msa';
    xuid?: string;
    clientId?: string;
  };
}

export interface LauncherFeatures {
  is_demo_user?: boolean;
  has_custom_resolution?: boolean;
}

export interface VersionSettings {
  number: string;
  type: 'release' | 'snapshot';
}

export interface MemorySettings {
  max: number;
  min: number;
}

export interface WindowSettings {
  width: number;
  height: number;
  fullscreen: boolean;
}

export interface UrlSettings {
  meta: string;
  resources: string;
  libraries: string;
}

export interface LauncherBrand {
  name: string;
  version: string;
}

export default interface LauncherOptions {
  assetsRoot?: string;
  authentication: AuthenticationSettings;
  brand?: LauncherBrand;
  customGameArgs?: string[];
  customJvmArgs?: string[];
  env?: Record<string, string>;
  features?: LauncherFeatures;
  fixLog4JExploit?: boolean;
  gameRoot?: string;
  jarFile?: string;
  javaPath?: string;
  jsonFile?: string;
  libraryRoot?: string;
  maxSockets?: number;
  memory: MemorySettings;
  nativesRoot?: string;
  os?: string;
  version: VersionSettings;
  versionRoot?: string;
  window?: WindowSettings;
  urls?: UrlSettings;
}
