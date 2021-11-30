import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { WorkerOptions } from 'bullmq';
import fastify, { FastifyInstance } from 'fastify';
import fse from 'fs-extra';
import path from 'path';
import vm from 'vm';
import { PluginManager } from './PluginManager';
import { TSCompiler } from './TSCompiler';
import { Watcher } from './Watcher';
import { Workflow } from './Workflow';

interface WorkflowManagerOptions {
  workflowsPath: string;
  host?: string;
  concurrency?: number;
  bullBoard?: { enabled?: boolean; basePath?: string; port?: number };
}

const contextDefaults = {
  sleep: (delay: number) => new Promise((resolve) => setTimeout(resolve, delay)),
  require: (path: string) => {
    if (path.startsWith('wallflow/core')) {
      return {};
    } else if (!path.startsWith('wallflow/plugins/')) {
      throw new Error(`Module "${path}" is not permitted: Only plugins can be imported in workflows.`);
    }
    return PluginManager.use(path.replace(/^wallflow\/plugins\//, ''));
  },
  exports: {},
  console,
};

export abstract class WorkflowManager {
  private static workflows = new Map<string, Workflow>();
  private static webServer?: FastifyInstance;
  private static bullBoard?: ReturnType<typeof createBullBoard>;

  public static async init({ workflowsPath, host = 'localhost:6379', concurrency = 3, bullBoard = {} }: WorkflowManagerOptions) {
    const [redisHost, redisPort = '6379'] = host.split(':');
    const connection = { host: redisHost, port: redisPort };

    //TODO: move this out to its own static class
    if (bullBoard?.enabled) {
      const bullBoardBasePath = bullBoard.basePath ?? '/ui';
      const bullBoardPort = bullBoard.port ?? 8080;
      const serverAdapter = new FastifyAdapter();
      serverAdapter.setBasePath(bullBoardBasePath);

      this.webServer = fastify();
      this.webServer.register(serverAdapter.registerPlugin(), { basePath: '/', prefix: bullBoardBasePath });
      this.bullBoard = createBullBoard({ queues: [], serverAdapter });

      await this.webServer.listen(bullBoardPort, '0.0.0.0');
      console.info(`🎯 BullBoard running on http://localhost:${bullBoardPort}${bullBoardBasePath}`);
    }

    await Watcher.watch(workflowsPath, ['.ts'], async (filename) => {
      try {
        await this.removeWorkflowsFor(path.join(workflowsPath, filename));

        const workflow = await this.loadWorkflowFile(path.join(workflowsPath, filename), { connection, concurrency });
        const workflowName = workflow['workflowName'];
        this.workflows.set(workflowName, workflow);
        if (workflow['queue']) {
          this.bullBoard?.addQueue(new BullMQAdapter(workflow['queue']));
        }
        console.info(`loaded workflow "${workflowName}"`);
      } catch (err: any) {
        console.error(`unable to load workflow ${filename}: ${err.message}`);
      }
    });
  }

  public static async stop() {
    if (this.webServer) {
      console.info('  stopping BullBoard...');
      this.webServer.close();
    }

    for (const [name, workflow] of this.workflows.entries()) {
      if (workflow['queue']) {
        this.bullBoard?.removeQueue(workflow.name);
      }
      await workflow.destroy();
      this.workflows.delete(name);
      console.info(`  cleaning up workflow ${name}`);
    }
    console.info('done');
  }

  private static async loadWorkflowFile(workflowFilename: string, options: WorkerOptions) {
    if (!fse.existsSync(workflowFilename)) {
      throw new Error('file does not exist');
    }

    const contents = await TSCompiler.compile(workflowFilename);
    const script = new vm.Script(contents);

    const workflow = new Workflow(workflowFilename, options);
    script.runInNewContext({ ...contextDefaults, workflow });
    return workflow;
  }

  private static async removeWorkflowsFor(filename: string) {
    for (const [name, workflow] of this.workflows.entries()) {
      if (filename === workflow['workflowFilename']) {
        if (workflow['queue']) {
          this.bullBoard?.removeQueue(new BullMQAdapter(workflow['queue']));
        }
        this.workflows.delete(name);
        await workflow.destroy();
        console.info(`cleaning up workflow ${name}`);
      }
    }
  }

  public static get(name: string) {
    if (!this.workflows.has(name)) {
      throw new Error(`workflow "${name}" does not exist`);
    }
    return this.workflows.get(name);
  }
}
