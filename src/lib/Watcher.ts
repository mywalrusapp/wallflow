import fse from 'fs-extra';
import path from 'path';

export abstract class Watcher {
  public static async watch(watchPath: string, allowedExt: string[], callback: (filename: string, event: string) => void) {
    const fileWatchMap = new Map();
    fse.watch(watchPath, (event, filename) => {
      if (!filename || !allowedExt.includes(path.extname(filename))) {
        return;
      } else if (!fse.existsSync(path.join(watchPath, filename))) {
        callback(filename, 'delete');
        return;
      }
      const stats = fse.statSync(path.join(watchPath, filename));
      if (stats.mtime.valueOf() === fileWatchMap.get(filename)?.valueOf() ?? new Date(0)) {
        return;
      }
      fileWatchMap.set(filename, stats.mtime);
      callback(filename, event);
    });

    const files = await fse.readdir(watchPath);
    for (const filename of files) {
      if (!allowedExt.includes(path.extname(filename))) {
        continue;
      }
      await callback(filename, 'init');
    }
  }
}
