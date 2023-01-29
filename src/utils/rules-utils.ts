import LauncherOptions from '../launcher-options';
import { ManifestRule } from '../manifest';
import { getArch } from './system-utils';

export function validateRule(options: LauncherOptions, rule: ManifestRule) {
  const allow = rule.action === 'allow';
  let valid = true;

  if (rule.os) {
    if (rule.os.name && rule.os.name !== options.os) {
      valid = false;
    }

    if (rule.os.arch && rule.os.arch !== getArch()) {
      valid = false;
    }
  }

  if (rule.features?.is_demo_user !== options.features?.is_demo_user) {
    valid = false;
  }

  if (
    rule.features?.has_custom_resolution !==
    options.features?.has_custom_resolution
  ) {
    valid = false;
  }

  if (allow && valid) return true;
  if (!allow && !valid) return true;
  if (!allow && valid) return false;
  if (allow && !valid) return false;
  return false;
}

export function validateAllRules(
  options: LauncherOptions,
  rules: ManifestRule[] | undefined,
) {
  for (const rule of rules || []) {
    if (!validateRule(options, rule)) {
      return false;
    }
  }

  return true;
}
