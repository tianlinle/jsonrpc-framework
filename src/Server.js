const { JsonRpcHandler } = require('tian-jsonrpc');
const glob = require('glob');
const path = require('path');
const Koa = require('koa');
const route = require('koa-route');
const BodyParser = require('co-body');
const { JsonRpcError } = require('tian-jsonrpc');
const Logger = require('./Logger');

module.exports = class Server {
  constructor(name) {
    this.app = new Koa();
    this.name = name;
  }

  useFolder(folderPath, apiPath = '/') {
    const jsonrpcHandler = new JsonRpcHandler();
    const g = new glob.Glob('**/*.js', {
      sync: true,
      cwd: folderPath,
      nodir: true,
      realpath: true
    });
    for (const file of g.found) {
      const method = path.resolve(file).replace(`${path.resolve(g.cwdAbs)}`, '').substr(1).replace(/Controller\.js$/, '').replace(/[\\/]/, '.');
      const Controller = require(file);
      jsonrpcHandler.setMethodHandler(method, async function (jsonrpcBody) {
        const logger = new Logger({
          name: this.name,
          jsonrpcId: jsonrpcBody.id
        });
        logger.info('jsonrpc request', jsonrpcBody);
        const controller = new Controller(jsonrpcBody.params, logger);
        const result = await controller.run();
        logger.info('jsonrpc response', result);
        return result;
      }, Controller);
    }
    this.app.use(route.get(apiPath, (ctx, next) => {
      const methods = jsonrpcHandler.methods;
      const docs = {};
      for (const methodName of Object.keys(methods)) {
        docs[methodName] = {
          paramsSchema: methods[methodName].context.paramsSchema && methods[methodName].context.paramsSchema()
        };
      }
      ctx.body = docs;
      return next();
    }));
    this.app.use(route.post(apiPath, async (ctx, next) => {
      let body;
      try {
        body = await BodyParser.json(ctx, {
          limit: '10kb'
        });
      } catch (error) {
        ctx.body = {
          jsonrpc: '2.0',
          error: JsonRpcError.parseError(),
          id: null
        };
        return;
      }
      ctx.body = await jsonrpcHandler.handle(body);
      await next();
    }));
    return this;
  }

  use(handler) {
    this.app.use(handler);
    return this;
  }

  listen(port) {
    this.app.listen(port);
    return this;
  }
};