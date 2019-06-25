#!/usr/bin/env node

const { Server, Logger, Db } = require('../index');
const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');
const { JsonRpcHandler, JsonRpcError } = require('tian-jsonrpc');
const glob = require('glob');
const Ajv = require('ajv');
const Koa = require('koa');
const route = require('koa-route');

dotenv.config();

(async function () {
  const { PORT, LOGGER_DB, LOGGER_COLLECTION, DB } = process.env;
  const cwd = process.cwd();
  if (DB) {
    await Db.init(DB);
  } else {
    console.info('Missing configuration item `DB`, will not auto create connection to mongodb.');
  }
  let logger = new Logger({
    name: path.basename(cwd),
    level: 'info'
  });
  if (LOGGER_DB) {
    const client = await MongoClient.connect(LOGGER_DB);
    const db = client.db();
    const collectionName = LOGGER_COLLECTION || 'Logs';
    const collection = await db.createCollection(collectionName);
    await db.command({ 'convertToCapped': collectionName, size: 1073741824 });
    logger = logger.fork({
      writer: function (json) {
        collection.insertOne(json);
      }
    });
  } else {
    console.info('Use console as logger. You can use mongodb to log by configuring LOGGER_DB and LOGGER_COLLECTION(default is Logs).');
  }

  //register jsonrpc handlers
  const jsonrpcHandler = new JsonRpcHandler();
  const { found, cwdAbs } = new glob.Glob('**/*.js', {
    sync: true,
    cwd,
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
    jsonrpcHandler.setMethodHandler(method, async function (jsonrpcBody) {
      const { id, params } = jsonrpcBody;
      const controllerLogger = logger.fork({ jsonrpcId: id });
      controllerLogger.info('jsonrpc request', { jsonrpcBody });
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
    });
  }

  const app = new Koa();
  app.use(route.get('/', function (ctx, next) {
    ctx.body = schemaMap;
    return next();
  }));

  app.use(route.post('/', async function (ctx, next) {
    try {

    } catch (error) {

    }
  }));


  const server = new Server(SERVER_NAME);
  server.useFolder(path.resolve(cwd, 'src', 'controllers')).listen(PORT);
})();