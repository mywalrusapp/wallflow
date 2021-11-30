# SendGrid Plugin (Utility only)

This plugin allows a job to send an email using [SendGrid](https://sendgrid.com/).

**Configuration**
Requires the `SENDGRID_API_KEY` environment variable to be set to enable the plugin:

### Properties

See [SendGrid Mail Send API](https://docs.sendgrid.com/api-reference/mail-send/mail-send) reference for property details.

### Usage

```typescript
import SendGrid from 'wallflow/plugins/SendGrid';

workflow
  .register('EmailExample')
  // Creates a custom trigger that when called will send an eamil
  .on('sendMail', async () => {
    await SendGrid.sendMail({
      from: { name: 'Automation service', email: 'automation@example.com' },
      to: { name: 'John Doe', email: 'jdoe@example.com' },
      subject: 'Hello there',
      html: 'Well hello there,<br /><br />This is just to inform you that you got this message!<br />Thank you,<br /><br />My Walrus App team',
    });
  });
```
