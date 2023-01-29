import { LauncherFeatures } from './launcher-options';

export type ManifestRuleAction = 'allow' | 'disallow';

export interface ManifestRule {
  action: ManifestRuleAction;
  features?: LauncherFeatures;
  os?: {
    name?: string;
    version?: string;
    arch?: string;
  };
}

export interface ManifestArgumentObj {
  value: string | string[];
  rules: ManifestRule[];
}

export type ManifestArgument = string | ManifestArgumentObj;

export interface ManifestFile {
  id?: string;
  path?: string;
  sha1: string;
  size: number;
  url: string;
}

export interface ManifestLibrary {
  downloads?: {
    artifact: ManifestFile;
  };
  name: string;
  url?: string;
  rules?: ManifestRule[];
}

export type ManifestType = 'snapshot' | 'release' | 'old_alpha' | 'old_beta';

export interface VersionManifest {
  arguments?: {
    game?: ManifestArgument[];
    jvm?: ManifestArgument[];
  };
  inheritsFrom?: string;
  assetIndex?: {
    id: string;
    sha1: string;
    size: number;
    totalSize: number;
    url: string;
  };
  assets?: string;
  downloads?: {
    client?: ManifestFile;
    client_mappings?: ManifestFile;
    server?: ManifestFile;
    server_mappings?: ManifestFile;
  };
  id: string;
  javaVersion?: {
    component: string;
    majorVersion: number;
  };
  libraries?: ManifestLibrary[];
  logging?: {
    client: {
      argument: string;
      file: ManifestFile;
      type: string;
    };
  };
  mainClass: string;
  minecraftArguments?: string;
  minimumLauncherVersion: number;
  releaseTime: string;
  time: string;
  type: ManifestType;
}
