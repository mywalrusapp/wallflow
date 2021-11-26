import Slack from '@wallflow/plugins/Slack';
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
  )
  .onError((job: Job, error: Error) => {
    Slack.chat.postMessage({
      channel: '@alejandro',
      mrkdwn: true,
      text: `Error processing job <http://localhost:8080/ui/queue/TestWorkflow?status=failed|#${job.id}>:\n \`\`\`Job: ${job.name}\nError: ${error.message}\`\`\``,
    });
  });
