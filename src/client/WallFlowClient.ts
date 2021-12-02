import mqtt, { MqttClient, OnConnectCallback, OnDisconnectCallback, OnErrorCallback } from 'mqtt';
import { safeToJSON } from '../lib/utils';

export interface WallFlowClientOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

interface TriggerOptions {
  wait?: boolean;
}

export type Callback<T = any> = (data: T) => void;

export class WallFlowClient {
  private client: MqttClient;
  private callbacks = new Map<string, Callback[]>();

  constructor({ host = 'localhost', port = 1883, username, password }: WallFlowClientOptions = {}) {
    this.client = mqtt.connect(`mqtt://${host}`, { port, username, password });

    this.client.on('message', (topic, message) => {
      const callbacks = this.callbacks.get(topic);
      if (!callbacks || callbacks.length === 0) {
        return;
      }

      const payload = safeToJSON(message.toString('utf8'));
      callbacks.forEach((callback) => {
        callback(payload);
      });
    });
  }

  public onConnect(callback: OnConnectCallback) {
    this.client.on('connect', callback);
    return this;
  }

  public onDisconnect(callback: OnDisconnectCallback) {
    this.client.on('disconnect', callback);
    return this;
  }

  public onError(callback: OnErrorCallback) {
    this.client.on('error', callback);
    return this;
  }

  public on<T = unknown>(topic: string, callback: Callback<T>) {
    if (!this.callbacks.has(topic)) {
      this.client.subscribe(topic);
    }

    const callbacksArray = this.callbacks.get(topic) ?? [];
    callbacksArray.push(callback);
    this.callbacks.set(topic, callbacksArray);
    return this;
  }

  public once<T = unknown>(topic: string, callback: Callback<T>) {
    const resultCallback = (data: T) => {
      callback(data);
      this.off(topic, resultCallback);
    };
    this.on(topic, resultCallback);
    return this;
  }

  public off(topic: string, callback: Callback) {
    const callbacksArray = this.callbacks.get(topic);
    if (!callbacksArray) {
      return this;
    }
    const removeIndex = callbacksArray.findIndex((cb) => callback === cb);
    if (callbacksArray.length > 0 && removeIndex >= 0) {
      callbacksArray.splice(removeIndex, 1);
      this.callbacks.set(topic, callbacksArray);
    }

    if (callbacksArray.length === 0) {
      this.client.unsubscribe(topic);
      this.callbacks.delete(topic);
    }
    return this;
  }

  public async trigger(topic: string, data: unknown, options?: TriggerOptions) {
    const payload = JSON.stringify(data);
    return new Promise<unknown>((resolve) => {
      if (options?.wait) {
        this.once(`result/${topic}`, resolve);
      }
      this.client.publish(`trigger/${topic}`, payload);
      if (!options?.wait) {
        resolve(undefined);
      }
    });
  }
}
