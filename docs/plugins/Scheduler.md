# Scheduler Plugin (Trigger Only)

Enables scheduled triggers either using a **cron** pattern or an **interval** to set repeat the triggering of jobs.

### Properties

| Property                | Description                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `type: "cron"           | "interval"`                                                                                               | Sets the scheduler to trigger jobs using either a **cron** a style pattern or an **interval** style pattern |
| `pattern: string`       | A cron pattern to trigger jobs.<br/> See [crontab.guru](https://crontab.guru/) for easier scheduling      |
| `tz?: string`           | The Timezone used to trigger the jobs.                                                                    |
| `startDate?: Date       | string`                                                                                                   | The start date when the trigger should start triggering jobs (works only with `cron`).                      |
| `endDate?: Date         | string`                                                                                                   | The end date when the trigger should stop triggering jobs.                                                  |
| `every: number`         | Repeat after this amount of milliseconds<br />(`cron` setting cannot be used together with this setting.) |
| `immediately?: boolean` | Repeated job should start right now<br />(work only with `every` option)                                  |
| `limit?: number`        | Max number of jobs the trigger will emit                                                                  |
| `data?: unknown`        | Data to be passed on to the job triggered by the schedule trigger                                         |

### Usage

```typescript
import Scheduler from '@wallflow/plugins/Scheduler';

workflow
  .register('SchedulerExample')
  // triggers a job that displays PING every 5 seconds
  .on(Scheduler({ type: 'interval', every: 5000 }), async () => {
    console.log('PING');
  });
```
