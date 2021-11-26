import SendGrid from '@wallflow/plugins/SendGrid';

workflow
  // Send Email example
  .register('EmailExample')
  .on('sendMail', async () => {
    await SendGrid.sendMail({
      from: { name: 'Automation', email: 'automation@mywalrusapp.com' },
      to: { name: 'Alejandro', email: 'alejandro@mywalrusapp.com' },
      subject: 'Hello there',
      html: 'Well hello there,<br /><br />This is just to inform you that you got this message!<br />Thank you,<br /><br />My Walrus App team',
    });
  });
