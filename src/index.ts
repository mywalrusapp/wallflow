import dotenv from 'dotenv';
import path from 'path';
import { MessageManager } from './lib/MessageManager';
import { PluginManager } from './lib/PluginManager';
import { WorkflowManager } from './lib/WorkflowManager';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

dotenv.config();

const INTERNAL_PLUGINS_PATH = path.join(__dirname, './plugins');

const workflowsPath = path.resolve(process.env.WORKFLOWS_PATH ?? './workflows');
const pluginsPaths = process.env.PLUGINS_PATH ? [process.env.PLUGINS_PATH, INTERNAL_PLUGINS_PATH] : [INTERNAL_PLUGINS_PATH];
const redisHost = process.env.REDIS_HOST;

const mqttHost = process.env.MQTT_HOST ? process.env.MQTT_HOST : 'localhost';
const mqttPort = process.env.MQTT_PORT ? parseInt(process.env.MQTT_PORT, 10) : 1883;
const mqttUsername = process.env.MQTT_USERNAME ? process.env.MQTT_USERNAME : undefined;
const mqttPassword = process.env.MQTT_PASSWORD ? process.env.MQTT_PASSWORD : undefined;

const bullBoardEnabled = process.env.BULL_BOARD_UI ? process.env.BULL_BOARD_UI !== 'false' : false;
const bullBoardBasePath = process.env.BULL_BOARD_UI ? process.env.BULL_BOARD_BASE_PATH : undefined;
const webserverPort = process.env.WEBSERVER_PORT ? parseInt(process.env.WEBSERVER_PORT, 10) : undefined;
const maxWorkers = process.env.MAX_WORKERS ? Number(process.env.MAX_WORKERS) : undefined;

async function main() {
  console.info('                _            \n \\    / _  | | |_ |  _       \n  \\/\\/ (_| | | |  | (_) \\/\\/ \n');
  console.info(`                       v${packageJson.version}\n`);
  console.info('plugins paths:', pluginsPaths, '\n');
  console.info('workflows path:', workflowsPath, '\n');

  try {
    console.info('\ninitializing...');
    MessageManager.init({
      host: mqttHost,
      port: mqttPort,
      username: mqttUsername,
      password: mqttPassword,
    });

    console.info('\nloading plugins...');
    await PluginManager.init({ pluginsPaths });

    console.info('\nloading workflows...');
    await WorkflowManager.init({
      workflowsPath,
      host: redisHost,
      concurrency: maxWorkers,
      port: webserverPort,
      bullBoard: { enabled: bullBoardEnabled, basePath: bullBoardBasePath },
    });
  } catch (err) {
    console.error('Unhandled error:', err);
    MessageManager.stop();
    WorkflowManager.stop();
    process.exit(1);
  }
}

let isShuttingDown = false;
const shutdown = async () => {
  isShuttingDown = true;
  // force exit if longer than 10 seconds
  const timerId = setTimeout(() => process.exit(), 10 * 1000);
  console.log('Shutting down server...');
  MessageManager.stop();
  await WorkflowManager.stop();
  clearTimeout(timerId);
  process.exit();
};

process.on('SIGTERM', async () => shutdown());
process.on('SIGUSR2', async () => {
  if (isShuttingDown) return;
  shutdown();
});
process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  shutdown();
});

main();
