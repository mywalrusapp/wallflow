import WebHook from '@wallflow/plugins/WebHook';

workflow
  // webook workflow
  .register('WebhookExample')
  .on(
    WebHook({
      path: 'test',
      method: 'get',
      wait: true,
      // response: { status: 'started' },
    }),
    async () => {
      if (Math.random() < 0.5) {
        throw new Error('Forced an error');
      }
      await workflow.use('EmailExample')?.trigger('sendEmail', { ok: true }, { delay: 1000 });
      return {
        response: 'OK',
      };
    },
  );
