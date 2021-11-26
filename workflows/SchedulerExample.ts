import Scheduler from '@wallflow/plugins/Scheduler';

workflow
  // Scheduler example
  .register('SchedulerExample')
  .on(Scheduler({ every: 5000 }), async () => {
    console.log('PING');
  });
