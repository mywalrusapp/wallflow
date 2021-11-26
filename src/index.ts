import dotenv from 'dotenv';
import path from 'path';
import packageJson from '../package.json';
import { PluginManager } from './lib/PluginManager';

dotenv.config();

const INTERNAL_PLUGINS_PATH = path.join(__dirname, './plugins');

const workflowsPath = path.resolve(process.env.WORKFLOWS_PATH ?? './workflows');
const pluginsPaths = process.env.PLUGINS_PATH ? [process.env.PLUGINS_PATH, INTERNAL_PLUGINS_PATH] : [INTERNAL_PLUGINS_PATH];

async function main() {
  console.info('                _            \n \\    / _  | | |_ |  _       \n  \\/\\/ (_| | | |  | (_) \\/\\/ \n');
  console.info(`                       v${packageJson.version}\n`);
  console.info('plugins paths:', pluginsPaths, '\n');
  console.info('workflows path:', workflowsPath, '\n');

  try {
    console.info('\nloading plugins...');
    await PluginManager.init({ pluginsPaths });
  } catch (err) {
    console.error('Unhandled error: ', err);
  }
}

let isShuttingDown = false;
process.on('SIGTERM', async () => {
  console.log('Shutting down server...');

  process.exit();
});

process.on('SIGUSR2', async () => {
  if (isShuttingDown) return;
  console.log('Shutting down server...');
  isShuttingDown = true;

  process.exit();
});

process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  console.log('hutting down server...');
  isShuttingDown = true;

  process.exit();
});

main();
