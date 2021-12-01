import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker, WorkerOptions } from 'bullmq';
import { MessageManager } from './MessageManager';
import { InitTrigger, Trigger } from './PluginBase';
import { WorkflowManager } from './WorkflowManager';

export interface TriggerOptions extends JobsOptions {
  wait?: boolean;
}

export type TriggerCallback = (job: Job, data?: any) => Promise<unknown | void> | unknown | void;
export type ErrorCallback = (job: Job, error: Error) => void;

export class Workflow {
  private queue?: Queue;
  private eventQueue?: QueueEvents;
  private queueScheduler?: QueueScheduler;
  private worker?: Worker;
  private workflowName = '';
  private filename: string;
  private options: WorkerOptions;
  private triggers = new Map<string, { trigger?: Trigger; callback: TriggerCallback }>();
  private errorCallbacks: ErrorCallback[] = [];

  constructor(workflowFilename: string, options: WorkerOptions) {
    this.filename = workflowFilename;
    this.options = options;
  }

  public get name() {
    return this.workflowName;
  }

  public register(name: string) {
    const { connection, concurrency } = this.options;

    this.workflowName = name;
    this.queue = new Queue(name, { connection });
    this.eventQueue = new QueueEvents(name, { connection });
    this.queueScheduler = new QueueScheduler(name, { connection });
    this.worker = new Worker(name, this.processJob.bind(this), { connection, concurrency });

    this.worker.on('completed', (job: Job) => {
      console.info(`job ${job.id} complete`);
    });

    this.worker.on('failed', (job: Job, error: Error) => {
      console.error(`job ${job.id} failed:\n  ${error.message}`);
      for (const callback of this.errorCallbacks) {
        callback(job, error);
      }
    });

    return this;
  }

  private async processJob(job: Job) {
    const triggerData = this.triggers.get(job.name);
    if (!triggerData) {
      throw new Error(`No processor for ${job.name}`);
    }
    return await triggerData.callback(job);
  }

  public on(trigger: InitTrigger | string, callback: TriggerCallback) {
    if (!this.worker) {
      throw new Error('Workflow is not initialized. Did you forget call workflow.register()?');
    }

    if (typeof trigger === 'function') {
      const triggerData = trigger(this);
      this.triggers.set(triggerData.triggerId, { trigger: triggerData, callback });
      triggerData.addTrigger();
      MessageManager.subscribe(this.name, triggerData.triggerId);
    } else {
      this.triggers.set(trigger, { callback });
      MessageManager.subscribe(this.name, trigger);
    }
    return this;
  }

  public onError(callback: ErrorCallback) {
    this.errorCallbacks.push(callback);
  }

  public use(workflowName: string) {
    const workflow = WorkflowManager.get(workflowName);
    if (!workflow) {
      throw new Error(`workflow "${workflowName}" does not exist`);
    }
    return workflow;
  }

  public async trigger<T = unknown>(triggerId: string, data?: T, options?: TriggerOptions) {
    if (!this.queue || !this.eventQueue) {
      throw new Error('Workflow is not initialized. Did you forget call workflow.register()?');
    }
    const job = await this.queue?.add(triggerId, data, options);
    if (options?.wait) {
      job.returnvalue = await job.waitUntilFinished(this.eventQueue);
    }
    return job;
  }

  public async removeScheduledTrigger(triggerId: string) {
    if (!this.queue) {
      throw new Error('Workflow is not initialized. Did you forget call workflow.register()?');
    }
    const job = (await this.queue.getRepeatableJobs()).find((job) => job.name === triggerId);
    if (!job) {
      throw new Error(`no queued job for ${triggerId}`);
    }
    await this.queue.removeRepeatableByKey(job.key);
    console.info(`dequeued ${triggerId}`);
  }

  public async destroy() {
    for (const triggerData of this.triggers.values()) {
      await triggerData.trigger?.removeTrigger();
    }

    this.triggers.clear();
    await this.queue?.drain();
    await this.queue?.close();
    await this.eventQueue?.close();
    await this.queueScheduler?.close();
    await this.worker?.close();
  }
}
