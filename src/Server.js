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
      this.jsonrpcHandler.setHandler(method, async function (params) {
        const Controller = require(file);
        const controller = new Controller(params);
        return await controller.run();
      });
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
    app.listen(port);
  }
}