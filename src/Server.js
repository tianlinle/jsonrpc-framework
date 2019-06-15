const Jsonrpc = require('tian-jsonrpc');
const glob = require('glob');
const path = require('path');
const Koa = require('koa');
const route = require('koa-route');
const BodyParser = require('co-body');
const { JsonRpcError } = require('tian-jsonrpc');

module.exports = class Server {
  constructor() {
    this.jsonrpcHandler = new Jsonrpc.JsonRpcHandler();
  }

  registerFolder(folderPath) {
    const g = new glob.Glob('**/*.js', {
      sync: true,
      cwd: folderPath,
      nodir: true,
      realpath: true
    });
    for (const file of g.found) {
      const method = path.resolve(file).replace(`${path.resolve(g.cwdAbs)}`, '').substr(1).replace(/Controller\.js$/, '').replace(/[\\/]/, '.');
      const Controller = require(file);
      this.jsonrpcHandler.setHandler(method, async function (params) {
        const controller = new Controller(params);
        return await controller.run();
      }, Controller);
    }
    return this;
  }

  startup(path, port, options = {}) {
    const app = new Koa();
    app.use(route.post(path, async (ctx) => {
      let body;
      try {
        body = await BodyParser.json(ctx, options);
      } catch (error) {
        ctx.body = {
          jsonrpc: '2.0',
          error: JsonRpcError.parseError(),
          id: null
        };
        return;
      }
      ctx.body = await this.jsonrpcHandler.handle(body);
    }));
    app.use(route.get(path, (ctx) => {
      const methods = this.jsonrpcHandler.getMethods();
      const docs = {};
      for (const methodName of Object.keys(methods)) {
        docs[methodName] = {
          paramsSchema: methods[methodName].context.paramsSchema && methods[methodName].context.paramsSchema()
        };
      }
      ctx.body = docs;
    }));
    app.listen(port);
  }
};