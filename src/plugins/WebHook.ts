import { PluginBase, DeclarePlugin } from '../lib/PluginBase';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { Workflow } from '../lib/Workflow';

interface BearerTokenAuth {
  type: 'bearer';
  token: string;
}
interface BasicAuth {
  type: 'basic';
  realm?: string;
  username: string;
  password: string;
}

interface WebHookTriggerOptions {
  path?: string;
  method?: string;
  auth?: BearerTokenAuth | BasicAuth;
  wait?: boolean;
  response?: unknown;
}

export interface WebHookData<B = FastifyRequest['body'], Q = FastifyRequest['query'], P = FastifyRequest['params']> {
  body: B;
  path: string;
  method: string;
  headers: FastifyRequest['headers'];
  params: P;
  query: Q;
}

class WebHook extends PluginBase {
  private routes = new Map<string, { workflow: Workflow; triggerId: string; options?: WebHookTriggerOptions }>();
  private server = Fastify({
    logger: true,
  });

  constructor() {
    super();

    const basePath = process.env.WEBHOOKS_PATH ?? '/webhooks';
    const port = process.env.WEBHOOKS_PORT ?? 8081;

    this.server.all(`${basePath}/*`, this.handler.bind(this));
    this.server.listen(port, (err) => {
      if (err) {
        this.server.log.error(err);
      }
    });
  }

  private checkAuth(req: FastifyRequest, res: FastifyReply, authOptions: BearerTokenAuth | BasicAuth) {
    const authHeader = req.headers.authorization;
    const [tokenType = '', tokenValue = ''] = authHeader ? authHeader?.split(' ') : [];

    switch (authOptions.type) {
      // validate bearer token authentication if configured
      case 'bearer': {
        if (tokenType.toLowerCase() === authOptions.type && tokenValue === authOptions.token) {
          return true;
        }
        break;
      }
      // validate basic auth if configured
      case 'basic': {
        const [username, password] = Buffer.from(tokenValue, 'base64').toString().split(':');
        if (tokenType.toLowerCase() === authOptions.type && username === authOptions.username && password === authOptions.password) {
          return true;
        }

        res
          .header('WWW-Authenticate', `Basic${authOptions.realm ? ` realm="${authOptions.realm.replace(/"/g, '\\"')}"` : ''}`)
          .status(401)
          .send({ code: '401', error: `Unauthorized` });
        return false;
      }
      default:
    }

    res.status(401).send({ code: '401', error: `Unauthorized` });
    return false;
  }

  private async handler(req: FastifyRequest, res: FastifyReply) {
    const [pathname] = req.url.replace(/^\/webhooks/, '').split('?');
    const route = this.routes.get(`${req.method} ${pathname}`);
    // if the route is not found in the trigger routes, then return 404
    if (!route) {
      res.status(404).send({
        code: '404',
        error: `The requested webhook "${req.method} ${pathname}" is not registered.`,
      });
      return;
    }

    // if the trigger route has authentication configured, then validate
    const authOptions = route.options?.auth ?? null;
    if (authOptions && !this.checkAuth(req, res, authOptions)) {
      return;
    }

    // queue a job based on route trigger
    const job = route.workflow.trigger<WebHookData>(
      route.triggerId,
      {
        body: req.body,
        path: req.url,
        query: req.query,
        params: req.params,
        headers: req.headers,
        method: req.method,
      },
      { wait: route.options?.wait }
    );

    // if the route trigger has the wait flag, then wait for the job to finish
    if (route.options?.wait === true) {
      const response = (await job).returnvalue;
      res.send(route.options?.response ?? response);
      return;
    }

    res.send(
      route.options?.response ?? {
        code: '200',
        message: 'workflow job triggered',
        data: { triggerId: route.triggerId },
      }
    );
  }

  protected async addTrigger(workflow: Workflow, triggerId: string, options?: WebHookTriggerOptions) {
    const path = `/${options?.path ?? triggerId}`;
    const method = (options?.method ?? 'GET').toUpperCase();
    if (!['GET', 'PUT', 'POST', 'DELETE', 'PATCH'].includes(method)) {
      throw new Error(`WebHook error: method "${method}" not supported`);
    } else if (options?.auth && !options?.auth?.type) {
      throw new Error(`WebHook error: trigger auth not configured correctly`);
    } else if (options?.auth?.type === 'bearer' && !options.auth.token) {
      throw new Error(`WebHook error: trigger bearer token auth not configured correctly`);
    } else if (options?.auth?.type === 'basic' && (!options.auth.username || !options.auth.password)) {
      throw new Error(`WebHook error: trigger basic auth not configured correctly`);
    } else if (this.routes.has(`${method} ${path}`)) {
      throw new Error(`WebHook error: ${method} ${path} is already used`);
    }
    this.routes.set(`${method} ${path}`, { workflow, triggerId, options });
    console.info(`WebHook: Webhook ${path} added for ${workflow.name}`);
  }

  protected async removeTrigger(workflow: Workflow, triggerId: string) {
    for (const [route, trigger] of this.routes.entries()) {
      if (trigger.triggerId !== triggerId) {
        continue;
      }
      this.routes.delete(route);
      console.info(`WebHook: removed webhook ${route} for ${workflow.name}`);
    }
  }
}

export default DeclarePlugin<WebHook, WebHookTriggerOptions>(new WebHook());
