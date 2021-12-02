import mqtt, { MqttClient } from 'mqtt';
import { safeToJSON } from '../lib/utils';

export interface WallFlowClientOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

type SubscribeCallback<T = unknown> = (data: T) => void;

export class WallFlowClient {
  private client: MqttClient;
  private callbacks = new Map<string, SubscribeCallback[]>();

  constructor({ host = 'localhost', port = 1883, username, password }: WallFlowClientOptions = {}) {
    this.client = mqtt.connect(`mqtt://${host}`, { port, username, password });

    this.client.on('message', (topic, message) => {
      const callbacks = this.callbacks.get(topic);
      if (!callbacks) {
        return;
      }

      const payload = safeToJSON(message.toString('utf8'));
      callbacks.forEach((callback) => {
        callback(payload);
      });
    });
  }

  public subscribe(topic: string, callback: SubscribeCallback) {
    if (!this.callbacks.has(topic)) {
      this.client.subscribe(topic);
    }

    const callbacksArray = this.callbacks.get(topic) ?? [];
    callbacksArray.push(callback);
    this.callbacks.set(topic, callbacksArray);
  }

  public async trigger(topic: string, data?: unknown): Promise<void>;
  public async trigger(workflow: string, triggerId: string, data?: unknown): Promise<void>;
  public async trigger(workflow: string, triggerId?: string | unknown, data?: unknown) {
    const hasDataParam = data !== undefined;
    const payload = JSON.stringify(hasDataParam ? data : triggerId);
    const triggerName = hasDataParam ? `trigger/${workflow}:${triggerId}` : workflow;
    return new Promise<unknown>((resolve) => {
      if (hasDataParam) {
        this.subscribe(`result/${workflow}:${triggerId}`, resolve);
      }
      this.client.publish(triggerName, payload);
      if (!hasDataParam) {
        resolve(null);
      }
    });
  }
}

// const sendMessage = (options: SendMessageOptions) =>
//   new Promise<any>((resolve, reject) => {
//     print(`  connecting to ${options.host}:${options.port}... `);

//     timerId = setTimeout(() => reject(new Error('error: connection timeout')), CONNECTION_TIMEOUT);
//     const client = mqtt.connect(`mqtt://${options.host}`, { port: options.port, username: options.username, password: options.password });

//     client.on('connect', () => {
//       print('ok\n');
//       print(`  sending ${options.topic}... ok\n`);
//       client.publish(options.topic, options.payload);
//       print(`  waiting for response... `);
//       clearTimeout(timerId);
//       timerId = setTimeout(() => reject(new Error('error: response timeout')), options.timeout ?? RESPONSE_TIMEOUT);
//     });

//     client.on('error', (err) => {
//       reject(new Error(`Unexpected error: ${err.message}`));
//     });

//     client.on('message', (topic, message) => {
//       print(`ok\n`);
//       clearTimeout(timerId);
//       const data = safeToJSON(message.toString('utf8'));
//       client.end();
//       resolve(data);
//     });
//     client.subscribe(options.resultTopic);
//   });
