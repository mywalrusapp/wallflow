# Slack Plugin (Trigger + Utility)

This plugin provides a Slack bot trigger and a utility to perform actions in slack.
You can read more about creating a [Hello World Slack app using Bolt](https://api.slack.com/tutorials/tracks/hello-world-bolt)

**Configuration**
The configuration for using the Slack App. When using it as a utility only the `` token is required.

```bash
SLACK_BOT_PORT=
SLACK_SIGNING_SECRET=
SLACK_BOT_TOKEN=
SLACK_APP_TOKEN=
```

### Properties

| Property             | Description                                                   |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `type: "message" | "event" | "action" | "shortcut" | "command" | "view" | "options"` | Sets the type of event to add a listener for the trigger                                  |
| `message: string | RegExp`                                                           | Listen to only `message` events using a string or RegExp                                  |
| `event.type?: string | RegExp`                                                       | Listens for an event from the Events API                                                  |
| `event.subType?: string;`                                                            | Listens for an event sub type from the Events API                                         |
| `action: string | RegExp`                                                            | Listen for an action from a Block Kit element (buttons, select menus, date pickers, etc)  |
| `shortcut: string | RegExp`                                                          | Listen for a global or message shortcuts                                                  |
| `command: string | RegExp`                                                           | Listen for slash commands                                                                 |
| `callbackId: string | RegExp`                                                        | Listen for view_submission modal events                                                   |
| `action: string | RegExp`                                                            | Listen for options requests (from select menus with an external data source)              |


### Usage

```typescript
import Slack, { SlackResponse } from 'wallflow/plugins/Slack';

workflow
  .register('SlackExample')
  // Example of using a custom trigger to send messages
  .on('sendMessage', async (job) => {
    Slack.chat.postMessage({
      channel: '@johndoe',
      text: `I just go you a message\n\`\`\`${JSON.stringify(job.data)}\`\`\``,
    });
  })
  // Example of responding to a a message when the word _salad_ is spoken
  .on(Slack({ type: 'message', message: /salad/i, wait: true }), async () => ({
    text: 'Just salad nothing else?',
  }));
```
