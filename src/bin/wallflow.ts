#!/usr/bin/env node
import { randomUUID } from 'crypto';
import fse from 'fs-extra';
import path from 'path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { WallFlowClient } from '../client';

const CONNECTION_TIMEOUT = 15 * 1000; // 15 seconds
const RESPONSE_TIMEOUT = 60 * 1000; // 60 seconds

let verbose = false;
const print = (...args: any[]) => {
  if (!verbose) return;
  process.stdout.write(args.map((arg) => arg.toString()).join(' '));
};

interface SendMessageOptions {
  topic: string;
  replyTopic: string;
  payload: any;
  host: string;
  port: number;
  username: string | undefined;
  password: string | undefined;
  timeout?: number;
}

let timerId: NodeJS.Timeout;
const sendMessage = (options: SendMessageOptions) =>
  new Promise<any>((resolve, reject) => {
    print(`  connecting to ${options.host}:${options.port}... `);

    timerId = setTimeout(() => reject(new Error('error: connection timeout')), CONNECTION_TIMEOUT);
    const client = new WallFlowClient({ host: options.host, port: options.port, username: options.username, password: options.password });

    client.onConnect(async () => {
      print('ok\n');
      print(`  sending ${options.topic}... ok\n`);
      print(`  waiting for response... `);
      const response = await client.trigger(options.topic, options.payload, { wait: true, replyTopic: options.replyTopic });
      print(`ok\n`);
      clearTimeout(timerId);
      client.disconnect();
      resolve(response);
      clearTimeout(timerId);
      timerId = setTimeout(() => reject(new Error('error: response timeout')), options.timeout ?? RESPONSE_TIMEOUT);
    });

    client.onError((err) => {
      reject(new Error(`Unexpected error: ${err.message}`));
    });
  });

yargs(hideBin(process.argv))
  .option('host', { alias: 'h', type: 'string', default: 'localhost', description: 'Set the target server host' })
  .option('port', { alias: 'p', type: 'number', default: 1883, description: 'Set the target server port' })
  .option('username', { alias: 'u', type: 'string', description: 'Provide a username to login to the server' })
  .option('password', { alias: 'P', type: 'string', description: "Prompts for user's password" })
  .option('verbose', { alias: 'v', type: 'boolean', default: false, description: 'Run with verbose logging' })
  .demandCommand(1)
  .command(
    'deploy <workflow-file>',
    'deploy a workflow to WallFlow server',
    (yargs) => yargs.positional('workflow-file', { type: 'string', demandOption: true, describe: 'Workflow file to deploy' }),
    async (argv) => {
      verbose = Boolean(argv.verbose);

      const uuid = randomUUID();
      const file = path.join(process.cwd(), argv['workflow-file']);
      const filename = path.basename(file);
      print('workflow file: ', filename, '\n');
      if (!fse.existsSync(file)) {
        console.error('error: workflow file does not exist');
        process.exit(2);
      }

      const data = fse.readFileSync(file).toString('base64');
      print(`workflow file size: ${Buffer.byteLength(data, 'utf8')} bytes\n`);

      console.info('deploying workflow...');
      try {
        const result = await sendMessage({
          topic: 'deploy/workflow',
          replyTopic: `result/deploy/workflow:${uuid}`,
          payload: { uuid, data, filename },
          host: argv.host,
          port: argv.port,
          username: argv.username,
          password: argv.password,
        });

        if (result.status !== 'ok') {
          throw new Error(`error: ${result.message ?? result}`);
        }
      } catch (err: any) {
        console.error(err.message);
        process.exit(1);
      }
      console.info('deploy complete!');
      process.exit();
    },
  )

  .command(
    'delete <workflowId>',
    'delete a workflow from WallFlow server',
    (yargs) => yargs.positional('workflowId', { type: 'string', demandOption: true, describe: 'Workflow file to deploy' }),
    async (argv) => {
      verbose = Boolean(argv.verbose);

      console.info('deleting workflow...');
      try {
        const result = await sendMessage({
          topic: 'delete/workflow',
          replyTopic: `result/delete/workflow:${argv.workflowId}`,
          payload: argv.workflowId,
          host: argv.host,
          port: argv.port,
          username: argv.username,
          password: argv.password,
        });

        if (result.status !== 'ok') {
          throw new Error(`error: ${result.message ?? result}`);
        }
      } catch (err: any) {
        console.error(err.message);
        process.exit(1);
      }
      console.info('done!');
      process.exit();
    },
  )

  .command(
    'trigger <workflowName> <triggerId> [payload]',
    'emit a trigger WallFlow server',
    (yargs) =>
      yargs
        .positional('workflowName', { type: 'string', describe: 'Workflow name to trigger', demandOption: true })
        .positional('triggerId', { type: 'string', describe: 'Trigger id of the workflow to trigger', demandOption: true })
        .positional('payload', { type: 'string', describe: 'Payload to send in the trigger' }),
    async (argv) => {
      verbose = Boolean(argv.verbose);

      try {
        console.info(`triggered workflow "${argv.workflowName}" "${argv.triggerId}"`);
        console.info('waiting for response:');
        const result = await sendMessage({
          topic: `trigger/${argv.workflowName}:${argv.triggerId}`,
          replyTopic: `result/${argv.workflowName}:${argv.triggerId}`,
          payload: argv.payload ?? '',
          host: argv.host,
          port: argv.port,
          username: argv.username,
          password: argv.password,
          timeout: 5000,
        });
        console.info(JSON.stringify(result, null, 2));
        process.exit();
      } catch (err: any) {
        console.error(err.message);
        process.exit(1);
      }
    },
  )
  .parse();
