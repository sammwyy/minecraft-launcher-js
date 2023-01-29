# Minecraft Launcher JS

Minecraft launcher wrapper for JavaScipt with modern Typings.

## Example

```javascript
import { MinecraftLauncher } from 'minecraft-launcher-js';

const launcher = new MinecraftLauncher({
    // 
    authentication: {
      name: 'Player',
    },
    memory: {
      max: 2048,
      min: 1024,
    },
    version: {
      number: '1.19.3',
      type: 'release',
    },
});

async function main() {
    // Prepare directories.
    await launcher.prepare();

    // Download if any file is missing.
    await launcher.download();

    // Launch game.
    await launcher.start();
}

main();
```

## Documentation

### Launcher constructor parameters

| Parameter                        | Type     | Description                                                        | Required |
|----------------------------------|----------|--------------------------------------------------------------------|----------|
| `assetsRoot`                     | String   | Path that will be used to load or download the game assets.        | False    |
| `authentication.accessToken`     | String   | Access token provided by an authentication flow.                   | False    |
| `authentication.clientToken`     | String   | Client token provided by an authentication flow.                   | False    |
| `authentication.uuid`            | String   | UUID of the authenticated user (for online-mode: true)             | False    |
| `authentication.name`            | String   | Username of the authenticated userr                                | True     |
| `authentication.meta.type`       | String   | User type (can be mojang or msa)                                   | False    |
| `authentication.meta.xuid`       | String   | User xuid                                                          | False    |
| `authentication.meta.clientId`   | String   | Application id                                                     | False    |
| `brand.name`                     | String   | Custom launcher name, required if brand.version was specified.     | False    |
| `brand.version`                  | String   | Custom launcher version, required if brand.name was specified.     | False    |
| `env`                            | Object   | Env variables. By default the operating system will be used.       | False    |
| `features.is_demo_user`          | Boolean  | Launch the game in demo mode.                                      | False    |
| `features.has_custom_resolution` | Boolean  | Launch the game using resolution from window settings (see below)  | False    |
| `fixLog4JExploit`                | Boolean  | In versions less than 1.17 it will disable Log4j lookup functions. | False    |
| `gameRoot`                       | String   | Path to be used to load game data (Default %appdata%\.minecraft)   | False    |
| `jarFile`                        | String   | Jar file of the version (Default versions/{ver}/{ver}.jar)         | False    |
| `javaPath`                       | String   | Java binary path. By default it will try to get the system one.    | False    |
| `jsonFile`                       | String   | Json file of the version (Default versions/{ver}/{ver}.json)       | False    |
| `libraryRoot`                    | String   | Path that will be used to load or download the game libraries.     | False    |
| `memory.max`                     | Number   | Maximum ram memory of the instance.                                | True     |
| `memory.min`                     | Number   | Minimum ram memory of the instance.                                | True     |
| `nativesRoot`                    | String   | Path that will be used to load or download the game natives.       | False    |
| `os`                             | String   | Operating system. By default it will try to detect.                | False    |
| `version.number`                 | String   | Version to be launched, for example 1.19.3.                        | True     |
| `version.type`                   | String   | Version type to be launched, value can be relase or snapshot.      | True     |
| `versionRoot`                    | String   | Path that will be used to load or download the game versions.      | False    |
| `window.height`                  | Number   | The height of the window if has_custom_resolution is activated.    | False    |
| `window.width`                   | Number   | The width of the window if has_custom_resolution is activated.     | False    |
| `urls.meta`                      | String   | URL from where the manifests will be obtained.                     | False    |
| `urls.resources`                 | String   | URL from where the resources will be obtained.                     | False    |
| `urls.libraries`                 | String   | URL from where the libraries will be obtained.                     | False    |
