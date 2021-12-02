import fse from 'fs-extra';
import path from 'path';
import { Callback, WallFlowClient } from '../client';
import { getWorkflowName } from './utils';
import { WorkflowManager } from './WorkflowManager';

interface MessageManagerOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  workflowsPath: string;
}

interface DeployPayload {
  uuid: string;
  data: string;
  filename: string;
}

export abstract class MessageManager {
  private static workflowsPath: string;
  private static client: WallFlowClient;

  public static async init({ host = 'localhost', port = 1883, username, password, workflowsPath }: MessageManagerOptions) {
    this.workflowsPath = workflowsPath;
    return new Promise<void>((resolve) => {
      // connect to mqtt broker
      this.client = new WallFlowClient({ host, port, username, password });
      this.client
        .onConnect(() => {
          console.log('connected to host');
          resolve();
        })
        .onDisconnect(() => {
          console.log('disconnected from host');
        })
        .onError((err) => {
          console.error(`MessageManager: ${err.message}`);
        });

      this.client.on<DeployPayload>('deploy/workflow', (data) => {
        this.handleDeployWorkflow(data);
      });
      this.client.on<string>('delete/workflow', (data) => {
        this.handleDeleteWorkflow(data);
      });
    });
  }

  // private static async handleTrigger(topic: string, message: Buffer) {
  //   const index1 = topic.indexOf('/');
  //   const index2 = topic.indexOf(':', index1);
  //   const [action, workflowName, triggerId] = [topic.slice(0, index1), topic.slice(index1 + 1, index2), topic.slice(index2 + 1)];

  //   if (action !== 'trigger' || !workflowName || !triggerId) {
  //     console.log(`unhandled topic ${topic}`);
  //     return;
  //   }

  //   const workflow = WorkflowManager.get(workflowName);
  //   if (!workflow) {
  //     return;
  //   }
  //   const payload = safeToJSON(message.toString('utf8'));
  //   console.info('message:', { topic, payload });
  //   const job = await workflow.trigger(triggerId, payload, { wait: true });

  //   this.client.publish(`result/${workflowName}:${triggerId}`, JSON.stringify(job.returnvalue));
  // }

  private static async handleDeployWorkflow(payload: DeployPayload) {
    const tempPath = `/tmp/wallflow/${payload.uuid}/`;
    // create temp path
    fse.mkdirpSync(tempPath);

    try {
      const contents = Buffer.from(payload.data, 'base64').toString('utf-8');

      const workflowName = getWorkflowName(contents);
      const existingWorkflow = WorkflowManager.get(workflowName);
      const tempFile = path.join(tempPath, `${payload.filename}.ts`);

      fse.writeFileSync(tempFile, contents);
      const workflow = await WorkflowManager.loadWorkflowFile(tempFile);
      workflow['filename'] = path.join(this.workflowsPath, payload.filename);
      fse.moveSync(tempFile, path.join(this.workflowsPath, payload.filename), { overwrite: true });
      console.info(`${existingWorkflow ? 'updated' : 'loaded'} workflow "${workflow.name}"`);

      if (existingWorkflow && path.basename(existingWorkflow['filename']) !== payload.filename) {
        fse.removeSync(existingWorkflow['filename']);
      }
      this.client.trigger(`result/deploy/workflow:${payload.uuid}`, { status: 'ok' });
    } catch (err: any) {
      this.client.trigger(`result/deploy/workflow:${payload.uuid}`, { status: 'error', message: err.message });
    }
    // clean up temp path
    fse.removeSync(tempPath);
  }

  private static handleDeleteWorkflow(workflowName: string) {
    try {
      const workflow = WorkflowManager.get(workflowName);
      if (!workflow) {
        throw new Error('workflow does not exist');
      }
      WorkflowManager.removeWorkflow(workflowName);
      fse.removeSync(workflow['filename']);
      console.info(`deleted workflow "${workflow.name}"`);
      this.client.trigger(`result/delete/workflow:${workflowName}`, { status: 'ok' });
    } catch (err: any) {
      this.client.trigger(`result/delete/workflow:${workflowName}`, { status: 'error', message: err.message });
    }
  }

  public static subscribe(workflowName: string, triggerId: string, callback: Callback) {
    this.client.on(`trigger/${workflowName}:${triggerId}`, callback);
  }

  public static unsubscribe(workflowName: string, triggerId: string, callback: Callback) {
    this.client.off(`trigger/${workflowName}:${triggerId}`, callback);
  }
}
