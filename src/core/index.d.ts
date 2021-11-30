declare type Job<T = unknown> = import('bullmq').Job<T>;
declare type Workflow = import('../lib/Workflow').Workflow;
declare type PluginManager = typeof import('../lib/PluginManager').PluginManager;

declare const workflow: Omit<Workflow, 'destroy' | 'removeScheduledTrigger'>;
declare const plugins: PluginManager;
declare function sleep(delay: number): Promise<void>;
