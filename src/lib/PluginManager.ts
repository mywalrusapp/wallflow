import path from 'path';
import fse from 'fs-extra';

interface PluginManagerOptions {
  pluginsPaths: string[];
}

export abstract class PluginManager {
  private static plugins = new Map<string, string>();

  public static async init(options: PluginManagerOptions) {
    await this.loadPluginDirectories(options.pluginsPaths);
  }

  public static async loadPluginDirectories(pluginPaths: string[]) {
    for (const pluginPath of pluginPaths) {
      const files = await fse.readdir(pluginPath);
      for (const file of files) {
        const stat = fse.statSync(path.join(pluginPath, file));
        if (stat.isDirectory()) {
          await this.loadPluginDirectories([path.join(pluginPath, file)]);
          continue;
        }
        const [pluginName] = file.split('.');
        this.plugins.set(pluginName, path.join(pluginPath, file));
        console.info(`plugin ${pluginName} registered`);
      }
    }
  }

  public static use(pluginName: string) {
    const pluginFile = this.plugins.get(pluginName);

    if (!pluginFile) {
      throw new Error(`plugin "${pluginName}" does not exist`);
    }

    try {
      return require(pluginFile);
    } catch (err: any) {
      console.error(`unable to load plugin ${pluginFile}:\n  Error: `, err.message);
    }
  }
}
