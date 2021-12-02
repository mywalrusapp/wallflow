import * as mqtt from 'mqtt';
import { WallFlowClient } from './WallFlowClient';

const mockedMqtt = mqtt as jest.Mocked<typeof mqtt>;
jest.mock('mqtt');

describe('WallFlowClient', () => {
  it('creates an instance of the client', async () => {
    mockedMqtt.connect.mockImplementation((broker, opts) => ({ broker, opts, on: jest.fn() } as any));
    const client = new WallFlowClient({ host: 'broker-host', username: 'jdoe', password: 'password' });
    expect(client).toBeInstanceOf(WallFlowClient);
    expect(mockedMqtt.connect).toHaveBeenCalledWith('mqtt://broker-host', { port: 1883, username: 'jdoe', password: 'password' });
  });

  it('subscribes to a topic and receives a message', (done) => {
    mockedMqtt.connect.mockImplementation((broker, opts) => ({ broker, opts, on: jest.fn(), subscribe: jest.fn() } as any));

    const client = new WallFlowClient({ host: 'broker-host' });

    client.subscribe('action/service/trigger', (data) => {
      expect(data).toEqual({ stuff: 'some data' });
      done();
    });
    const callbacks = client['callbacks'].get('action/service/trigger');

    expect(client['client'].subscribe).toHaveBeenCalledWith('action/service/trigger');
    expect(callbacks).not.toBeNull();
    callbacks?.forEach((cb) => cb({ stuff: 'some data' }));
  });

  it('triggers a workflow trigger', async () => {
    mockedMqtt.connect.mockImplementation(
      (broker, opts) => ({ broker, opts, on: jest.fn(), subscribe: jest.fn(), publish: jest.fn() } as any),
    );
    const client = new WallFlowClient();

    client.trigger('workflow', 'triggerId', { stuff: 'some data' });
    expect(client['client'].subscribe).toHaveBeenCalledWith('result/workflow:triggerId');
    expect(client['client'].publish).toHaveBeenCalledWith('trigger/workflow:triggerId', JSON.stringify({ stuff: 'some data' }));
  });

  it('triggers a topic trigger', async () => {
    mockedMqtt.connect.mockImplementation(
      (broker, opts) => ({ broker, opts, on: jest.fn(), subscribe: jest.fn(), publish: jest.fn() } as any),
    );
    const client = new WallFlowClient();

    client.trigger('some-topic', { stuff: 'some data' });
    expect(client['client'].publish).toHaveBeenCalledWith('some-topic', JSON.stringify({ stuff: 'some data' }));
    expect(client['client'].subscribe).not.toHaveBeenCalled();
  });
});
