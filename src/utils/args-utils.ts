import LauncherOptions from '../launcher-options';
import { Manifest, ManifestArgument } from '../manifest';
import { createClasspathWithJar } from './java-utils';
import { validateAllRules } from './rules-utils';

export function formatArgs(
  options: LauncherOptions,
  manifest: Manifest,
  args: string[],
) {
  const libs = manifest.libraries?.filter((lib) =>
    validateAllRules(options, lib.rules),
  );
  const libraryRoot = options.libraryRoot as string;
  const jarFile = options.jarFile as string;

  const classpath = createClasspathWithJar(libraryRoot, libs || [], jarFile);
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

export function validateArg(
  options: LauncherOptions,
  arg: ManifestArgument,
): string[] {
  if (typeof arg === 'string') {
    return [arg];
  } else {
    const value = arg.value;

    if (value) {
      const valid = validateAllRules(options, arg.rules);

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
