import { Callback, WallFlowClient } from '../client';

interface MessageManagerOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

export abstract class MessageManager {
  private static client: WallFlowClient;

  public static async init({ host = 'localhost', port = 1883, username, password }: MessageManagerOptions) {
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
    });
  }

  public static subscribe(topic: string, callback: Callback) {
    this.client.on(topic, callback);
  }

  public static unsubscribe(topic: string, callback?: Callback) {
    this.client.off(topic, callback);
  }

  public static emit(topic: string, data: unknown) {
    this.client.trigger(topic, data);
  }

  public static stop() {
    this.client.disconnect();
  }
}
