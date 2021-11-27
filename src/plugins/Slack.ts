import { App, KnownEventFromType, subtype } from '@slack/bolt';
import { DeclarePlugin, PluginBase } from '../lib/PluginBase';
import { Workflow } from '../lib/Workflow';

interface SlackBotMessage {
  type: 'message';
  /**
   * Listen to only `message` events using a string or RegExp
   */
  message: string | RegExp;
}
interface SlackBotEvent {
  type: 'event';
  /**
   * Listen for an event from the Events API
   */
  event: {
    type?: string | RegExp;
    subType?: string;
  };
}
interface SlackBotAction {
  type: 'action';
  /**
   * Listen for an action from a Block Kit element (buttons, select menus, date pickers, etc)
   */
  action: string | RegExp;
}
interface SlackBotShortcut {
  type: 'shortcut';
  /**
   * Listen for a global or message shortcuts
   */
  shortcut: string | RegExp;
}
interface SlackBotCommand {
  type: 'command';
  /**
   * Listen for slash commands
   */
  command: string | RegExp;
}
interface SlackBotViewSubmission {
  type: 'view';
  /**
   * Listen for view_submission modal events
   */
  callbackId: string | RegExp;
}
interface SlackBotOptions {
  type: 'options';
  /**
   * Listen for options requests (from select menus with an external data source)
   */
  action: string | RegExp;
}

type AllTriggerOptions = (
  | SlackBotMessage
  | SlackBotEvent
  | SlackBotAction
  | SlackBotShortcut
  | SlackBotCommand
  | SlackBotViewSubmission
  | SlackBotOptions
) & { wait?: boolean };

type SlackOptions<K = string> = Extract<AllTriggerOptions, { type: K }>;

export type SlackResponse<EventType extends string = string> = KnownEventFromType<EventType>;

class Slack extends PluginBase {
  private app: App;
  private isInitialized = false;
  private triggers = new Map<string, any>();

  constructor() {
    super();
    this.app = new App({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
    });
  }

  private async initBot() {
    this.isInitialized = true;
    const port = process.env.SLACK_BOT_PORT ? Number(process.env.SLACK_BOT_PORT) : 8082;

    await this.app.start(port);
    console.info('Slack bot mode enabled');
  }

  public get apps() {
    return this.app.client.apps;
  }
  public get auth() {
    return this.app.client.auth;
  }
  public get chat() {
    return this.app.client.chat;
  }
  public get conversations() {
    return this.app.client.conversations;
  }
  public get files() {
    return this.app.client.files;
  }
  public get reactions() {
    return this.app.client.reactions;
  }
  public get reminders() {
    return this.app.client.reminders;
  }
  public get team() {
    return this.app.client.team;
  }
  public get users() {
    return this.app.client.users;
  }
  public get usergroups() {
    return this.app.client.usergroups;
  }
  public get views() {
    return this.app.client.views;
  }

  protected async addTrigger(workflow: Workflow, triggerId: string, options: SlackOptions) {
    try {
      if (!this.isInitialized) {
        await this.initBot();
      }

      const callback = async ({ payload, ack, respond, say }: any) => {
        const job = await workflow.trigger(triggerId, payload, { wait: options.wait });

        if (ack) {
          await ack(job.returnvalue?.ack);
        }

        if (respond && job.returnvalue?.respond) {
          await respond(job.returnvalue.respond);
        } else if (say && job.returnvalue?.say) {
          await say(job.returnvalue.say);
        }
      };

      switch (options.type) {
        case 'message': {
          this.triggers.set(triggerId, callback);
          this.app.message(options.message, callback);
          return;
        }
        case 'event': {
          const eventType: any = options.event.subType ? subtype(options.event.subType) : options.event.type;
          if (!eventType) {
            throw new Error('Slack: type "event" requires an event.type or event.subType');
          }
          this.triggers.set(triggerId, callback);
          this.app.event(eventType, callback);
          return;
        }
        case 'command': {
          this.triggers.set(triggerId, callback);
          this.app.command(options.command, callback);
          return;
        }
        case 'action': {
          this.triggers.set(triggerId, callback);
          this.app.action(options.action, callback);
          return;
        }
        case 'options': {
          this.triggers.set(triggerId, callback);
          this.app.options(options.action, callback);
          return;
        }
        case 'shortcut': {
          this.triggers.set(triggerId, callback);
          this.app.shortcut(options.shortcut, callback);
          return;
        }
        case 'view': {
          this.triggers.set(triggerId, callback);
          this.app.view(options.callbackId, callback);
          return;
        }
      }
    } catch (err: any) {
      console.error(`Unable to start Slack in bot mode: ${err.message}`);
    }
  }

  protected async removeTrigger(workflow: Workflow, triggerId: string) {
    const callback = this.triggers.get(triggerId);
    this.app['listeners'] = this.app['listeners'].filter((fns: any) => fns[fns.length - 1] !== callback);
  }
}

export default DeclarePlugin<Slack, SlackOptions>(new Slack());
