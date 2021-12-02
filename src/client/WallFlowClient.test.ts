import * as mqtt from 'mqtt';
import { Callback, WallFlowClient } from './WallFlowClient';

const mockedMqtt = mqtt as jest.Mocked<typeof mqtt>;
jest.mock('mqtt');

describe('WallFlowClient', () => {
  beforeEach(() => {
    mockedMqtt.connect.mockImplementation(
      (broker, opts) => ({ broker, opts, on: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn(), publish: jest.fn() } as any),
    );
  });

  it('creates an instance of the client', async () => {
    const client = new WallFlowClient({ host: 'broker-host', username: 'jdoe', password: 'password' });
    expect(client).toBeInstanceOf(WallFlowClient);
    expect(mockedMqtt.connect).toHaveBeenCalledWith('mqtt://broker-host', { port: 1883, username: 'jdoe', password: 'password' });
  });

  it('subscribes to a topic and receives a message', () => {
    const client = new WallFlowClient();
    const callback = jest.fn();

    client.on('trigger-name', callback);

    // mock callback trigger
    const callbacks = client['callbacks'].get('trigger-name');
    callbacks?.forEach((cb) => cb({ stuff: 'some data' }));

    expect(callbacks).not.toBeNull();
    expect(client['client'].subscribe).toHaveBeenCalledWith('trigger-name');
    expect(callback).toHaveBeenCalledWith({ stuff: 'some data' });
  });

  it('subscribes to a topic once and receives a message', () => {
    const client = new WallFlowClient();
    const callback = jest.fn();

    client.once('trigger-name', callback);

    // mock callback trigger
    const callbacks = client['callbacks'].get('trigger-name');
    callbacks?.forEach((cb) => cb({ stuff: 'some data' }));

    expect(callbacks).not.toBeNull();
    expect(client['callbacks'].get('trigger-name')).toBeUndefined();
    expect(client['client'].subscribe).toHaveBeenCalledWith('trigger-name');
    expect(client['client'].unsubscribe).toHaveBeenCalledWith('trigger-name');
  });

  it('emits a trigger', async () => {
    const client = new WallFlowClient();
    client.trigger('workflow:triggerId', { stuff: 'some data' });

    expect(client['client'].publish).toHaveBeenCalledWith('trigger/workflow:triggerId', JSON.stringify({ stuff: 'some data' }));
  });

  it('emits a trigger and waits for response', async () => {
    const client = new WallFlowClient();
    client['once'] = (topic: string, callback: Callback) => {
      callback({ someResponse: 'value' });
      return client;
    };

    const result = await client.trigger('workflow:triggerId', { stuff: 'some data' }, { wait: true });

    expect(client['client'].publish).toHaveBeenCalledWith('trigger/workflow:triggerId', JSON.stringify({ stuff: 'some data' }));
    expect(result).toEqual({ someResponse: 'value' });
  });
});
