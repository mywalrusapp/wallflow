import Slack, { SlackResponse } from '@wallflow/plugins/Slack';

workflow
  // Send Email example
  .register('SlackExample')
  .on('sendMessage', async (job) => {
    console.log('Ok more work');
    Slack.chat.postMessage({
      channel: '@alejandro',
      text: `I just go you a message\n\`\`\`${JSON.stringify(job.data)}\`\`\``,
    });
  })
  .on(Slack({ type: 'message', message: /salad/i, wait: true }), async () => ({
    text: 'Just salad nothing else?',
  }))
  .on(Slack({ type: 'message', message: /roll the dice/i, wait: true }), async () => ({
    text: 'Just a thought',
    blocks: [
      {
        type: 'section',
        block_id: 'section678',
        text: {
          type: 'mrkdwn',
          text: 'Pick an item from the dropdown list',
        },
        accessory: {
          action_id: 'my-option-action',
          type: 'external_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select an item',
          },
          min_query_length: 3,
        },
      },
    ],
  }))

  .on(Slack({ type: 'event', event: { type: /reaction_/ }, wait: true }), async (job: Job<SlackResponse<'reaction_added'>>) => ({
    text: `You have :${job.data.reaction}: this message`,
  }))

  .on(Slack({ type: 'command', command: '/wallflow', wait: true }), async (job: Job<any>) => {
    Slack.views.open({
      trigger_id: job.data.trigger_id,
      view: {
        title: {
          type: 'plain_text',
          text: 'Modal Title',
        },
        submit: {
          type: 'plain_text',
          text: 'Submit',
        },
        blocks: [
          {
            type: 'input',
            element: {
              type: 'plain_text_input',
              action_id: 'sl_input',
              placeholder: {
                type: 'plain_text',
                text: 'Placeholder text for single-line input',
              },
            },
            label: {
              type: 'plain_text',
              text: 'Label',
            },
            hint: {
              type: 'plain_text',
              text: 'Hint text',
            },
          },
          {
            type: 'input',
            element: {
              type: 'plain_text_input',
              action_id: 'ml_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Placeholder text for multi-line input',
              },
            },
            label: {
              type: 'plain_text',
              text: 'Label',
            },
            hint: {
              type: 'plain_text',
              text: 'Hint text',
            },
          },
        ],
        type: 'modal',
        callback_id: 'my-view-submit',
      },
    });
    // return {
    //   text: "Well you're out of luck /wallflow is just an example",
    //   blocks: [
    //     {
    //       type: 'section',
    //       text: {
    //         type: 'mrkdwn',
    //         text: 'This is a section block with a button.',
    //       },
    //       accessory: {
    //         type: 'button',
    //         text: {
    //           type: 'plain_text',
    //           text: 'Click Me',
    //           emoji: true,
    //         },
    //         value: 'click_me_123',
    //         action_id: 'my-button-action',
    //       },
    //     },
    //   ],
    // };
  })

  .on(Slack({ type: 'view', callbackId: 'my-view-submit', wait: true }), async () => {
    console.log('SUBMIT');
    return {
      ack: {
        response_action: 'update',
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: 'Modal title',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: "It's Block Kit...but _in a modal_",
              },
              block_id: 'section1',
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Click me',
                },
                action_id: 'button_abc',
                value: 'Button value',
                style: 'danger',
              },
            },
            {
              type: 'input',
              label: {
                type: 'plain_text',
                text: 'Input label',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'input1',
                placeholder: {
                  type: 'plain_text',
                  text: 'Type in here',
                },
                multiline: false,
              },
              optional: false,
            },
          ],
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          submit: {
            type: 'plain_text',
            text: 'Save',
          },
          private_metadata: 'Shhhhhhhh',
          callback_id: 'view_identifier_12',
        },
      },
    };
  })

  .on(Slack({ type: 'action', action: 'my-button-action', wait: true }), async () => ({
    text: 'You push my button?',
  }))

  .on(Slack({ type: 'options', action: 'my-option-action', wait: true }), async () => {
    console.log('OPTIONS');
    return {
      options: [
        {
          text: {
            type: 'plain_text',
            text: 'Cool',
          },
          value: 'cool',
        },
        {
          text: {
            type: 'plain_text',
            text: 'Not cool',
          },
          value: 'not-cool',
        },
      ],
    };
  })

  .on(Slack({ type: 'shortcut', shortcut: 'make-it-rain', wait: true }), async () => ({
    blocks: [
      {
        type: 'image',
        image_url:
          'https://media3.giphy.com/media/1qZ91iFRo5h1elYOAH/giphy.gif?cid=ecf05e47tpz3g79fexgsvznsfm6jbjwp3snquvuinehbd6h7&rid=giphy.gif&ct=g',
        alt_text: 'inspiration',
      },
    ],
  }));
