#!/usr/bin/env node
import axios from 'axios';
import { randomUUID } from 'crypto';
import FormData from 'form-data';
import fse from 'fs-extra';
import path from 'path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { safeToJSON } from '../lib/utils';

let verbose = false;
const print = (...args: any[]) => {
  if (!verbose) return;
  process.stdout.write(args.map((arg) => arg.toString()).join(' '));
};

yargs(hideBin(process.argv))
  .option('ssl', { alias: 's', type: 'boolean', default: false, description: 'Set whether to send data via SSL or not' })
  .option('host', { alias: 'h', type: 'string', default: 'localhost', description: 'Set the target server host' })
  .option('port', { alias: 'p', type: 'number', default: 8080, description: 'Set the target server port' })
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
      const baseUrl = `${argv.ssl ? 'https' : 'http'}://${argv.host}${argv.port !== 80 ? `:${argv.port}` : ''}`;

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
        const form = new FormData();
        form.append('uuid', uuid);
        form.append('file', data, { filename });

        print('sending request...');
        const result = await axios.post(`${baseUrl}/workflow/deploy`, form, { headers: form.getHeaders() });

        if (result.data.status !== 'ok') {
          throw new Error(`error: ${result.data.message ?? result}`);
        }
      } catch (err: any) {
        console.error(`error: ${err.response.data.message}`);
        process.exit(1);
      }
      console.info('deploy complete!');
      process.exit();
    },
  )

  .command(
    'delete <workflowName>',
    'delete a workflow from WallFlow server',
    (yargs) => yargs.positional('workflowName', { type: 'string', demandOption: true, describe: 'Workflow file to deploy' }),
    async (argv) => {
      verbose = Boolean(argv.verbose);
      const baseUrl = `${argv.ssl ? 'https' : 'http'}://${argv.host}${argv.port !== 80 ? `:${argv.port}` : ''}`;

      console.info(`deleting workflow "${argv.workflowName}"...`);
      try {
        print('sending request...');
        const result = await axios.delete(`${baseUrl}/workflow/${argv.workflowName}`);

        if (result.data.status !== 'ok') {
          throw new Error(`error: ${result.data.message ?? result}`);
        }
      } catch (err: any) {
        console.error(`error: ${err.response.data.message}`);
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
      const baseUrl = `${argv.ssl ? 'https' : 'http'}://${argv.host}${argv.port !== 80 ? `:${argv.port}` : ''}`;

      try {
        console.info(`triggering workflow "${argv.workflowName}" "${argv.triggerId}"`);
        console.log(`${baseUrl}/workflow/${argv.workflowName}/${argv.triggerId}`);
        const result = await axios.post(
          `${baseUrl}/workflow/${argv.workflowName}/${argv.triggerId}?wait=true`,
          argv.payload ? safeToJSON(argv.payload) : null,
          { headers: { 'Content-Type': 'application/json' } },
        );
        console.info(JSON.stringify(result.data, null, 2));
        process.exit();
      } catch (err: any) {
        console.error(`error: ${err.response.data.message}`);
        process.exit(1);
      }
    },
  )
  .parse();
