import { DeclarePlugin, PluginBase } from '../lib/PluginBase';
import { Workflow } from '../lib/Workflow';

interface SchedulerOptions {
  /**
   * A cron pattern
   */
  cron?: string;
  /**
   * Timezone
   */
  tz?: string;
  /**
   * Start date when the repeat job should start repeating (only with `cron`).
   */
  startDate?: Date | string | number;
  /**
   * End date when the repeat job should stop repeating.
   */
  endDate?: Date | string | number;
  /**
   * Number of times the job should repeat at max.
   */
  limit?: number;
  /**
   * Repeat after this amount of milliseconds
   * (`cron` setting cannot be used together with this setting.)
   */
  every?: number;
  /**
   * Repeated job should start right now
   * ( work only with every settings)
   */
  immediately?: boolean;

  data?: unknown;
}

class Scheduler extends PluginBase {
  protected async addTrigger(workflow: Workflow, triggerId: string, { data, ...options }: SchedulerOptions) {
    await workflow.trigger(triggerId, data, { repeat: { ...options } });
  }
  protected async removeTrigger(workflow: Workflow, triggerId: string) {
    await workflow.removeScheduledTrigger(triggerId);
  }
}

export default DeclarePlugin<Scheduler, SchedulerOptions>(new Scheduler());
