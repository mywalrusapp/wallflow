import { DeclarePlugin, PluginBase } from '../lib/PluginBase';
import { Workflow } from '../lib/Workflow';

interface SchedulerCronOptions {
  type: 'cron';
  /**
   * A cron pattern to trigger jobs.
   * See https://crontab.guru/ for easier scheduling
   */
  pattern: string;
  /**
   * The Timezone used to trigger the jobs.
   */
  tz?: string;
  /**
   * The start date when the trigger should start triggering jobs (works only with `cron`).
   */
  startDate?: Date | string;
  /**
   * The end date when the trigger should stop triggering jobs.
   */
  endDate?: Date | string;
}

interface SchedulerIntervalOptions {
  type: 'interval';
  /**
   * Repeat after this amount of milliseconds
   * (`cron` setting cannot be used together with this setting.)
   */
  every: number;
  /**
   * Repeated job should start right now
   * ( work only with `every` option)
   */
  immediately?: boolean;
}

type SchedulerOptions = (SchedulerCronOptions | SchedulerIntervalOptions) & {
  /**
   * Max number of jobs the trigger will emit
   */
  limit?: number;

  /**
   * Data to be passed on to the job triggered by the schedule trigger
   */
  data?: unknown;
};

class Scheduler extends PluginBase {
  protected async addTrigger(workflow: Workflow, triggerId: string, { data, ...options }: SchedulerOptions) {
    await workflow.trigger(triggerId, data, { repeat: { ...options } });
  }
  protected async removeTrigger(workflow: Workflow, triggerId: string) {
    await workflow.removeScheduledTrigger(triggerId);
  }
}

export default DeclarePlugin<Scheduler, SchedulerOptions>(new Scheduler());
