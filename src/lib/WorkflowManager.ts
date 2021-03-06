import { WorkerOptions } from 'bullmq';
import fse from 'fs-extra';
import path from 'path';
import ts from 'typescript';
import vm from 'vm';
import { PluginManager } from './PluginManager';
import { TSCompiler } from './TSCompiler';
import { getWorkflowName } from './utils';
import { WebServer } from './WebServer';
import { Workflow } from './Workflow';

const ALLOWED_EXT = ['.ts'];

interface WorkflowManagerOptions {
  workflowsPath: string;
  host?: string;
  port?: number;
  concurrency?: number;
  bullBoard?: { enabled?: boolean; basePath?: string };
}

const contextDefaults = {
  sleep: (delay: number) => new Promise((resolve) => setTimeout(resolve, delay)),
  require: (file: string) => {
    if (file.startsWith('wallflow/core')) {
      return {};
    } else if (!file.startsWith('wallflow/plugins/')) {
      throw new Error(`Module "${file}" is not permitted: Only plugins can be imported in workflows.`);
    }
    return PluginManager.use(file.replace(/^wallflow\/plugins\//, ''));
  },
  exports: {},
  console,
};

export abstract class WorkflowManager {
  private static defaultOptions: WorkerOptions;
  private static workflows = new Map<string, Workflow>();
  private static webServer?: WebServer;

  public static async init({
    workflowsPath,
    host = 'localhost:6379',
    port = 8080,
    concurrency = 3,
    bullBoard = {},
  }: WorkflowManagerOptions) {
    const [redisHost, redisPort = '6379'] = host.split(':');
    this.defaultOptions = {
      connection: { host: redisHost, port: redisPort },
      concurrency,
    };

    this.webServer = new WebServer({
      bullBoardEnabled: bullBoard.enabled,
      bullBoardPath: bullBoard.basePath,
      port,
      workflowsPath,
    });

    const files = await fse.readdir(workflowsPath);
    for (const filename of files) {
      if (!ALLOWED_EXT.includes(path.extname(filename))) {
        continue;
      }
      try {
        const workflow = await this.loadWorkflowFile(path.join(workflowsPath, filename));
        console.info(`loaded workflow "${workflow.name}"`);
      } catch (err: any) {
        console.error(`unable to load workflow ${filename}: ${err.message}`);
      }
    }
  }

  public static async stop() {
    if (this.webServer) {
      console.info('  stopping BullBoard...');
      this.webServer.stop();
    }

    for (const [name, workflow] of this.workflows.entries()) {
      if (workflow['queue']) {
        this.webServer?.removeQueue(workflow['queue']);
      }
      await workflow.destroy();
      this.workflows.delete(name);
      console.info(`  cleaning up workflow ${name}`);
    }
    console.info('done');
  }

  public static async loadWorkflowFile(workflowFilename: string, options: WorkerOptions = {}) {
    if (!fse.existsSync(workflowFilename)) {
      throw new Error('file does not exist');
    }

    const contents = await TSCompiler.compile(workflowFilename, {
      target: ts.ScriptTarget.ES2016,
      module: ts.ModuleKind.CommonJS,
      sourceMap: false,
      checkJs: false,
      esModuleInterop: true,
      resolveJsonModule: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      downlevelIteration: true,
      paths: {
        'wallflow/core': [path.join(__dirname, '../core/index.d.ts')],
        'wallflow/plugins/*': [path.join(__dirname, '../plugins/*')],
      },
    });

    const workflowName = getWorkflowName(contents);
    if (!workflowName) {
      throw new Error('workflow.register() must be called');
    }

    const script = new vm.Script(contents);
    await this.removeWorkflow(workflowName);

    const workflow = new Workflow(workflowFilename, { ...this.defaultOptions, ...options });
    script.runInNewContext({ ...contextDefaults, workflow });

    this.workflows.set(workflow.name, workflow);

    if (workflow['queue']) {
      this.webServer?.addQueue(workflow['queue']);
    }

    return workflow;
  }

  public static async removeWorkflow(workflowName: string) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return;
    }
    if (workflow['queue']) {
      this.webServer?.removeQueue(workflow['queue']);
    }
    this.workflows.delete(workflowName);
    await workflow.destroy();
    console.info(`cleaning up workflow ${workflowName}`);
  }

  public static get(name: string) {
    return this.workflows.get(name);
  }
}
