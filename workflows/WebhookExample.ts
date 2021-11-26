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
      return {
        response: 'OK',
      };
    },
  );
