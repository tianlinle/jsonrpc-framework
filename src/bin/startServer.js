#!/usr/bin/env node

const { Logger, Db } = require('../index');
const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');
const { JsonRpcHandler, JsonRpcError } = require('tian-jsonrpc');
const glob = require('glob');
const Ajv = require('ajv');
const Koa = require('koa');
const route = require('koa-route');
const BodyParser = require('co-body');

dotenv.config();

(async function () {
  try {
    const { PORT, LOGGER_DB, LOGGER_COLLECTION, DB, CONTROLLERS_PATH = 'src/controllers', COLLECTIONS_PATH = 'src/collections' } = process.env;
    const cwd = process.cwd();

    //prepare db
    if (DB) {
      await Db.connect(DB);
      console.info('Connect to mongodb successfully');
      const { found } = new glob.Glob('**/*.js', {
        sync: true,
        cwd: path.resolve(cwd, COLLECTIONS_PATH),
        nodir: true,
        realpath: true
      });
      for (const file of found) {
        require(file);
      }
      await Promise.all(Db.collectionPromises);
      console.info('Init collections successfully');
    } else {
      console.info('Missing configuration item `DB`, will not auto create connection to mongodb.');
    }

    //prepare logger
    let logger = new Logger({
      name: path.basename(cwd),
      level: 'info'
    });
    if (LOGGER_DB) {
      const client = await MongoClient.connect(LOGGER_DB, { useNewUrlParser: true });
      const db = client.db();
      const collectionName = LOGGER_COLLECTION || 'Logs';
      const collection = await db.createCollection(collectionName);
      await db.command({ 'convertToCapped': collectionName, size: 1073741824 });
      logger = logger.fork({
        writer: function (json) {
          json.text = JSON.stringify(json);
          collection.insertOne(json);
        }
      });
      console.info('Use mongodb to log');
    } else {
      console.info('Use console as logger. You can use mongodb to log by configuring LOGGER_DB and LOGGER_COLLECTION(default is Logs).');
    }

    //register jsonrpc handlers
    const jsonrpcHandler = new JsonRpcHandler();
    const { found, cwdAbs } = new glob.Glob('**/*.js', {
      sync: true,
      cwd: path.resolve(cwd, CONTROLLERS_PATH),
      nodir: true,
      realpath: true
    });
    const ajv = new Ajv({ verbose: true });
    const schemaMap = {};
    for (const file of found) {
      const Controller = require(file);
      const method = path.resolve(file).replace(`${path.resolve(cwdAbs)}`, '').substr(1).replace(/Controller\.js$/, '').replace(/[\\/]/, '.');
      const paramsSchema = Controller.paramsSchema();
      schemaMap[method] = paramsSchema;
      console.info(`Register jsonrpc method: ${method}`);
      jsonrpcHandler.setMethodHandler(method, async function (jsonrpcBody) {
        const { id, params } = jsonrpcBody;
        const controllerLogger = logger.fork({ jsonrpcId: id });
        controllerLogger.info('jsonrpc request', { jsonrpcBody });
        try {
          if (paramsSchema && !ajv.validate(paramsSchema, params)) {
            throw new JsonRpcError.InvalidParams({
              errorText: ajv.errorsText(undefined, {
                dataVar: 'params'
              })
            });
          }
          const controller = new Controller(params, controllerLogger);
          const result = await controller.main();
          controllerLogger.info('jsonrpc response', { result });
          return result;
        } catch (error) {
          controllerLogger.error('jsonrpc error response', { error });
          throw error;
        }
      });
    }

    //start server
    const app = new Koa();
    app.use(route.get('/', function (ctx, next) {
      ctx.body = schemaMap;
      return next();
    }));
    app.use(route.post('/', async function (ctx, next) {
      try {
        const body = await BodyParser.json(ctx, {
          limit: '10kb'
        });
        ctx.body = await jsonrpcHandler.handle(body);
      } catch (error) {
        ctx.body = new JsonRpcError.ParseError().toJSON();
      }
      next();
    }));
    app.listen(PORT);
    console.info('Server started');
  } catch (error) {
    console.error('Error happens during starting server', error);
  }
})();