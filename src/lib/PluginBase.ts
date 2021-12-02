import { randomUUID } from 'crypto';
import { Workflow } from './Workflow';

/**
 * The PluginBase is use as the basis for all plugins
 */
export abstract class PluginBase {
  protected async addTrigger?(workflow: Workflow, triggerId: string, options?: unknown): Promise<void>;
  protected async removeTrigger?(workflow: Workflow, triggerId: string): Promise<void>;
}

export interface Trigger {
  triggerId: string;
  addTrigger(): Promise<void>;
  removeTrigger(): Promise<void>;
}

export type InitTrigger = (workflow: Workflow) => Trigger;

type Plugin<T, O> = T & {
  (options?: O): InitTrigger;
};

const errorCallback = (message: string) => () => {
  throw new Error(message);
};

/**
 * Plugin wrapper to allow plugins to be used as triggers.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const DeclarePlugin = <T extends {}, O = unknown>(plugin: T): Plugin<T, O> => {
  const pluginTrigger = (options?: O): InitTrigger => {
    const addTrigger = (plugin as PluginBase)['addTrigger'] ?? errorCallback('Plugin does not support triggers');
    const removeTrigger = (plugin as PluginBase)['removeTrigger'] ?? errorCallback('Plugin is missing "removeTrigger()" method');

    return (workflow) => {
      const triggerId = `${plugin.constructor.name}-${workflow.name}-${randomUUID()}`;
      return {
        triggerId,
        addTrigger: () => addTrigger.call(plugin, workflow, triggerId, options),
        removeTrigger: () => removeTrigger.call(plugin, workflow, triggerId),
      };
    };
  };

  Object.setPrototypeOf(pluginTrigger, plugin);
  return pluginTrigger as Plugin<T, O>;
};
