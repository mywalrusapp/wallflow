# WebHook Plugin (Trigger Only)

Creates a webhook that can be triggered via an HTTP REST endpoint.

The webhook plugin supports authentication as well as a custom response.

**Configuration**
You can change the webhook server base path and port by setting the environment variables:

```bash
WEBHOOKS_PATH=/my-path
WEBHOOKS_PORT=8085
```

### Properties

| Property             | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path: string`       | Sets the path of the webhook trigger                                        |
| `method?: string`    | Sets the REST method of the webhook trigger. Defaults to `GET`.             |
| `auth: object`       | When set, enables authentication using the provided options.                |
| `auth.type: "bearer" | "basic"`                                                                    | Sets the type of authentication of the webhook. [Bearer](https://oauth.net/2/bearer-tokens) and [Basic auth](https://www.ibm.com/docs/en/cics-ts/5.3) |
| `token?: string`     | The token value to use when using Bearer token authentication               |
| `username?: string`  | The username to use to enable access to the endpoint.                       |
| `password?: string`  | The password to use to enable access to the endpoint.                       |
| `response?: unknown` | A static object that will be used as the response.                          |
| `wait?: boolean`     | When `true`, the request will wait for the job to finish before responding. |

### Usage

```typescript
import WebHook from '@wallflow/plugins/WebHook';

workflow
  .register('WebhookExample')
  // webhook workflow
  .on(WebHook({ path: '/test', method: 'get', wait: true }), async (data: Job<>) => {
    return {
      response: 'OK',
    };
  });
```
