import 'wallflow/core';
import KnexMysql from 'wallflow/plugins/KnexMysql';
import Slack from 'wallflow/plugins/Slack';
import SendGrid from 'wallflow/plugins/SendGrid';

workflow
  .register('EmailExample')
  // Send Email example
  .on('sendMail', async (job) => {
    // const users = await KnexMysql.select('*').from('users');
    job.updateProgress(50);
    SendGrid.sendMail({
      from: { name: 'Automation', email: 'automation@mywalrusapp.com' },
      to: { name: 'Alejandro', email: 'alejandro@mywalrusapp.com' },
      subject: 'Hello there',
      html: 'Well hello there,<br /><br />This is just to inform you that you got this message!<br />Thank you,<br /><br />My Walrus App team',
    });

    Slack.chat.postMessage({
      channel: '@alejandro',
      text: `I just go you a message\n\`\`\`${JSON.stringify(job)}\`\`\``,
    });
    return { status: 'sent' };
  });
