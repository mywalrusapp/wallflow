import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { Queue } from 'bullmq';
import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import FastifyMultiPart from 'fastify-multipart';
import fse from 'fs-extra';
import path from 'path';
import { getWorkflowName } from './utils';
import { WorkflowManager } from './WorkflowManager';

interface WebServerOptions {
  workflowsPath: string;
  bullBoardEnabled?: boolean;
  bullBoardPath?: string;
  port: number;
}

export class WebServer {
  private workflowsPath: string;
  private fastify: FastifyInstance;
  private bullBoard?: ReturnType<typeof createBullBoard>;

  constructor({ bullBoardEnabled = true, bullBoardPath = '/ui', workflowsPath, port = 8080 }: WebServerOptions) {
    this.fastify = fastify();
    this.fastify.register(FastifyMultiPart, {
      limits: {
        fileSize: 1000000,
        files: 1,
      },
    });
    this.workflowsPath = workflowsPath;

    if (bullBoardEnabled) {
      const serverAdapter = new FastifyAdapter();
      serverAdapter.setBasePath(bullBoardPath);

      this.fastify.register(serverAdapter.registerPlugin(), { basePath: '/', prefix: bullBoardPath });
      this.bullBoard = createBullBoard({ queues: [], serverAdapter });
    }
    this.fastify.get('/', async (req, res) => res.redirect(bullBoardPath));
    this.fastify.post('/workflow/deploy', this.handleDeployWorkflow.bind(this));
    this.fastify.delete('/workflow/:workflowName', this.handleDeleteWorkflow.bind(this));
    this.fastify.post('/workflow/:workflowName/:triggerId', this.handleWorkflowTrigger.bind(this));

    this.fastify.listen(port, '0.0.0.0', () => {
      console.info(`🎯 BullBoard running on http://0.0.0.0:${port}${bullBoardPath}`);
    });
  }

  private async handleDeployWorkflow(req: FastifyRequest, res: FastifyReply) {
    const data = await req.file();
    const uuid = data.fields.uuid;

    const tempPath = `/tmp/wallflow/${uuid}/`;
    // create temp path
    fse.mkdirpSync(tempPath);

    try {
      const contents = Buffer.from((await data.toBuffer()).toString(), 'base64').toString('utf8');
      const workflowName = getWorkflowName(contents);
      console.info(`incoming deployment for ${workflowName} ${Buffer.byteLength(contents, 'utf8')} bytes`);
      const existingWorkflow = WorkflowManager.get(workflowName);
      const tempFile = path.join(tempPath, data.filename);

      fse.writeFileSync(tempFile, contents);
      const workflow = await WorkflowManager.loadWorkflowFile(tempFile);
      workflow['filename'] = path.join(this.workflowsPath, data.filename);
      fse.moveSync(tempFile, path.join(this.workflowsPath, data.filename), { overwrite: true });
      console.info(`${existingWorkflow ? 'updated' : 'loaded'} workflow "${workflow.name}"`);

      if (existingWorkflow && path.basename(existingWorkflow['filename']) !== data.filename) {
        fse.removeSync(existingWorkflow['filename']);
      }
      res.send({ status: 'ok' });
    } catch (err: any) {
      console.error(`deployment error: ${err.message}`);
      res.status(500).send({ status: 'error', message: err.message });
    }
    // clean up temp path
    fse.removeSync(tempPath);
  }

  private handleDeleteWorkflow(req: FastifyRequest<{ Params: { workflowName: string } }>, res: FastifyReply) {
    const { workflowName } = req.params;
    try {
      const workflow = WorkflowManager.get(workflowName);
      if (!workflow) {
        res.status(404).send({ status: 'error', message: 'workflow does not exist' });
        return;
      }
      WorkflowManager.removeWorkflow(workflowName);
      fse.removeSync(workflow['filename']);
      console.info(`deleted workflow "${workflow.name}"`);
      res.send({ status: 'ok' });
    } catch (err: any) {
      res.status(500).send({ status: 'error', message: err.message });
    }
  }

  private async handleWorkflowTrigger(
    req: FastifyRequest<{ Params: { workflowName: string; triggerId: string }; Querystring: { wait: boolean } }>,
    res: FastifyReply,
  ) {
    const { workflowName, triggerId } = req.params;
    try {
      const workflow = WorkflowManager.get(workflowName);
      if (!workflow) {
        throw new Error('workflow does not exist');
      }
      console.info(`triggering "${workflow.name}" "${triggerId}"`);
      const job = await workflow.trigger(triggerId, req.body, { wait: Boolean(req.query.wait) });
      res.send({ status: 'ok', jobId: job.id, returnvalue: job.returnvalue });
    } catch (err: any) {
      res.status(500).send({ status: 'error', message: err.message });
    }
  }

  public addQueue(queue: Queue) {
    this.bullBoard?.addQueue(new BullMQAdapter(queue));
  }

  public removeQueue(queue: Queue) {
    this.bullBoard?.removeQueue(new BullMQAdapter(queue));
  }

  public stop() {
    this.fastify.close();
  }
}
