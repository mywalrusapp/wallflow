import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { PluginBase, DeclarePlugin } from '../lib/PluginBase';

class SendGrid extends PluginBase {
  constructor() {
    super();
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SendGrid: missing SENDGRID_API_KEY');
    }
    sgMail.setApiKey(apiKey);
  }

  public async sendMail(args: MailDataRequired) {
    return await sgMail.send(args);
  }
}

export default DeclarePlugin<SendGrid>(new SendGrid());
