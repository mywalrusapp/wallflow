# HttpRequest Plugin (Utility only)

This plugin provides a utility to perform HTTP requests using [axios](https://github.com/axios/axios).

### Properties

TBD

### Usage

```typescript
import HttpRequest from '@wallflow/plugins/HttpRequest';
import WebHook, { WebHookData } from '@wallflow/plugins/WebHook';

workflow
  .register('HttpRequestExample')
  // Creates a webhook /webhooks/timezone?tz=America/Los_Angeles that accepts a
  // "tz" timezone parameter and returns the timezone details using worldtimeapi.org.
  .on(WebHook({ path: 'timezone', method: 'get', wait: true }), async (job: Job<WebHookData<unknown, { tz: string }>>) => {
    const result = await HttpRequest.get(`http://worldtimeapi.org/api/timezone/${job.data.query.tz ?? 'America/New_York'}`);
    return {
      status: result.status,
      response: result.data,
    };
  });

```
