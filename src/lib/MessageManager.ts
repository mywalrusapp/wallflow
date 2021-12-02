import fse from 'fs-extra';
import mqtt, { MqttClient } from 'mqtt';
import path from 'path';
import { getWorkflowName, safeToJSON } from './utils';
import { WorkflowManager } from './WorkflowManager';

interface MessageManagerOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  workflowsPath: string;
}

export abstract class MessageManager {
  private static workflowsPath: string;
  private static client: MqttClient;

  public static async init({ host = 'localhost', port = 1883, username, password, workflowsPath }: MessageManagerOptions) {
    this.workflowsPath = workflowsPath;
    return new Promise<void>((resolve) => {
      // connect to mqtt broker
      this.client = mqtt.connect(`mqtt://${host}`, { port, username, password });
      this.client.on('connect', resolve);
      this.client.on('error', (err) => {
        console.error(`MessageManager: ${err.message}`);
      });

      this.client.on('message', (topic, message) => {
        if (topic === 'deploy/workflow') {
          this.handleDeployWorkflow(message);
          return;
        } else if (topic === 'delete/workflow') {
          this.handleDeleteWorkflow(message);
          return;
        }
        this.handleTrigger(topic, message).catch((err) => {
          console.error(`message error: ${err.message}`);
        });
      });

      this.client.subscribe('deploy/workflow');
      this.client.subscribe('delete/workflow');
    });
  }

  private static async handleTrigger(topic: string, message: Buffer) {
    const index1 = topic.indexOf('/');
    const index2 = topic.indexOf(':', index1);
    const [action, workflowName, triggerId] = [topic.slice(0, index1), topic.slice(index1 + 1, index2), topic.slice(index2 + 1)];

    if (action !== 'trigger' || !workflowName || !triggerId) {
      console.log(`unhandled topic ${topic}`);
      return;
    }

    const workflow = WorkflowManager.get(workflowName);
    if (!workflow) {
      return;
    }
    const payload = safeToJSON(message.toString('utf8'));
    console.info('message:', { topic, payload });
    const job = await workflow.trigger(triggerId, payload, { wait: true });

    this.client.publish(`result/${workflowName}:${triggerId}`, JSON.stringify(job.returnvalue));
  }

  private static async handleDeployWorkflow(message: Buffer) {
    const payload = safeToJSON(message.toString('utf8'));
    const tempPath = `/tmp/wallflow/${payload.uuid}/`;
    // create temp path
    fse.mkdirpSync(tempPath);

    try {
      const contents = Buffer.from(payload.data, 'base64').toString('utf-8');

      const workflowName = getWorkflowName(contents);
      const existingWorkflow = WorkflowManager.get(workflowName);
      const tempFile = path.join(tempPath, `${payload.filename}.ts`);

      fse.writeFileSync(tempFile, contents);
      const workflow = await WorkflowManager.loadWorkflowFile(tempFile, payload.filename);
      workflow['filename'] = path.join(this.workflowsPath, payload.filename);
      fse.moveSync(tempFile, path.join(this.workflowsPath, payload.filename), { overwrite: true });
      console.info(`${existingWorkflow ? 'updated' : 'loaded'} workflow "${workflow.name}"`);

      if (existingWorkflow && existingWorkflow['filename'] !== payload.filename) {
        fse.removeSync(existingWorkflow['filename']);
      }
      this.client.publish(`result/deploy/workflow:${payload.uuid}`, JSON.stringify({ status: 'ok' }));
    } catch (err: any) {
      this.client.publish(`result/deploy/workflow:${payload.uuid}`, JSON.stringify({ status: 'error', message: err.message }));
    }
    // clean up temp path
    fse.removeSync(tempPath);
  }

  private static handleDeleteWorkflow(message: Buffer) {
    const workflowName = message.toString('utf8');
    try {
      const workflow = WorkflowManager.get(workflowName);
      if (!workflow) {
        throw new Error('workflow does not exist');
      }
      WorkflowManager.removeWorkflow(workflowName);
      fse.removeSync(workflow['filename']);
      console.info(`deleted workflow "${workflow.name}"`);
      this.client.publish(`result/delete/workflow:${workflowName}`, JSON.stringify({ status: 'ok' }));
    } catch (err: any) {
      this.client.publish(`result/delete/workflow:${workflowName}`, JSON.stringify({ status: 'error', message: err.message }));
    }
  }

  public static subscribe(workflowName: string, triggerId: string) {
    this.client.subscribe(`trigger/${workflowName}:${triggerId}`);
  }

  public static unsubscribe(workflowName: string, triggerId: string) {
    this.client.unsubscribe(`trigger/${workflowName}:${triggerId}`);
  }
}
