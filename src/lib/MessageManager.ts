import mqtt, { MqttClient } from 'mqtt';
import { WorkflowManager } from './WorkflowManager';

const safeToJSON = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

interface MessageManagerOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

export abstract class MessageManager {
  private static client: MqttClient;

  public static async init({ host = 'localhost', port = 1883, username, password }: MessageManagerOptions) {
    return new Promise<void>((resolve) => {
      this.client = mqtt.connect(`mqtt://${host}`, { port, username, password });
      this.client.on('connect', resolve);
      this.client.on('error', (err) => {
        console.error(`MessageManager: ${err.message}`);
      });

      this.client.on('message', async (topic, message) => {
        const index1 = topic.indexOf('/');
        const index2 = topic.indexOf(':', index1);
        const [action, workflowName, triggerId] = [topic.slice(0, index1), topic.slice(index1 + 1, index2), topic.slice(index2 + 1)];
        if (action !== 'trigger' || !workflowName || !triggerId) {
          return;
        }
        const workflow = WorkflowManager.get(workflowName);
        if (!workflow) {
          return;
        }
        const payload = safeToJSON(message.toString('utf8'));
        console.info('message:', { topic, payload });
        const job = await workflow.trigger(triggerId, payload, { wait: true });

        if (job.returnvalue) {
          this.client.publish(`result/${workflowName}:${triggerId}`, JSON.stringify(job.returnvalue));
        }
      });
    });
  }

  public static subscribe(workflowName: string, triggerId: string) {
    this.client.subscribe(`trigger/${workflowName}:${triggerId}`);
  }
}
